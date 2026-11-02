package com.eraseai.firewall.guard

import android.os.Process
import android.os.SystemClock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Live health of the Accessibility guard, whose Settings switch can say "on" while nothing runs.
 *
 * The Accessibility setting only records that the user enabled the service. After an app
 * update or a slow cold start Android can leave it enabled but unbound ("crashed"), delivering
 * no events at all — the dashboard kept saying "Protection active" while every send went
 * through. The same process hosts the service, so an in-memory heartbeat is the ground truth.
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

  /** Long enough for a cold debug build on a slow device to finish binding. */
  private const val BIND_GRACE_MS = 20_000L
}
