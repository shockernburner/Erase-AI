package com.eraseai.firewall.safe

import android.content.Context

/**
 * Names served by EraseAI Safe carry a visible marker, which is also what the send gate reads
 * on the AI app's attachment chip. The marker alone is spoofable by renaming a file, so the
 * gate additionally requires that EraseAI actually served that name recently on this device.
 */
object SafeMarker {
  const val TAG = "EraseAI Safe"

  private val markerPattern = Regex("\\(\\s*EraseAI[ _-]?Safe\\s*\\)", RegexOption.IGNORE_CASE)

  /** `customer_notes.txt` → `customer_notes (EraseAI Safe).txt`. */
  fun safeDisplayName(originalName: String, outputExtension: String): String {
    val base = originalName.substringBeforeLast('.', originalName).ifBlank { "file" }
    val cleanBase = markerPattern.replace(base, "").trim()
    return "$cleanBase ($TAG).$outputExtension"
  }

  fun isMarked(label: String): Boolean = markerPattern.containsMatchIn(label)
}

/** Recently served Safe names, persisted so a process restart between pick and send is fine. */
object SafeServedRegistry {
  private const val PREFS = "eraseai_safe_served"
  private const val TTL_MS = 24 * 60 * 60 * 1000L
  private const val MAX_ENTRIES = 100

  fun record(context: Context, displayName: String, now: Long = System.currentTimeMillis()) {
    val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val edit = prefs.edit()
    prefs.all.forEach { (key, value) ->
      if (value !is Long || now - value > TTL_MS) edit.remove(key)
    }
    edit.putLong(displayName, now)
    edit.apply()
    if (prefs.all.size > MAX_ENTRIES) {
      prefs.all.entries.sortedBy { it.value as? Long ?: 0L }
        .take(prefs.all.size - MAX_ENTRIES)
        .forEach { prefs.edit().remove(it.key).apply() }
    }
  }

  fun wasServed(context: Context, chipLabel: String, now: Long = System.currentTimeMillis()): Boolean {
    val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val served = prefs.all.filter { (_, value) -> value is Long && now - value <= TTL_MS }.keys
    return matches(served, chipLabel)
  }

  /**
   * Hosts decorate chip labels while uploading ("Uploading …", sizes, status) and ellipsize long
   * ones, so a label matches when it contains a served name, or when it ends in "…" and its
   * prefix starts a served name. Exact-name-only matching held a Safe file behind the curtain
   * for as long as Claude's upload took.
   */
  internal fun matches(served: Collection<String>, chipLabel: String): Boolean {
    val label = chipLabel.trim()
    if (served.any { label.contains(it, ignoreCase = true) }) return true
    val ellipsis = label.indexOfAny(charArrayOf('…'))
    if (ellipsis > 8) {
      val prefix = label.substring(0, ellipsis)
      return served.any { it.startsWith(prefix, ignoreCase = true) }
    }
    return false
  }
}
