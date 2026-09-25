package com.eraseai.firewall.safe

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ImageDecoder
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.annotation.RequiresApi
import com.eraseai.firewall.guard.LocalRiskScanner
import com.eraseai.firewall.guard.GuardLog
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Redacts images and PDFs for EraseAI Safe with on-device OCR (ML Kit, bundled model — the
 * file never leaves the phone). Sensitive words are painted over with solid boxes; the output
 * is re-encoded from pixels, which also drops EXIF (GPS, camera, timestamps).
 *
 * PDFs are rendered page by page and rebuilt as an image PDF: the original text layer is not
 * carried over, because it would still contain the redacted values.
 */
object SafeMediaRedactor {

  fun sanitize(context: Context, displayName: String, mimeType: String?, source: ByteArray): SafeSanitizer.Output? {
    if (source.size > MAX_SOURCE_BYTES) return null
    val (outMime, outExt) = SafeSanitizer.outputType(displayName, mimeType) ?: return null
    return runCatching {
      if (outMime == PDF_MIME) redactPdf(context, source) else redactImage(source, outMime, outExt)
    }.onFailure {
      GuardLog.warn("safe.media.failed", null, "${it.javaClass.simpleName}: ${it.message}")
    }.getOrNull()
  }

  private fun redactImage(source: ByteArray, outMime: String, outExt: String): SafeSanitizer.Output? {
    val bitmap = decodeImage(source) ?: return null
    val redactions = redactBitmap(bitmap) ?: return null
    val bytes = ByteArrayOutputStream().use { out ->
      val format = if (outMime == "image/png") Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
      bitmap.compress(format, JPEG_QUALITY, out)
      out.toByteArray()
    }
    bitmap.recycle()
    return SafeSanitizer.Output(bytes, outMime, outExt, redactions)
  }

  private fun redactPdf(context: Context, source: ByteArray): SafeSanitizer.Output? {
    // PdfRenderer needs a seekable descriptor.
    val temp = File.createTempFile("safe_in", ".pdf", context.cacheDir)
    try {
      temp.writeBytes(source)
      ParcelFileDescriptor.open(temp, ParcelFileDescriptor.MODE_READ_ONLY).use { fd ->
        PdfRenderer(fd).use { renderer ->
          // Refuse rather than serve a document we only partly checked.
          if (renderer.pageCount == 0 || renderer.pageCount > MAX_PDF_PAGES) return null
          val output = PdfDocument()
          var redactions = 0
          try {
            for (index in 0 until renderer.pageCount) {
              renderer.openPage(index).use { page ->
                val scale = minOf(RENDER_SCALE, MAX_PAGE_PX.toFloat() / max(page.width, page.height))
                val bitmap = Bitmap.createBitmap(
                  (page.width * scale).roundToInt().coerceAtLeast(1),
                  (page.height * scale).roundToInt().coerceAtLeast(1),
                  Bitmap.Config.ARGB_8888,
                )
                bitmap.eraseColor(Color.WHITE)
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                // The text layer is exact where OCR can misread ("@" at small sizes), so it is
                // redacted first; OCR then covers scanned content and anything drawn as images.
                val textLayer = if (Build.VERSION.SDK_INT >= 35) textLayerBoxes(page, scale) ?: return null else TextLayer.NONE
                redactions += textLayer.matches
                redactions += redactBitmap(bitmap, textLayer.boxes) ?: return null
                val info = PdfDocument.PageInfo.Builder(page.width, page.height, index + 1).create()
                val outPage = output.startPage(info)
                outPage.canvas.drawBitmap(bitmap, null, Rect(0, 0, page.width, page.height), Paint(Paint.FILTER_BITMAP_FLAG))
                output.finishPage(outPage)
                bitmap.recycle()
              }
            }
            val bytes = ByteArrayOutputStream().use { out ->
              output.writeTo(out)
              out.toByteArray()
            }
            return SafeSanitizer.Output(bytes, PDF_MIME, "pdf", redactions)
          } finally {
            output.close()
          }
        }
      }
    } finally {
      temp.delete()
    }
  }

  private class TextLayer(val boxes: List<RectF>, val matches: Int) {
    companion object {
      val NONE = TextLayer(emptyList(), 0)
    }
  }

