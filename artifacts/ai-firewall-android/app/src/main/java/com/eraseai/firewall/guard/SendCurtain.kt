package com.eraseai.firewall.guard

import android.content.Context
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Touch-consuming overlay across the composer action row.
 *
 * This is the only mechanism that can genuinely stop a send from outside the host app:
 * accessibility click events are delivered *after* the app already submitted, so the tap has
 * to land on our window instead of theirs. The curtain therefore covers the whole action row
 * (send + mic + attach) rather than a single icon whose bounds we can rarely resolve.
 */
class SendCurtain(private val context: Context) {

  private val windowManager: WindowManager
    get() = context.getSystemService(WindowManager::class.java)

  private var view: View? = null
  private var params: WindowManager.LayoutParams? = null
  private var currentBounds = Rect()
  private var label: TextView? = null
  /**
   * Widest area covered during this gating session. Holding the text empties the composer,
   * which shrinks the reported row above the send button — the curtain must not follow it
   * and expose the control it is there to block.
   */
  private var coveredBounds = Rect()

  val isShowing: Boolean get() = view != null

  /**
   * Widen to the newest measurement, then clamp back to a band around the submit row.
   *
   * Unioning alone was unbounded: every reflow that reported a taller row ratcheted the
   * curtain upward until it covered the keyboard and the user could not type at all. The
   * clamp keeps the reason the union exists — absorbing the shrink that follows emptying
   * the composer — without letting the covered area climb the screen.
   */
  private fun mergeBounds(latest: Rect): Rect {
    if (coveredBounds.isEmpty) {
      coveredBounds.set(latest)
      return coveredBounds
    }
    val merged = Rect(coveredBounds)
    merged.union(latest)
    val maxHeight = latest.height() * MAX_BAND_GROWTH
    if (merged.height() > maxHeight) merged.top = merged.bottom - maxHeight
    coveredBounds.set(merged)
    return coveredBounds
  }

  /** Mounts the curtain, or repositions it in place if already mounted. */
  fun show(bounds: Rect, level: String, packageName: String, onTap: () -> Unit) {
    val target = inflateBounds(mergeBounds(bounds))
    val existing = view
    if (existing != null) {
      applyLevel(level)
      if (target != currentBounds) {
        currentBounds = target
        params?.let { lp ->
          lp.x = target.left
          lp.y = target.top
          lp.width = target.width()
          lp.height = target.height()
          // Reposition in place: a teardown/remount cycle is what made the old shield blink
          // away every time the composer resized.
          runCatching { windowManager.updateViewLayout(existing, lp) }
          GuardLog.curtain("move", packageName, "reflow", target)
        }
      }
      return
    }

    val container = buildView(level, onTap)
    val lp = WindowManager.LayoutParams(
      target.width(),
      target.height(),
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      // Deliberately touchable: omitting FLAG_NOT_TOUCHABLE is what consumes the send tap.
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = target.left
      y = target.top
    }

    runCatching {
      windowManager.addView(container, lp)
      view = container
      params = lp
      currentBounds = target
      GuardLog.curtain("show", packageName, "level=$level", target)
    }.onFailure {
      GuardLog.warn("curtain.show.failed", packageName, "error=${it.message}")
    }
  }

  fun hide(packageName: String?, reason: String) {
    val existing = view ?: return
    runCatching { windowManager.removeView(existing) }
    view = null
    params = null
    label = null
    currentBounds = Rect()
    coveredBounds = Rect()
    GuardLog.curtain("hide", packageName, reason)
  }

  private fun applyLevel(level: String) {
    label?.let { it.text = labelFor(level) }
    (view as? LinearLayout)?.background = backgroundFor(level)
  }

  private fun buildView(level: String, onTap: () -> Unit): View {
    val density = context.resources.displayMetrics.density
    val text = TextView(context).apply {
      text = labelFor(level)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
      setTextColor(0xFFF8FAFC.toInt())
      gravity = Gravity.CENTER
    }
    label = text
    return LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      background = backgroundFor(level)
      setPadding(
        (14 * density).toInt(),
        (10 * density).toInt(),
        (14 * density).toInt(),
        (10 * density).toInt(),
      )
      contentDescription = "EraseAI is holding this prompt. Tap to review before sending."
      isClickable = true
      addView(text)
      setOnClickListener { onTap() }
    }
  }

  private fun backgroundFor(level: String): GradientDrawable {
    val density = context.resources.displayMetrics.density
    return GradientDrawable().apply {
      cornerRadius = 26 * density
      setColor(if (level == "high") 0xF2B91C1C.toInt() else 0xF2B45309.toInt())
      setStroke((1 * density).toInt(), 0x66F8FAFC)
    }
  }

  private fun labelFor(level: String): String = if (level == "high") {
    "EraseAI blocked send · tap to review"
  } else {
    "EraseAI found sensitive data · tap to review"
  }

  /** Guarantees a tappable strip even when the row bounds come back degenerate. */
  private fun inflateBounds(bounds: Rect): Rect {
    val dm = context.resources.displayMetrics
    val density = dm.density
    val minHeight = (48 * density).toInt()
    val rect = Rect(bounds)

    if (rect.isEmpty || rect.width() < 48 * density) {
      rect.set(
        (12 * density).toInt(),
        dm.heightPixels - (112 * density).toInt(),
        dm.widthPixels - (12 * density).toInt(),
        dm.heightPixels - (48 * density).toInt(),
      )
    }
    if (rect.height() < minHeight) {
      val pad = (minHeight - rect.height()) / 2
      rect.top -= pad
      rect.bottom += pad
    }
    rect.left = rect.left.coerceAtLeast(0)
    rect.top = rect.top.coerceAtLeast(0)
    rect.right = rect.right.coerceAtMost(dm.widthPixels)
    rect.bottom = rect.bottom.coerceAtMost(dm.heightPixels)
    return rect
  }

  private companion object {
    /** Widest the covered band may grow relative to the latest measured submit row. */
    const val MAX_BAND_GROWTH = 2
  }
}
