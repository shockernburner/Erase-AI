package com.eraseai.firewall.guard

import android.content.Context

/**
 * Cross-service guard state shared by Accessibility and IME.
 */
object GuardStateStore {
  private const val PREFS = "eraseai_firewall_prefs"
  private const val ARMED_PKG_KEY = "egress_armed_package"
  private const val IME_WITHHELD_KEY = "ime_withheld"
  private const val IME_WITHHOLD_FAILED_KEY = "ime_withhold_failed"

  private lateinit var appContext: Context

  fun init(context: Context) {
    if (::appContext.isInitialized) return
    appContext = context.applicationContext
  }

  private fun prefs(): android.content.SharedPreferences? =
    if (::appContext.isInitialized) {
      appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    } else {
      null
    }

  fun setArmed(packageName: String?) {
    // Called on every composer evaluation and keystroke; skip the write for an unchanged value.
    if (packageName == getArmedPackage()) return
    prefs()?.edit()?.putString(ARMED_PKG_KEY, packageName)?.apply()
  }

  fun getArmedPackage(): String? = prefs()?.getString(ARMED_PKG_KEY, null)?.takeIf { it.isNotBlank() }

  fun isArmed(): Boolean = getArmedPackage() != null

  fun setImeWithheld(withheld: Boolean) {
    prefs()?.edit()?.putBoolean(IME_WITHHELD_KEY, withheld)?.apply()
    if (withheld) {
      prefs()?.edit()?.putBoolean(IME_WITHHOLD_FAILED_KEY, false)?.apply()
    }
  }

  fun isImeWithheld(): Boolean = prefs()?.getBoolean(IME_WITHHELD_KEY, false) ?: false

  fun setImeWithholdFailed(failed: Boolean) {
    prefs()?.edit()?.putBoolean(IME_WITHHOLD_FAILED_KEY, failed)?.apply()
    if (failed) {
      prefs()?.edit()?.putBoolean(IME_WITHHELD_KEY, false)?.apply()
    }
  }

  fun isImeWithholdFailed(): Boolean = prefs()?.getBoolean(IME_WITHHOLD_FAILED_KEY, false) ?: false

  fun clearImeState() {
    prefs()?.edit()
      ?.putBoolean(IME_WITHHELD_KEY, false)
      ?.putBoolean(IME_WITHHOLD_FAILED_KEY, false)
      ?.apply()
  }
}