  /**
   * Locates sensitive values through the PDF's own text layer (Android 15+). Returns null when
   * a value is present but cannot be located — the document is then refused, not served.
   */
  @RequiresApi(35)
  private fun textLayerBoxes(page: PdfRenderer.Page, scale: Float): TextLayer? {
    val contents = page.textContents
    val text = contents.joinToString("\n") { it.text }
    val ranges = LocalRiskScanner.piiRanges(text)
    if (ranges.isEmpty()) return TextLayer.NONE
    val pad = 1.5f * scale
    val boxes = mutableListOf<RectF>()
    ranges.map { text.substring(it.first, it.last + 1) }.distinct().forEach { needle ->
      var located = page.searchText(needle).flatMap { it.bounds }
      if (located.isEmpty()) {
        // Fall back to whole text runs that contain the value.
        located = contents.filter { it.text.contains(needle) }.flatMap { it.bounds }
      }
      if (located.isEmpty()) {
        GuardLog.warn("safe.pdf.unlocated", null, "len=${needle.length}")
        return null
      }
      located.forEach { r ->
        boxes.add(RectF(r.left * scale - pad, r.top * scale - pad, r.right * scale + pad, r.bottom * scale + pad))
      }
    }
    return TextLayer(boxes, ranges.size)
  }

  /**
   * Paints over sensitive words in place and returns how many values OCR found and redacted,
   * or null when the result cannot be trusted (OCR failed, or a re-read still finds something).
   * [preset] boxes (from a PDF text layer) are painted before OCR runs.
   */
  private fun redactBitmap(bitmap: Bitmap, preset: List<RectF> = emptyList()): Int? {
    val canvas = Canvas(bitmap)
    val paint = Paint().apply { color = Color.BLACK }
    preset.forEach { canvas.drawRect(it, paint) }
    val plan = OcrRedactionPlanner.plan(recognize(bitmap) ?: return null)
    if (plan.boxes.isEmpty() && preset.isEmpty()) return 0
    plan.boxes.forEach { box ->
      canvas.drawRect(box.left.toFloat(), box.top.toFloat(), box.right.toFloat(), box.bottom.toFloat(), paint)
    }
    // Only pages we changed are re-read; an untouched page would OCR identically.
    val recheck = OcrRedactionPlanner.plan(recognize(bitmap) ?: return null)
    if (recheck.redactions > 0) {
      GuardLog.warn("safe.media.residual", null, "remaining=${recheck.redactions}")
      return null
    }
    return plan.redactions
  }

  private fun recognize(bitmap: Bitmap): List<OcrRedactionPlanner.Line>? = runCatching {
    val result = Tasks.await(recognizer.process(InputImage.fromBitmap(bitmap, 0)), OCR_TIMEOUT_S, TimeUnit.SECONDS)
    result.textBlocks.flatMap { block ->
      block.lines.map { line ->
        OcrRedactionPlanner.Line(
          line.elements.mapNotNull { element ->
            val box = element.boundingBox ?: return@mapNotNull null
            OcrRedactionPlanner.Word(element.text, box.left, box.top, box.right, box.bottom)
          },
        )
      }
    }
  }.onFailure {
    GuardLog.warn("safe.ocr.failed", null, "${it.javaClass.simpleName}: ${it.message}")
  }.getOrNull()

  /** ImageDecoder applies EXIF rotation, reads HEIC/WebP, and downsamples huge photos. */
  private fun decodeImage(source: ByteArray): Bitmap? = runCatching {
    ImageDecoder.decodeBitmap(ImageDecoder.createSource(ByteBuffer.wrap(source))) { decoder, info, _ ->
      decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
      decoder.isMutableRequired = true
      val longest = max(info.size.width, info.size.height)
      if (longest > MAX_IMAGE_PX) {
        val scale = MAX_IMAGE_PX.toFloat() / longest
        decoder.setTargetSize((info.size.width * scale).roundToInt(), (info.size.height * scale).roundToInt())
      }
    }
  }.getOrNull()

  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  const val PDF_MIME = "application/pdf"
  private const val MAX_SOURCE_BYTES = 25 * 1024 * 1024
  private const val MAX_PDF_PAGES = 15
  // ~216 dpi: small print below this misreads (a 10pt "@" became a letter and the email survived).
  private const val RENDER_SCALE = 3f
  private const val MAX_PAGE_PX = 2600
  private const val MAX_IMAGE_PX = 2400
  private const val JPEG_QUALITY = 90
  private const val OCR_TIMEOUT_S = 20L
}
