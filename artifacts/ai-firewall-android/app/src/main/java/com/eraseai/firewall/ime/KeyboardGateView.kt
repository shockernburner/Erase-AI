package com.eraseai.firewall.ime

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.eraseai.firewall.guard.LocalRiskScanner

/**
 * The EraseAI Keyboard's decision bar. Reports scan state and offers release/discard/sanitize.
 */
@SuppressLint("ViewConstructor")
class KeyboardGateView(
  context: Context,
  private val onRelease: () -> Unit,
  private val onDiscard: () -> Unit,
  private val onSanitize: () -> Unit,
) : LinearLayout(context) {

  private val density = context.resources.displayMetrics.density
  private val statusLabel = TextView(context)
  private val detailLabel = TextView(context)
  private val actions = LinearLayout(context)

  init {
    orientation = VERTICAL
    setBackgroundColor(0xFF0B1220.toInt())
    setPadding(pad(16), pad(12), pad(16), pad(14))

    statusLabel.apply {
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
      letterSpacing = 0.08f
      setTextColor(0xFF38BDF8.toInt())
    }
    detailLabel.apply {
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
      setTextColor(0xFFF8FAFC.toInt())
      setPadding(0, pad(6), 0, 0)
    }
    actions.apply {
      orientation = HORIZONTAL
      gravity = Gravity.START
      setPadding(0, pad(10), 0, 0)
    }

    addView(statusLabel)
    addView(detailLabel)
    addView(actions)
  }

  fun showIdle(protectionActive: Boolean) {
    statusLabel.setTextColor(0xFF38BDF8.toInt())
    statusLabel.text = if (protectionActive) "ERASEAI KEYBOARD · ACTIVE" else "ERASEAI KEYBOARD · OFF"
    detailLabel.text = if (protectionActive) {
      "Watching. Risky text will be held when detected."
    } else {
      "This app is not protected. Enable it in EraseAI to gate prompts here."
    }
    actions.removeAllViews()
  }

  fun showWithheld(scan: LocalRiskScanner.LocalScan) {
    statusLabel.setTextColor(0xFFEF4444.toInt())
    statusLabel.text = "ERASEAI KEYBOARD · HELD"
    detailLabel.text = "EraseAI removed ${describe(scan)} from the app. It was never sent."
    actions.removeAllViews()
    actions.addView(button("Discard", filled = true, onDiscard))
    actions.addView(button("Sanitize", filled = false, onSanitize))
    actions.addView(button("Insert anyway", filled = false, onRelease))
  }

  private fun describe(scan: LocalRiskScanner.LocalScan): String =
    scan.findings.take(2).joinToString { it.label }.ifBlank { "sensitive data" }

  private fun button(label: String, filled: Boolean, onClick: () -> Unit): Button =
    Button(context).apply {
      text = label
      isAllCaps = false
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
      setTextColor(if (filled) 0xFF0B1220.toInt() else 0xFFF8FAFC.toInt())
      background = GradientDrawable().apply {
        cornerRadius = 12 * density
        setColor(if (filled) 0xFF38BDF8.toInt() else 0xFF1E293B.toInt())
        if (!filled) setStroke(pad(1), 0xFF475569.toInt())
      }
      setPadding(pad(14), pad(10), pad(14), pad(10))
      layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f).apply {
        marginEnd = pad(8)
      }
      setOnClickListener { onClick() }
    }

  private fun pad(dp: Int): Int = (dp * density).toInt()
}
