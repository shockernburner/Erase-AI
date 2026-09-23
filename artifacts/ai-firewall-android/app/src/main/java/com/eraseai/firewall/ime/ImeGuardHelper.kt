package com.eraseai.firewall.ime

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.view.inputmethod.InputMethodManager

object ImeGuardHelper {

  private fun ourImeId(context: Context): String =
    ComponentName(context, EraseAiKeyboardService::class.java).flattenToShortString()

  /**
   * True when EraseAI Keyboard is enabled in system keyboard settings.
   * Uses [InputMethodManager] — reading [Settings.Secure.ENABLED_INPUT_METHODS] directly
   * throws on targetSdk 34+.
   */
  fun isEraseAiKeyboardEnabled(context: Context): Boolean {
    val imm = context.getSystemService(InputMethodManager::class.java) ?: return false
    val ourId = ourImeId(context)
    return runCatching {
      imm.enabledInputMethodList.any { it.id == ourId }
    }.getOrDefault(false)
  }

  /**
   * True when EraseAI Keyboard is the device default or currently active IME.
   */
  fun isEraseAiKeyboardSelected(context: Context): Boolean {
    val ourId = ourImeId(context)
    if (isCurrentIme(context, ourId)) return true
    return readDefaultImeId(context) == ourId
  }

  private fun isCurrentIme(context: Context, ourId: String): Boolean {
    val imm = context.getSystemService(InputMethodManager::class.java) ?: return false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return runCatching { imm.currentInputMethodInfo?.id == ourId }.getOrDefault(false)
    }
    return false
  }

  private fun readDefaultImeId(context: Context): String? =
    runCatching {
      Settings.Secure.getString(context.contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
    }.getOrNull()

  fun openKeyboardSettings(context: Context) {
    context.startActivity(
      Intent(Settings.ACTION_INPUT_METHOD_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
  }

  fun showKeyboardPicker(context: Context) {
    val imm = context.getSystemService(InputMethodManager::class.java) ?: return
    imm.showInputMethodPicker()
  }
}
