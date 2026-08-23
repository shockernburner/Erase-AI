package com.eraseai.firewall.guard

import android.view.accessibility.AccessibilityNodeInfo

data class AttachmentHint(
  val label: String,
  val source: String,
  val skipReason: String? = null,
)

/**
 * Best-effort attachment detection from the accessibility tree. Native apps rarely
 * expose file bytes; we surface chip/file names so multi-piece scans can flag them.
 */
object AttachmentHints {
  private val fileSuffixes = listOf(".pdf", ".csv", ".json", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".md")
  private val unsupportedSuffixes = setOf(".pdf", ".doc", ".docx", ".xls", ".xlsx")

  fun extract(root: AccessibilityNodeInfo?): List<AttachmentHint> {
    if (root == null) return emptyList()
    val found = linkedMapOf<String, AttachmentHint>()
    collect(root, found)
    return found.values.toList()
  }

  private fun collect(node: AccessibilityNodeInfo, found: LinkedHashMap<String, AttachmentHint>) {
    val text = node.text?.toString()?.trim().orEmpty()
    val description = node.contentDescription?.toString()?.trim().orEmpty()
    listOf(text, description).forEach { candidate ->
      if (candidate.isBlank()) return@forEach
      val label = normalizeLabel(candidate) ?: return@forEach
      if (found.containsKey(label)) return@forEach
      val suffix = fileSuffixes.firstOrNull { label.endsWith(it, ignoreCase = true) }
      val skipReason = when {
        suffix != null && unsupportedSuffixes.any { label.endsWith(it, ignoreCase = true) } ->
          "Attachment type not scannable on device ($label). Review before sending."
        candidate.contains("attachment", ignoreCase = true) && suffix == null ->
          "Attachment detected ($label). Content not readable — review before sending."
        else -> null
      }
      found[label] = AttachmentHint(label = label, source = "file:$label", skipReason = skipReason)
    }

    for (index in 0 until node.childCount) {
      val child = node.getChild(index) ?: continue
      collect(child, found)
    }
  }

  private fun normalizeLabel(raw: String): String? {
    val trimmed = raw.trim()
    if (trimmed.length < 3 || trimmed.length > 120) return null
    if (fileSuffixes.any { trimmed.endsWith(it, ignoreCase = true) }) return trimmed
    if (trimmed.contains("attachment", ignoreCase = true)) return trimmed
    return null
  }
}
