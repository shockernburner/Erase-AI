package com.eraseai.firewall.guard

import android.content.Context
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.drawable.GradientDrawable
import android.os.SystemClock
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
  private var lastDisplayWidth = 0
  private var lastDisplayHeight = 0
  /** When true the band is pinned to the physical bottom — keyboard hide must not shrink it. */
  private var guardActive = false
  /** Last band placed above an open keyboard, kept so a keyboard transition can cover it. */
  private var lastRaisedBand = Rect()
  /** Until this uptime the band spans the whole path send can travel; see [beginTransition]. */
  private var transitionUntil = 0L
  /** Where send was last seen with the keyboard closed, and with it open. */
  private var lastClosedSend = Rect()
  private var lastRaisedSend = Rect()
  /** Second, small overlay parked where send will land if the keyboard changes state. */
  private var anchorView: View? = null
  private var anchorParams: WindowManager.LayoutParams? = null
  private var anchorBounds = Rect()

  val isShowing: Boolean get() = view != null

  /** The area the main band covers now; empty when not showing. */
  fun currentArea(): Rect = Rect(currentBounds)

  /**
   * The keyboard is about to appear or leave. While it animates, the host moves send between
   * its bottom position and its above-keyboard position, and the accessibility tree reports the
   * new row only after the move: measured on an emulator, send sat uncovered for 0.5-1.3 s after
   * Cancel. For a short window the band therefore covers everything from the last above-keyboard
   * row to the screen bottom, so send is under it wherever it is mid-move. Typing is blocked for
   * at most that window.
   */
  fun beginTransition() {
    transitionUntil = SystemClock.uptimeMillis() + TRANSITION_COVER_MS
  }

  /** Drops the sticky band so the next show() measures against the new screen. */
  fun resetForDisplayChange() {
    if (guardActive) return
    coveredBounds.setEmpty()
    lastDisplayWidth = 0
    lastDisplayHeight = 0
  }

  /**
   * Widen to the newest measurement, then clamp back to a band around the submit row.
   *
   * Unioning alone was unbounded: every reflow that reported a taller row ratcheted the
   * curtain upward until it covered the keyboard and the user could not type at all. The
   * clamp keeps the reason the union exists — absorbing the shrink that follows emptying
   * the composer — without letting the covered area climb the screen.
   */
  private fun mergeBounds(latest: Rect): Rect {
    if (guardActive) {
      coveredBounds.set(pinSubmitBand(latest))
      return coveredBounds
    }
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

  /** Keeps the submit band on the composer row when the keyboard is open. */
  private fun pinSubmitBand(seed: Rect): Rect {
    val dm = context.resources.displayMetrics
    val minHeight = (48 * dm.density).toInt()
    return ComposerGeometry.clampSubmitOverlay(seed, dm.widthPixels, dm.heightPixels, minHeight)
  }

  /** Mounts the curtain, or repositions it in place if already mounted. */
  fun show(
    bounds: Rect,
    level: String,
    packageName: String,
    zoneMode: String = "resolved",
    guardActive: Boolean = false,
    sendBounds: Rect? = null,
    onTap: () -> Unit,
  ) {
    if (guardActive) this.guardActive = true
    val dm = context.resources.displayMetrics
    if (CurtainGeometry.displayChanged(lastDisplayWidth, lastDisplayHeight, dm.widthPixels, dm.heightPixels)) {
      if (!this.guardActive) coveredBounds.setEmpty()
    }
    lastDisplayWidth = dm.widthPixels
    lastDisplayHeight = dm.heightPixels
    val merged = mergeBounds(bounds)
    val measured = inflateBounds(if (this.guardActive) pinSubmitBand(merged) else merged)
    val target = CurtainGeometry.transitionSpan(
      measured = measured,
      lastRaisedBand = lastRaisedBand,
      screenWidth = dm.widthPixels,
      screenHeight = dm.heightPixels,
      inTransition = SystemClock.uptimeMillis() < transitionUntil,
    )
    val keyboardOpen = ComposerGeometry.keyboardLikelyOpen(dm.heightPixels, measured.bottom)
    if (target == measured) {
      if (keyboardOpen) lastRaisedBand = Rect(measured)
      if (sendBounds != null && !sendBounds.isEmpty) {
        if (keyboardOpen) lastRaisedSend = Rect(sendBounds) else lastClosedSend = Rect(sendBounds)
      }
    }
    if (this.guardActive) {
      placeAnchor(
        CurtainGeometry.anchorBox(
          keyboardOpen = keyboardOpen,
          send = sendBounds,
          lastClosedSend = lastClosedSend,
          lastRaisedSend = lastRaisedSend,
          band = target,
          screenWidth = dm.widthPixels,
          screenHeight = dm.heightPixels,
          padPx = (ANCHOR_PAD_DP * dm.density).toInt(),
        ),
        level,
        packageName,
        onTap,
      )
    }
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
      GuardLog.curtain("show", packageName, "level=$level mode=$zoneMode", target)
    }.onFailure {
      GuardLog.warn("curtain.show.failed", packageName, "error=${it.message}")
    }
  }

  /**
   * Keeps a small touch-consuming box over send's position in the other keyboard state.
   *
   * When the keyboard opens or closes, the host moves send at once, but re-measuring it means
   * querying the host app, and those queries stall while the host animates: on an emulator a
   * single lookup took 554 ms, and send sat uncovered at its new position for about a second.
   * A box already parked there needs no reaction at all. It covers only send's own footprint,
   * so on an open keyboard it sits over the Enter key, never over the letters or backspace.
   */
  private fun placeAnchor(box: Rect?, level: String, packageName: String, onTap: () -> Unit) {
    val existing = anchorView
    if (box == null || box.isEmpty) {
      if (existing != null) removeAnchor()
      return
    }
    if (existing != null) {
      if (box != anchorBounds) {
        anchorBounds = Rect(box)
        anchorParams?.let { lp ->
          lp.x = box.left
          lp.y = box.top
          lp.width = box.width()
          lp.height = box.height()
          runCatching { windowManager.updateViewLayout(existing, lp) }
        }
        GuardLog.curtain("anchor.move", packageName, "level=$level", box)
      }
      return
    }
    val anchor = View(context).apply {
      background = backgroundFor(level)
      contentDescription = "EraseAI is holding this prompt. Tap to review before sending."
      isClickable = true
      setOnClickListener { onTap() }
    }
    val lp = WindowManager.LayoutParams(
      box.width(),
      box.height(),
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = box.left
      y = box.top
    }
    runCatching { windowManager.addView(anchor, lp) }
      .onSuccess {
        anchorView = anchor
        anchorParams = lp
        anchorBounds = Rect(box)
        GuardLog.curtain("anchor.show", packageName, "level=$level", box)
      }
      .onFailure { GuardLog.warn("curtain.anchor.failed", packageName, "error=${it.message}") }
  }

  private fun removeAnchor() {
    anchorView?.let { runCatching { windowManager.removeView(it) } }
    anchorView = null
    anchorParams = null
    anchorBounds = Rect()
  }

  fun hide(packageName: String?, reason: String) {
    removeAnchor()
    val existing = view ?: return
    runCatching { windowManager.removeView(existing) }
    view = null
    params = null
    label = null
    currentBounds = Rect()
    coveredBounds = Rect()
    guardActive = false
    transitionUntil = 0L
    GuardLog.curtain("hide", packageName, reason)
  }

  private fun applyLevel(level: String) {
    label?.let { it.text = labelFor(level) }
    (view as? LinearLayout)?.background = backgroundFor(level)
    anchorView?.background = backgroundFor(level)
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
    if (bounds.isEmpty || bounds.width() < 48 * density) {
      return ComposerGeometry.geometrySubmitZone(dm.widthPixels, dm.heightPixels, Rect())
    }
    return ComposerGeometry.clampSubmitOverlay(bounds, dm.widthPixels, dm.heightPixels, minHeight)
  }

  private companion object {
    /** Widest the covered band may grow relative to the latest measured submit row. */
    const val MAX_BAND_GROWTH = 2

    /** How long a keyboard transition keeps the full send path covered. */
    const val TRANSITION_COVER_MS = 1_200L

    /** Margin around send's footprint for the anchor box. */
    const val ANCHOR_PAD_DP = 8
  }
}

