package com.eraseai.firewall.data

import android.content.Context

/**
 * [DAYS] days of on-device protection without an account, so people can see the firewall work
 * before signing up. Kept apart from [MobileSessionStore] on purpose: signing out clears the
 * session, and that must not hand a guest a fresh trial.
 */
class GuestTrial(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun startedAt(): Long? = prefs.getLong(STARTED_AT_KEY, 0L).takeIf { it > 0L }

  fun hasStarted(): Boolean = startedAt() != null

  /** Starts the trial once; later calls keep the original start time. */
  fun start(now: Long = System.currentTimeMillis()) {
    if (!hasStarted()) prefs.edit().putLong(STARTED_AT_KEY, now).apply()
  }

  fun isActive(now: Long = System.currentTimeMillis()): Boolean = isActive(startedAt(), now)

  fun isExpired(now: Long = System.currentTimeMillis()): Boolean = isExpired(startedAt(), now)

  fun daysLeft(now: Long = System.currentTimeMillis()): Int = daysLeft(startedAt(), now)

  companion object {
    /** Long enough to cover Google Play's 14-day closed test without testers signing up. */
    const val DAYS = 14
    const val DURATION_MS = DAYS * 24L * 60 * 60 * 1000
    private const val DAY_MS = 24L * 60 * 60 * 1000
    private const val PREFS = "eraseai_guest_trial"
    private const val STARTED_AT_KEY = "started_at"

    // A clock set backwards only keeps the trial active; it never ends it early.
    fun isActive(startedAt: Long?, now: Long): Boolean =
      startedAt != null && now - startedAt < DURATION_MS

    fun isExpired(startedAt: Long?, now: Long): Boolean =
      startedAt != null && now - startedAt >= DURATION_MS

    /** Whole days remaining, rounded up, so the last few hours still read "1 day left". */
    fun daysLeft(startedAt: Long?, now: Long): Int {
      if (!isActive(startedAt, now)) return 0
      val remaining = (DURATION_MS - (now - startedAt!!)).coerceAtMost(DURATION_MS)
      return ((remaining + DAY_MS - 1) / DAY_MS).toInt()
    }
  }
}
