package com.eraseai.firewall.guard

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.Process
import android.os.SystemClock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Live health of the two guards whose Settings switches can say "on" while nothing runs.
 *
 * The Accessibility setting only records that the user enabled the service. After an app
 * update or a slow cold start Android can leave it enabled but unbound ("crashed"), delivering
 * no events at all — the dashboard kept saying "Protection active" while every send went
 * through. The same process hosts the service, so an in-memory heartbeat is the ground truth.
 *
 * Android allows one VPN at a time. Another VPN connecting silently takes ownership from the
 * Strict gate, and enabling Strict while another VPN is up disconnects that one.
 */
object GuardHealth {

  enum class AccessibilityStatus {
    /** Not enabled in system settings. */
    OFF,
    /** Enabled, and this process was started moments ago — the bind is probably in flight. */
    STARTING,
    /** Enabled in settings but not bound: no events arrive, nothing is protected. */
    STALLED,
    ACTIVE,
  }

  enum class EgressStatus {
    OFF,
    READY,
    /** Another app's VPN is connected; the gate cannot come up while it is. */
    OTHER_VPN,
    /** EraseAI no longer holds VPN consent — another VPN app took it, or it was revoked. */
    PERMISSION_LOST,
  }

  private val running = MutableStateFlow(false)
  val accessibilityRunning: StateFlow<Boolean> = running.asStateFlow()

  @Volatile
  var lastEventAtMs: Long = 0L
    private set

  fun onServiceConnected() {
    running.value = true
    GuardLog.event("a11y.connected", null)
  }

  fun onServiceStopped() {
    running.value = false
    GuardLog.event("a11y.stopped", null)
  }

  fun onEvent() {
    lastEventAtMs = System.currentTimeMillis()
  }

  fun accessibilityStatus(enabledInSettings: Boolean): AccessibilityStatus =
    resolveAccessibility(
      enabledInSettings = enabledInSettings,
      running = running.value,
      processAgeMs = SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime(),
    )

  internal fun resolveAccessibility(
    enabledInSettings: Boolean,
    running: Boolean,
    processAgeMs: Long,
  ): AccessibilityStatus = when {
    !enabledInSettings -> AccessibilityStatus.OFF
    running -> AccessibilityStatus.ACTIVE
    processAgeMs < BIND_GRACE_MS -> AccessibilityStatus.STARTING
    else -> AccessibilityStatus.STALLED
  }

  fun egressStatus(context: Context): EgressStatus = resolveEgress(
    strictEnabled = GuardStateStore.isStrictEgressEnabled(),
    tunnelRunning = EgressGateService.isRunning,
    otherVpnActive = otherVpnActive(context),
    consentMissing = runCatching { VpnService.prepare(context) != null }.getOrDefault(false),
  )

  internal fun resolveEgress(
    strictEnabled: Boolean,
    tunnelRunning: Boolean,
    otherVpnActive: Boolean,
    consentMissing: Boolean,
  ): EgressStatus = when {
    !strictEnabled -> EgressStatus.OFF
    tunnelRunning -> EgressStatus.READY
    otherVpnActive -> EgressStatus.OTHER_VPN
    consentMissing -> EgressStatus.PERMISSION_LOST
    else -> EgressStatus.READY
  }

  /** True when a VPN network exists that is not EraseAI's own tunnel. */
  fun otherVpnActive(context: Context): Boolean {
    if (EgressGateService.isRunning) return false
    val cm = context.getSystemService(ConnectivityManager::class.java) ?: return false
    return runCatching {
      @Suppress("DEPRECATION")
      cm.allNetworks.any { network ->
        cm.getNetworkCapabilities(network)?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true
      }
    }.getOrDefault(false)
  }

  /** Long enough for a cold debug build on a slow device to finish binding. */
  private const val BIND_GRACE_MS = 20_000L
}
