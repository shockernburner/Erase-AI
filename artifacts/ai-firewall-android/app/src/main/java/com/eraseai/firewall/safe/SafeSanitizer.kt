package com.eraseai.firewall.safe

import com.eraseai.firewall.guard.LocalRiskScanner
import java.io.ByteArrayInputStream
import java.util.zip.ZipInputStream

/**
 * Turns a source file into the redacted copy EraseAI Safe hands to AI apps.
 *
 * Text-like formats are redacted in place; DOCX is flattened to plain text first (the AI reads
 * the words, not the layout). Images and PDFs need OCR and go through [SafeMediaRedactor];
 * anything else is hidden from the Safe listing rather than served unredacted.
 */
object SafeSanitizer {

  data class Output(
    val bytes: ByteArray,
    val mimeType: String,
    val extension: String,
    val redactions: Int,
  )

  fun supports(displayName: String, mimeType: String?): Boolean =
    kindOf(displayName, mimeType) != Kind.UNSUPPORTED

  /** Output MIME/extension without doing the work — for directory listings. */
  fun outputType(displayName: String, mimeType: String?): Pair<String, String>? = when (kindOf(displayName, mimeType)) {
    Kind.TEXT -> (mimeType?.takeIf { it.startsWith("text/") || it in TEXT_MIMES } ?: "text/plain") to extensionOf(displayName).ifBlank { "txt" }
    Kind.DOCX -> "text/plain" to "txt"
    // Lossless sources stay PNG so screenshots keep crisp text; photos become JPEG.
    Kind.IMAGE -> if (extensionOf(displayName) in LOSSLESS_IMAGE_EXTENSIONS || mimeType in LOSSLESS_IMAGE_MIMES) {
      "image/png" to "png"
    } else {
      "image/jpeg" to "jpg"
    }
    Kind.PDF -> "application/pdf" to "pdf"
    Kind.UNSUPPORTED -> null
  }

  /** Images and PDFs need Android's decoders and OCR, so they bypass [sanitize]. */
  fun needsOcr(displayName: String, mimeType: String?): Boolean =
    kindOf(displayName, mimeType).let { it == Kind.IMAGE || it == Kind.PDF }

  fun sanitize(displayName: String, mimeType: String?, source: ByteArray): Output? {
    if (source.size > MAX_SOURCE_BYTES) return null
    val (outMime, outExt) = outputType(displayName, mimeType) ?: return null
    val text = when (kindOf(displayName, mimeType)) {
      Kind.TEXT -> decodeText(source) ?: return null
      Kind.DOCX -> docxText(source) ?: return null
      Kind.IMAGE, Kind.PDF, Kind.UNSUPPORTED -> return null
    }
    val redactions = LocalRiskScanner.redactionCount(text)
    val redacted = LocalRiskScanner.redact(text)
    // Never hand out a copy that still trips the scanner.
    if (LocalRiskScanner.scan(redacted).findings.any { it.type == "PII" }) return null
    return Output(redacted.toByteArray(Charsets.UTF_8), outMime, outExt, redactions)
  }

  private enum class Kind { TEXT, DOCX, IMAGE, PDF, UNSUPPORTED }

  private fun kindOf(displayName: String, mimeType: String?): Kind {
    val ext = extensionOf(displayName)
    return when {
      ext == "docx" || mimeType == DOCX_MIME -> Kind.DOCX
      ext == "pdf" || mimeType == "application/pdf" -> Kind.PDF
      ext in IMAGE_EXTENSIONS || (mimeType != null && mimeType in IMAGE_MIMES) -> Kind.IMAGE
      ext in TEXT_EXTENSIONS -> Kind.TEXT
      mimeType != null && (mimeType.startsWith("text/") || mimeType in TEXT_MIMES) -> Kind.TEXT
      else -> Kind.UNSUPPORTED
    }
  }

  private fun extensionOf(name: String): String =
    name.substringAfterLast('.', "").lowercase().takeIf { it.length in 1..5 }.orEmpty()

  /** Rejects binary content that merely carries a text-looking name. */
  private fun decodeText(bytes: ByteArray): String? {
    if (bytes.any { it == 0.toByte() }) return null
    return bytes.toString(Charsets.UTF_8)
  }

  private fun docxText(bytes: ByteArray): String? = runCatching {
    ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
      generateSequence { zip.nextEntry }.forEach { entry ->
        if (entry.name == "word/document.xml") {
          val xml = zip.readBytes().toString(Charsets.UTF_8)
          return@runCatching xml
            .replace(Regex("</w:p>"), "\n")
            .replace(Regex("<w:tab/>"), "\t")
            .replace(Regex("<[^>]+>"), "")
            .replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"")
            .replace("&apos;", "'").replace("&amp;", "&")
            .trim()
        }
      }
      null
    }
  }.getOrNull()

  private val IMAGE_EXTENSIONS = setOf("png", "jpg", "jpeg", "webp", "heic", "heif", "bmp")
  private val IMAGE_MIMES = setOf("image/png", "image/jpeg", "image/webp", "image/heic", "image/heif", "image/bmp")
  private val LOSSLESS_IMAGE_EXTENSIONS = setOf("png", "webp", "bmp")
  private val LOSSLESS_IMAGE_MIMES = setOf("image/png", "image/webp", "image/bmp")
  private const val DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  private const val MAX_SOURCE_BYTES = 5 * 1024 * 1024
  private val TEXT_MIMES = setOf("application/json", "application/xml", "application/x-yaml", "application/yaml")
  private val TEXT_EXTENSIONS = setOf(
    "txt", "md", "csv", "tsv", "json", "xml", "yaml", "yml", "log", "env", "ini", "conf", "cfg",
    "properties", "sql", "py", "js", "ts", "kt", "java", "go", "rb", "sh", "html", "htm",
  )
}
