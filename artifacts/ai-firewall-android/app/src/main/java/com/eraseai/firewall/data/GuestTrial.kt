package com.eraseai.firewall.data

import android.content.Context
import com.eraseai.firewall.BuildConfig

/**
 * The free trial: on-device protection for [DAYS] days or [SENDS] messages sent through the
 * protected AI apps (all apps together), whichever runs out first, for anyone without a paid
 * plan, signed in or not. After that protection pauses until they subscribe.
 *
 * The limits are build settings (freeDays / freeSends in gradle.properties): the closed test
 * uses 21 days and no message limit, production 7 days and 25 messages. Both are saved when
 * the trial starts, so a later release with different numbers only affects new users instead
 * of shortening (or ending outright) trials already under way.
 *
 * Kept apart from [MobileSessionStore] on purpose: signing out clears the session, and that
 * must not hand anyone a fresh trial.
 */
class GuestTrial(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun startedAt(): Long? = prefs.getLong(STARTED_AT_KEY, 0L).takeIf { it > 0L }

  fun hasStarted(): Boolean = startedAt() != null

  /** This user's trial length: what was offered when they started, or today's offer. */
  fun days(): Int = prefs.getInt(DAYS_KEY, 0).takeIf { it > 0 } ?: DAYS

  /** This user's message allowance, or 0 for no limit. */
  fun sendLimit(): Int = if (prefs.contains(SENDS_KEY)) prefs.getInt(SENDS_KEY, 0) else SENDS

  fun sendsUsed(): Int = prefs.getInt(SENDS_USED_KEY, 0)

  /** Messages left, or null when there is no message limit. */
  fun sendsLeft(): Int? = sendLimit().takeIf { it > 0 }?.let { (it - sendsUsed()).coerceAtLeast(0) }

  /** Starts the trial once; later calls keep the original start time and limits. */
  fun start(now: Long = System.currentTimeMillis()) {
    if (hasStarted()) return
    prefs.edit()
      .putLong(STARTED_AT_KEY, now)
      .putInt(DAYS_KEY, DAYS)
      .putInt(SENDS_KEY, SENDS)
      .apply()
  }

  /** One message sent through a protected app. Paid users are not counted. */
  fun recordSend() {
    if (isPaid() || !hasStarted()) return
    prefs.edit().putInt(SENDS_USED_KEY, sendsUsed() + 1).apply()
  }

  /** Whether the signed-in account has a paid plan, as last reported by the server. */
  fun isPaid(): Boolean = prefs.getBoolean(PAID_KEY, false)

  fun setPaid(paid: Boolean) {
    if (paid != isPaid()) prefs.edit().putBoolean(PAID_KEY, paid).apply()
  }

  fun isActive(now: Long = System.currentTimeMillis()): Boolean =
    isActive(startedAt(), now, days()) && !sendsExhausted(sendsUsed(), sendLimit())

  fun isExpired(now: Long = System.currentTimeMillis()): Boolean =
    hasStarted() && (isExpired(startedAt(), now, days()) || sendsExhausted(sendsUsed(), sendLimit()))

  fun daysLeft(now: Long = System.currentTimeMillis()): Int = daysLeft(startedAt(), now, days())

  /** Protection may run: a paid plan, or a trial that has not run out. */
  fun protectionAllowed(now: Long = System.currentTimeMillis()): Boolean = isPaid() || !isExpired(now)

  companion object {
    /** Trial length in days offered to new users (build setting freeDays). */
    val DAYS: Int get() = BuildConfig.FREE_DAYS

    /** Messages offered to new users, 0 for no limit (build setting freeSends). */
    val SENDS: Int get() = BuildConfig.FREE_SENDS

    private const val DAY_MS = 24L * 60 * 60 * 1000
    private const val PREFS = "eraseai_guest_trial"
    private const val STARTED_AT_KEY = "started_at"
    private const val DAYS_KEY = "days"
    private const val SENDS_KEY = "sends"
    private const val SENDS_USED_KEY = "sends_used"
    private const val PAID_KEY = "paid"

    private fun durationMs(days: Int): Long = days * DAY_MS

    // A clock set backwards only keeps the trial active; it never ends it early.
    fun isActive(startedAt: Long?, now: Long, days: Int = DAYS): Boolean =
      startedAt != null && now - startedAt < durationMs(days)

    fun isExpired(startedAt: Long?, now: Long, days: Int = DAYS): Boolean =
      startedAt != null && now - startedAt >= durationMs(days)

    fun sendsExhausted(used: Int, limit: Int): Boolean = limit > 0 && used >= limit

    /** Whole days remaining, rounded up, so the last few hours still read "1 day left". */
    fun daysLeft(startedAt: Long?, now: Long, days: Int = DAYS): Int {
      if (!isActive(startedAt, now, days)) return 0
      val total = durationMs(days)
      val remaining = (total - (now - startedAt!!)).coerceAtMost(total)
      return ((remaining + DAY_MS - 1) / DAY_MS).toInt()
    }
  }
}
