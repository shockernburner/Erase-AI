package com.eraseai.firewall.guard

import android.view.accessibility.AccessibilityNodeInfo
import com.eraseai.firewall.safe.SafeMarker

data class AttachmentHint(
  val label: String,
  val source: String,
  val skipReason: String? = null,
  /** A redacted copy EraseAI Safe served on this device — already clean, nothing to gate. */
  val safe: Boolean = false,
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
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".zip",
  )

  private val mediaKeywords = listOf(
    "attachment", "attached", "photo", "image", "picture", "screenshot",
    "uploaded", "gallery", "file added", "1 image", "2 images", "media",
  )

  /**
   * Composer buttons that *offer* to add media ("Add photos & files", "Open gallery") are not
   * attachments. Without this, every Gemini and ChatGPT composer looks like it has an unscanned
   * file and the gate wrongly downgrades to "Sanitize Prompt".
   */
  private val affordanceVerbs = listOf(
    "add", "attach", "upload", "choose", "select", "open", "take", "browse",
    "insert", "capture", "record", "camera", "create", "new ",
  )

  /**
   * Container descriptors that exist even when nothing is attached. Gemini always exposes a
   * "List of attachments" node, which otherwise makes every prompt look like it carries a file.
   */
  private val containerPhrases = listOf(
    "list of", "attachments list", "attachment list", "carousel", "container",
    "region", "no attachments", "gallery view", "grid",
  )

  /**
   * [isServedSafe] confirms a marked chip label against the names EraseAI Safe actually
   * served; the marker alone is just text anyone could put in a file name.
   */
  /**
   * [draft] is the composer's own editable: its text is the prompt, not an attachment, and a
   * prompt like "describe this image" otherwise read as an unscanned file.
   */
  fun extract(
    root: AccessibilityNodeInfo?,
    draft: AccessibilityNodeInfo? = null,
    isServedSafe: (String) -> Boolean = { false },
  ): List<AttachmentHint> {
    if (root == null) return emptyList()
    val found = linkedMapOf<String, AttachmentHint>()
    collect(root, draft, found, isServedSafe)
    return found.values.toList()
  }

  private fun collect(
    node: AccessibilityNodeInfo,
    draft: AccessibilityNodeInfo?,
    found: LinkedHashMap<String, AttachmentHint>,
    isServedSafe: (String) -> Boolean,
  ) {
    if (draft != null && node == draft) return
    val text = node.text?.toString()?.trim().orEmpty()
    val description = node.contentDescription?.toString()?.trim().orEmpty()
    val clickable = node.isClickable
    listOf(text, description).forEach { candidate ->
      if (candidate.isBlank()) return@forEach
      val label = normalizeLabel(candidate, clickable) ?: return@forEach
      if (found.containsKey(label)) return@forEach
      if (SafeMarker.isMarked(label)) {
        found[label] = if (isServedSafe(label)) {
          AttachmentHint(label = label, source = "safe:$label", safe = true)
        } else {
          AttachmentHint(
            label = label,
            source = "file:$label",
            skipReason = "\"$label\" is named like an EraseAI Safe file but was not issued by " +
              "EraseAI on this device, so it is treated as unscanned.",
          )
        }
        return@forEach
      }
      found[label] = AttachmentHint(
        label = label,
        source = "file:$label",
        skipReason = "Attachment \"$label\" cannot be scanned inside the AI app. " +
          "Attach it from EraseAI Safe instead, or Cancel / Send Anyway after reviewing it.",
      )
    }

    for (index in 0 until node.childCount) {
      val child = node.getChild(index) ?: continue
      collect(child, draft, found, isServedSafe)
    }
  }

  private fun normalizeLabel(raw: String, clickable: Boolean): String? {
    val trimmed = raw.trim()
    if (trimmed.length < 3 || trimmed.length > 120) return null
    if (trimmed.equals("Ask Gemini", ignoreCase = true) || trimmed.startsWith("Ask Gem", ignoreCase = true)) {
      return null
    }
    // A real filename is trustworthy even on a clickable chip.
    if (fileSuffixes.any { trimmed.endsWith(it, ignoreCase = true) }) return trimmed
    if (isAffordance(trimmed, clickable)) return null
    if (mediaKeywords.any { trimmed.contains(it, ignoreCase = true) }) return trimmed
    return null
  }

  private fun isAffordance(label: String, clickable: Boolean): Boolean {
    val lower = label.lowercase()
    if (affordanceVerbs.any { lower.startsWith(it) }) return true
    if (containerPhrases.any { lower.contains(it) }) return true
    // Bare media words on a tappable control are composer chrome, not a pending file.
    return clickable && lower.split(' ').size <= 3
  }
}
