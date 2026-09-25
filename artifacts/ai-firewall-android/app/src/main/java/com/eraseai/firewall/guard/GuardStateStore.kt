package com.eraseai.firewall.guard

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Cross-service guard state shared by Accessibility, IME, and optional egress VPN.
 */
object GuardStateStore {
  private const val PREFS = "eraseai_firewall_prefs"
  private const val STRICT_EGRESS_KEY = "strict_egress_enabled"
  private const val ARMED_PKG_KEY = "egress_armed_package"
  private const val EGRESS_WINDOW_UNTIL_KEY = "egress_window_until_ms"
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

  fun isStrictEgressEnabled(): Boolean = prefs()?.getBoolean(STRICT_EGRESS_KEY, false) ?: false

  fun setStrictEgressEnabled(enabled: Boolean) {
    prefs()?.edit()?.putBoolean(STRICT_EGRESS_KEY, enabled)?.apply()
    if (!enabled) {
      setArmed(null)
      EgressGateService.stop(appContext)
    } else {
      syncEgressService()
    }
  }

  fun setArmed(packageName: String?) {
    // Called on every composer evaluation and keystroke; re-committing and re-syncing the VPN
    // for an unchanged value was a synchronous disk write plus a service call per character.
    if (packageName == getArmedPackage()) return
    val edit = prefs()?.edit() ?: return
    edit.putString(ARMED_PKG_KEY, packageName)
    if (packageName == null) {
      edit.putLong(EGRESS_WINDOW_UNTIL_KEY, 0L)
    }
    edit.commit()
    syncEgressService()
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

  /** Brief window where approved sends may reach the network (Strict mode). */
  fun grantEgressWindow(durationMs: Long = DEFAULT_EGRESS_WINDOW_MS) {
    val until = System.currentTimeMillis() + durationMs
    prefs()?.edit()?.putLong(EGRESS_WINDOW_UNTIL_KEY, until)?.apply()
    GuardLog.event("egress.window", getArmedPackage(), "until=$until ms=$durationMs")
    EgressGateService.stop(appContext)
  }

  fun isEgressBlocked(): Boolean {
    if (!isStrictEgressEnabled()) return false
    if (!isArmed()) return false
    val until = prefs()?.getLong(EGRESS_WINDOW_UNTIL_KEY, 0L) ?: 0L
    if (System.currentTimeMillis() < until) return false
    return true
  }

  /** Reconcile VPN service with persisted strict/armed state (e.g. after notification grant). */
  fun refreshEgressGate() {
    syncEgressService()
  }

  private fun syncEgressService() {
    if (!::appContext.isInitialized) return
    if (isEgressBlocked()) {
      // Only one VPN can run. Starting ours would either fail on consent or, if we still hold
      // it, tear down the user's work/privacy VPN mid-session — neither is ours to decide here.
      if (GuardHealth.otherVpnActive(appContext)) {
        GuardLog.warn("egress.skipped", getArmedPackage(), "reason=other-vpn-active")
        return
      }
      val intent = Intent(appContext, EgressGateService::class.java)
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ContextCompat.startForegroundService(appContext, intent)
        } else {
          appContext.startService(intent)
        }
        GuardLog.event(
          "egress.arm",
          getArmedPackage(),
          "strict=${isStrictEgressEnabled()} armed=${isArmed()}",
        )
      } catch (err: Exception) {
        GuardLog.warn(
          "egress.start.failed",
          getArmedPackage(),
          "${err.javaClass.simpleName}: ${err.message ?: "unknown"}",
        )
      }
    } else {
      EgressGateService.stop(appContext)
      GuardLog.event(
        "egress.disarm",
        getArmedPackage(),
        "strict=${isStrictEgressEnabled()} armed=${isArmed()}",
      )
    }
  }

  const val DEFAULT_EGRESS_WINDOW_MS = 15_000L
}
