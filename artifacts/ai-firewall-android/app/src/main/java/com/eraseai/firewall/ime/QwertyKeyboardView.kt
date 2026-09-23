package com.eraseai.firewall.ime

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.LinearLayout

/**
 * Layered tap keyboard for protected AI apps. Characters are committed through the IME service.
 */
@SuppressLint("ViewConstructor")
class QwertyKeyboardView(
  context: Context,
  private val onCharacter: (String) -> Unit,
  private val onBackspace: () -> Unit,
  private val onSpace: () -> Unit,
  private val onSend: () -> Unit,
) : LinearLayout(context) {

  private enum class Layout { ALPHA, NUMBERS, SYMBOLS }

  private val density = context.resources.displayMetrics.density
  private val rowsContainer = LinearLayout(context).apply {
    orientation = VERTICAL
  }
  private var currentLayout = Layout.ALPHA
  private var shiftActive = false
  private var shiftLocked = false
  private var sendLabel = "Enter"
  private var editorAction = EditorInfo.IME_ACTION_UNSPECIFIED

  init {
    orientation = VERTICAL
    setBackgroundColor(0xFF0F172A.toInt())
    setPadding(pad(4), pad(4), pad(4), pad(6))
    addView(rowsContainer)
    renderLayout()
  }

  fun updateEditorInfo(info: EditorInfo?) {
    editorAction = info?.imeOptions?.and(EditorInfo.IME_MASK_ACTION)
      ?: EditorInfo.IME_ACTION_UNSPECIFIED
    sendLabel = when (editorAction) {
      EditorInfo.IME_ACTION_SEND -> "Send"
      EditorInfo.IME_ACTION_SEARCH -> "Search"
      EditorInfo.IME_ACTION_GO -> "Go"
      EditorInfo.IME_ACTION_DONE -> "Done"
      EditorInfo.IME_ACTION_NEXT -> "Next"
      else -> "Enter"
    }
    renderLayout()
  }

  private fun renderLayout() {
    rowsContainer.removeAllViews()
    when (currentLayout) {
      Layout.ALPHA -> renderAlphaLayout()
      Layout.NUMBERS -> renderNumbersLayout()
      Layout.SYMBOLS -> renderSymbolsLayout()
    }
    rowsContainer.addView(bottomRow())
  }

  private fun renderAlphaLayout() {
    ALPHA_ROWS.forEach { row ->
      rowsContainer.addView(rowLayout(row))
    }
  }

  private fun renderNumbersLayout() {
    rowsContainer.addView(rowLayout(NUMBER_ROW.map { KeySpec(it, KeyKind.CHAR) }))
    rowsContainer.addView(rowLayout(NUMBER_ROW_2.map { KeySpec(it, KeyKind.CHAR) }))
    rowsContainer.addView(rowLayout(NUMBER_ROW_3.map { KeySpec(it, KeyKind.CHAR) }))
  }

  private fun renderSymbolsLayout() {
    rowsContainer.addView(rowLayout(SYMBOL_ROW_1.map { KeySpec(it, KeyKind.CHAR) }))
    rowsContainer.addView(rowLayout(SYMBOL_ROW_2.map { KeySpec(it, KeyKind.CHAR) }))
    rowsContainer.addView(rowLayout(SYMBOL_ROW_3.map { KeySpec(it, KeyKind.CHAR) }))
  }

  private fun bottomRow(): LinearLayout =
    LinearLayout(context).apply {
      orientation = HORIZONTAL
      gravity = Gravity.CENTER
      val modeLabel = when (currentLayout) {
        Layout.ALPHA -> "123"
        Layout.NUMBERS -> "#+="
        Layout.SYMBOLS -> "ABC"
      }
      addView(
        keyButton(
          label = modeLabel,
          weight = 1.1f,
          accent = currentLayout != Layout.ALPHA,
          onClick = { toggleLayout() },
        ),
      )
      addView(keyButton(",", weight = 0.7f, onClick = { onCharacter(",") }))
      addView(keyButton("Space", weight = 3f, onClick = onSpace))
      addView(keyButton(".", weight = 0.7f, onClick = { onCharacter(".") }))
      addView(
        keyButton(
          label = sendLabel,
          weight = 1.3f,
          accent = true,
          onClick = onSend,
        ),
      )
    }

  private fun toggleLayout() {
    currentLayout = when (currentLayout) {
      Layout.ALPHA -> Layout.NUMBERS
      Layout.NUMBERS -> Layout.SYMBOLS
      Layout.SYMBOLS -> Layout.ALPHA
    }
    renderLayout()
  }

  private fun rowLayout(keys: List<KeySpec>): LinearLayout =
    LinearLayout(context).apply {
      orientation = HORIZONTAL
      gravity = Gravity.CENTER
      keys.forEach { spec ->
        addView(keyFor(spec))
      }
    }

  private fun keyFor(spec: KeySpec): Button =
    when (spec.kind) {
      KeyKind.CHAR -> {
        val output = formatChar(spec.label)
        keyButton(
          label = output,
          weight = spec.weight,
          onClick = {
            onCharacter(output)
            if (shiftActive && !shiftLocked) {
              shiftActive = false
              renderLayout()
            }
          },
        )
      }
      KeyKind.SHIFT -> keyButton(
        label = if (shiftLocked) "⇪" else "⇧",
        weight = spec.weight,
        accent = shiftActive || shiftLocked,
        onClick = { toggleShift() },
      )
      KeyKind.BACKSPACE -> keyButton(
        label = "⌫",
        weight = spec.weight,
        onClick = onBackspace,
      )
    }

  private fun formatChar(label: String): String {
    if (label.length != 1 || !label[0].isLetter()) return label
    return if (shiftActive || shiftLocked) label.uppercase() else label.lowercase()
  }

  private fun toggleShift() {
    if (shiftActive && !shiftLocked) {
      shiftLocked = true
    } else if (shiftLocked) {
      shiftLocked = false
      shiftActive = false
    } else {
      shiftActive = true
    }
    renderLayout()
  }

  private fun keyButton(
    label: String,
    weight: Float,
    accent: Boolean = false,
    onClick: () -> Unit,
  ): Button =
    Button(context).apply {
      text = when (label) {
        "Space" -> "space"
        else -> label
      }
      isAllCaps = false
      setTextSize(TypedValue.COMPLEX_UNIT_SP, if (label.length > 1 && label != "⌫") 13f else 16f)
      setTextColor(if (accent) 0xFF0B1220.toInt() else 0xFFF8FAFC.toInt())
      background = GradientDrawable().apply {
        cornerRadius = 8 * density
        setColor(
          when {
            accent -> 0xFF38BDF8.toInt()
            label == "Space" -> 0xFF1E293B.toInt()
            else -> 0xFF334155.toInt()
          },
        )
      }
      setPadding(pad(2), pad(10), pad(2), pad(10))
      layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, weight).apply {
        marginStart = pad(2)
        marginEnd = pad(2)
        topMargin = pad(3)
        bottomMargin = pad(3)
      }
      setOnClickListener { onClick() }
    }

  private fun pad(dp: Int): Int = (dp * density).toInt()

  private enum class KeyKind { CHAR, SHIFT, BACKSPACE }

  private data class KeySpec(
    val label: String,
    val kind: KeyKind,
    val weight: Float = 1f,
  )

  private companion object {
    val ALPHA_ROWS = listOf(
      listOf(
        KeySpec("q", KeyKind.CHAR),
        KeySpec("w", KeyKind.CHAR),
        KeySpec("e", KeyKind.CHAR),
        KeySpec("r", KeyKind.CHAR),
        KeySpec("t", KeyKind.CHAR),
        KeySpec("y", KeyKind.CHAR),
        KeySpec("u", KeyKind.CHAR),
        KeySpec("i", KeyKind.CHAR),
        KeySpec("o", KeyKind.CHAR),
        KeySpec("p", KeyKind.CHAR),
      ),
      listOf(
        KeySpec("⇧", KeyKind.SHIFT, weight = 1.2f),
        KeySpec("a", KeyKind.CHAR),
        KeySpec("s", KeyKind.CHAR),
        KeySpec("d", KeyKind.CHAR),
        KeySpec("f", KeyKind.CHAR),
        KeySpec("g", KeyKind.CHAR),
        KeySpec("h", KeyKind.CHAR),
        KeySpec("j", KeyKind.CHAR),
        KeySpec("k", KeyKind.CHAR),
        KeySpec("l", KeyKind.CHAR),
        KeySpec("⌫", KeyKind.BACKSPACE, weight = 1.2f),
      ),
      listOf(
        KeySpec("z", KeyKind.CHAR),
        KeySpec("x", KeyKind.CHAR),
        KeySpec("c", KeyKind.CHAR),
        KeySpec("v", KeyKind.CHAR),
        KeySpec("b", KeyKind.CHAR),
        KeySpec("n", KeyKind.CHAR),
        KeySpec("m", KeyKind.CHAR),
        KeySpec(",", KeyKind.CHAR, weight = 0.8f),
        KeySpec(".", KeyKind.CHAR, weight = 0.8f),
        KeySpec("?", KeyKind.CHAR, weight = 0.8f),
      ),
    )

    val NUMBER_ROW = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0")
    val NUMBER_ROW_2 = listOf("@", "#", "$", "%", "&", "*", "-", "+", "=", "/")
    val NUMBER_ROW_3 = listOf("_", "\\", "|", "~", "<", ">", "€", "£", "¥", "•")

    val SYMBOL_ROW_1 = listOf("!", "\"", "'", "(", ")", ":", ";", "[", "]", "{")
    val SYMBOL_ROW_2 = listOf("}", "^", "`", "°", "§", "±", "×", "÷", "•", "…")
    val SYMBOL_ROW_3 = listOf("¿", "¡", "«", "»", "¢", "©", "®", "™", "°", "·")
  }
}
