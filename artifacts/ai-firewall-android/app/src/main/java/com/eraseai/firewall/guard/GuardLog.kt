package com.eraseai.firewall.guard

import android.graphics.Rect
import android.util.Log
import com.eraseai.firewall.BuildConfig

/**
 * Single logcat tag for the whole send-gate pipeline so a device session can be traced with
 * `adb logcat -s EraseAIGuard`. Prompt text is never logged — only lengths and risk metadata.
 */
object GuardLog {
  const val TAG = "EraseAIGuard"

  private val enabled: Boolean get() = BuildConfig.DEBUG

  fun event(event: String, pkg: String?, detail: String = "") {
    if (!enabled) return
    Log.d(TAG, buildString {
      append(event)
      append(" pkg=").append(pkg ?: "-")
      if (detail.isNotBlank()) append(' ').append(detail)
    })
  }

  fun window(pkg: String?, windowId: Int, windowCount: Int, found: Boolean) {
    event(
      "composer.locate",
      pkg,
      "found=$found windowId=$windowId windows=$windowCount",
    )
  }

  fun composer(pkg: String?, textLength: Int, bounds: Rect, source: String) {
    event(
      "composer.text",
      pkg,
      "len=$textLength row=${bounds.toShortString()} via=$source",
    )
  }

  fun curtain(action: String, pkg: String?, reason: String, bounds: Rect? = null) {
    event(
      "curtain.$action",
      pkg,
      "reason=$reason" + (bounds?.let { " bounds=${it.toShortString()}" } ?: ""),
    )
  }

  fun risk(pkg: String?, level: String, score: Int, findings: Int, held: Boolean) {
    event(
      "risk.scan",
      pkg,
      "level=$level score=$score findings=$findings held=$held",
    )
  }

  fun gate(action: String, pkg: String?, detail: String = "") {
    event("gate.$action", pkg, detail)
  }

  fun ime(action: String, detail: String = "") {
    event("ime.$action", null, detail)
  }

  fun warn(event: String, pkg: String?, detail: String) {
    if (!enabled) return
    Log.w(TAG, "$event pkg=${pkg ?: "-"} $detail")
  }
}
