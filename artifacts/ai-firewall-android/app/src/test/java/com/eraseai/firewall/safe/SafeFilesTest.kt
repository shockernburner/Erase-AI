package com.eraseai.firewall.safe

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SafeFilesTest {

  @Test
  fun `safe names carry the marker the gate looks for`() {
    val name = SafeMarker.safeDisplayName("customer_notes.txt", "txt")
    assertEquals("customer_notes (EraseAI Safe).txt", name)
    assertTrue(SafeMarker.isMarked(name))
    assertFalse(SafeMarker.isMarked("customer_notes.txt"))
    // Re-sharing a Safe copy must not stack markers.
    assertEquals(name, SafeMarker.safeDisplayName(name, "txt"))
  }

  @Test
  fun `a marked label only counts when EraseAI served that name`() {
    val served = listOf("customer_notes (EraseAI Safe).txt")
    assertTrue(SafeServedRegistry.matches(served, "customer_notes (EraseAI Safe).txt"))
    assertFalse(SafeServedRegistry.matches(served, "payroll (EraseAI Safe).txt"))
    // Hosts ellipsize long chip labels.
    assertTrue(SafeServedRegistry.matches(served, "customer_notes (EraseAI…"))
    // Upload status around the name still matches; a different Safe-looking name does not.
    assertTrue(SafeServedRegistry.matches(served, "Uploading customer_notes (EraseAI Safe).txt"))
    assertFalse(SafeServedRegistry.matches(served, "Uploading payroll (EraseAI Safe).txt"))
  }

  @Test
  fun `text files are redacted and the copy passes a rescan`() {
    val source = "Contact jane.doe@example.com\nkey AKIAIOSFODNN7EXAMPLE\ncard 4111 1111 1111 1111\n"
    val out = SafeSanitizer.sanitize("notes.txt", "text/plain", source.toByteArray())
    assertNotNull(out)
    val text = out!!.bytes.toString(Charsets.UTF_8)
    assertFalse(text.contains("jane.doe@example.com"))
    assertFalse(text.contains("AKIA"))
    assertFalse(text.contains("4111"))
    assertEquals(3, out.redactions)
  }

  @Test
  fun `unsupported and binary files are never served`() {
    assertFalse(SafeSanitizer.supports("clip.mp4", "video/mp4"))
    assertFalse(SafeSanitizer.supports("archive.zip", "application/zip"))
    assertNull(SafeSanitizer.sanitize("data.txt", "text/plain", byteArrayOf(0x50, 0x00, 0x4B)))
  }

  @Test
  fun `docx is flattened to redacted text`() {
    val bytes = java.io.ByteArrayOutputStream().also { raw ->
      java.util.zip.ZipOutputStream(raw).use { zip ->
        zip.putNextEntry(java.util.zip.ZipEntry("word/document.xml"))
        zip.write(
          "<w:document><w:body><w:p><w:r><w:t>Mail bob@example.com &amp; call</w:t></w:r></w:p></w:body></w:document>"
            .toByteArray(),
        )
        zip.closeEntry()
      }
    }.toByteArray()
    val out = SafeSanitizer.sanitize("brief.docx", null, bytes)
    assertNotNull(out)
    assertEquals("txt", out!!.extension)
    assertTrue(out.bytes.toString(Charsets.UTF_8).startsWith("Mail [EMAIL ADDRESS] & call"))
  }

  @Test
  fun `pdfs and images are routed to ocr with sensible output types`() {
    assertTrue(SafeSanitizer.needsOcr("scan.pdf", "application/pdf"))
    assertTrue(SafeSanitizer.needsOcr("IMG_1234.HEIC", null))
    assertEquals("application/pdf" to "pdf", SafeSanitizer.outputType("scan.pdf", null))
    assertEquals("image/png" to "png", SafeSanitizer.outputType("screenshot.png", null))
    assertEquals("image/jpeg" to "jpg", SafeSanitizer.outputType("photo.heic", null))
    assertFalse(SafeSanitizer.needsOcr("notes.txt", "text/plain"))
  }
}