internal object CurtainGeometry {
  /**
   * Where send will be if the keyboard changes state, padded, or null when unknown or already
   * under [band].
   *
   * Keyboard open: send's last keyboard-closed position, or, before that has been seen, its
   * current footprint dropped to the screen bottom with room for the composer row and the
   * navigation bar. Keyboard closed: send's last above-keyboard position; there is no estimate,
   * because how far a keyboard lifts the composer depends on the keyboard.
   */
  fun anchorBox(
    keyboardOpen: Boolean,
    send: Rect?,
    lastClosedSend: Rect,
    lastRaisedSend: Rect,
    band: Rect,
    screenWidth: Int,
    screenHeight: Int,
    padPx: Int,
  ): Rect? {
    val predicted = if (keyboardOpen) {
      when {
        !lastClosedSend.isEmpty -> Rect(lastClosedSend)
        send != null && !send.isEmpty -> {
          val drop = send.height() * 2 + (screenHeight * NAV_BAR_ALLOWANCE).toInt()
          Rect(send.left, screenHeight - drop, send.right, screenHeight)
        }
        else -> return null
      }
    } else {
      if (lastRaisedSend.isEmpty) return null
      Rect(lastRaisedSend)
    }
    predicted.inset(-padPx, -padPx)
    predicted.left = predicted.left.coerceAtLeast(0)
    predicted.top = predicted.top.coerceAtLeast(0)
    predicted.right = predicted.right.coerceAtMost(screenWidth)
    predicted.bottom = predicted.bottom.coerceAtMost(screenHeight)
    if (predicted.isEmpty || band.contains(predicted)) return null
    return predicted
  }

  /** Room left for a gesture or 3-button navigation bar below the composer. */
  private const val NAV_BAR_ALLOWANCE = 0.04f

  /**
   * During a keyboard transition, the band from the higher of the measured band and the last
   * above-keyboard band down to the screen bottom; otherwise the measured band unchanged.
   */
  fun transitionSpan(
    measured: Rect,
    lastRaisedBand: Rect,
    screenWidth: Int,
    screenHeight: Int,
    inTransition: Boolean,
  ): Rect {
    if (!inTransition) return measured
    val top = if (lastRaisedBand.isEmpty) measured.top else minOf(measured.top, lastRaisedBand.top)
    return Rect(0, top.coerceAtLeast(0), screenWidth, screenHeight)
  }

  fun displayChanged(prevW: Int, prevH: Int, w: Int, h: Int): Boolean =
    (prevW != 0 || prevH != 0) && (prevW != w || prevH != h)
}
