package com.eraseai.firewall.guard

import android.view.accessibility.AccessibilityNodeInfo

data class AttachmentHint(
  val label: String,
  val source: String,
  val skipReason: String? = null,
)

/**
 * Best-effort attachment detection from the accessibility tree.
 *
 * Native LLM apps do not expose file bytes to Accessibility. Any detected
 * attachment is treated as unscanned so the send gate requires Cancel or an
 * explicit Send Anyway — never safe auto-send or "Sanitize & Send".
 */
object AttachmentHints {
  private val fileSuffixes = listOf(
    ".pdf", ".csv", ".json", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".md",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip",
  )

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
      found[label] = AttachmentHint(
        label = label,
        source = "file:$label",
        skipReason = "Attachment \"$label\" cannot be scanned inside the AI app. " +
          "Remove it, or Cancel / Send Anyway after reviewing the risk yourself.",
      )
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
