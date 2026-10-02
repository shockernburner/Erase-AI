package com.eraseai.firewall.data

import android.content.Context

/**
 * Days of on-device protection without an account, so people can see the firewall work before
 * signing up. Kept apart from [MobileSessionStore] on purpose: signing out clears the session,
 * and that must not hand a guest a fresh trial.
 *
 * The length is saved when the trial starts. Changing [DAYS] in a later release then applies
 * to new guests only, instead of shortening (or ending outright) trials already under way.
 */
class GuestTrial(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun startedAt(): Long? = prefs.getLong(STARTED_AT_KEY, 0L).takeIf { it > 0L }

  fun hasStarted(): Boolean = startedAt() != null

  /** This guest's trial length: what was offered when they started, or today's offer. */
  fun days(): Int = prefs.getInt(DAYS_KEY, 0).takeIf { it > 0 } ?: DAYS

  /** Starts the trial once; later calls keep the original start time and length. */
  fun start(now: Long = System.currentTimeMillis()) {
    if (!hasStarted()) prefs.edit().putLong(STARTED_AT_KEY, now).putInt(DAYS_KEY, DAYS).apply()
  }

  fun isActive(now: Long = System.currentTimeMillis()): Boolean = isActive(startedAt(), now, days())

  fun isExpired(now: Long = System.currentTimeMillis()): Boolean = isExpired(startedAt(), now, days())

  fun daysLeft(now: Long = System.currentTimeMillis()): Int = daysLeft(startedAt(), now, days())

  companion object {
    /**
     * Length offered to new guests. 21 days leaves a week of margin over Google Play's 14-day
     * closed test, so testers never have to sign up or pay partway through.
     */
    const val DAYS = 21
    private const val DAY_MS = 24L * 60 * 60 * 1000
    private const val PREFS = "eraseai_guest_trial"
    private const val STARTED_AT_KEY = "started_at"
    private const val DAYS_KEY = "days"

    private fun durationMs(days: Int): Long = days * DAY_MS

    // A clock set backwards only keeps the trial active; it never ends it early.
    fun isActive(startedAt: Long?, now: Long, days: Int = DAYS): Boolean =
      startedAt != null && now - startedAt < durationMs(days)

    fun isExpired(startedAt: Long?, now: Long, days: Int = DAYS): Boolean =
      startedAt != null && now - startedAt >= durationMs(days)

    /** Whole days remaining, rounded up, so the last few hours still read "1 day left". */
    fun daysLeft(startedAt: Long?, now: Long, days: Int = DAYS): Int {
      if (!isActive(startedAt, now, days)) return 0
      val total = durationMs(days)
      val remaining = (total - (now - startedAt!!)).coerceAtMost(total)
      return ((remaining + DAY_MS - 1) / DAY_MS).toInt()
    }
  }
}
