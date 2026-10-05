package com.eraseai.firewall.data

import android.content.Context
import android.content.RestrictionsManager

/**
 * Managed configuration an organization's IT sets through managed Google Play or any EMM
 * (keys in res/xml/app_restrictions.xml): the organization's `enrollment_token` and, optionally,
 * the person's `user_email`. Once the person signs in with their work email, the app calls
 * POST /api/org/enroll with the token, which joins them to the organization so its plan applies.
 * The server checks the email domain and seats; the app only remembers which token it used.
 */
data class ManagedPolicy(val enrollmentToken: String, val userEmail: String?)

object ManagedConfig {
  const val KEY_TOKEN = "enrollment_token"
  const val KEY_EMAIL = "user_email"
  private const val TOKEN_PREFIX = "eae_"
  private const val PREFS = "eraseai_managed"
  private const val KEY_ENROLLED_TAG = "enrolled_token_tag"
  private val EMAIL = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

  /** Pure, for tests: null unless the token looks like an EraseAI enrollment token. */
  fun parse(token: String?, email: String?): ManagedPolicy? {
    val t = token?.trim().orEmpty()
    if (!t.startsWith(TOKEN_PREFIX) || t.length < 20) return null
    val e = email?.trim()?.lowercase()?.takeIf { EMAIL.matches(it) }
    return ManagedPolicy(t, e)
  }

  fun read(context: Context): ManagedPolicy? = runCatching {
    val manager = context.getSystemService(Context.RESTRICTIONS_SERVICE) as RestrictionsManager
    val restrictions = manager.applicationRestrictions
    parse(restrictions.getString(KEY_TOKEN), restrictions.getString(KEY_EMAIL))
  }.getOrNull()

  /** Short, non-secret tag that changes when IT replaces the token. */
  fun tokenTag(policy: ManagedPolicy): String = policy.enrollmentToken.take(12)

  fun isEnrolled(context: Context, policy: ManagedPolicy): Boolean =
    prefs(context).getString(KEY_ENROLLED_TAG, null) == tokenTag(policy)

  fun markEnrolled(context: Context, policy: ManagedPolicy) {
    prefs(context).edit().putString(KEY_ENROLLED_TAG, tokenTag(policy)).apply()
  }

  /** On sign-out, so the next person to sign in on this phone is enrolled too. */
  fun clearEnrolled(context: Context) {
    prefs(context).edit().remove(KEY_ENROLLED_TAG).apply()
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
