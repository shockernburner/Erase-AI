package com.eraseai.firewall.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class MobileSessionStore(context: Context) {
  private val appContext = context.applicationContext
  private val prefs = runCatching {
    val key = MasterKey.Builder(appContext)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()
    EncryptedSharedPreferences.create(
      appContext,
      "eraseai_mobile_auth_secure",
      key,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
  }.getOrElse {
    appContext.getSharedPreferences("eraseai_mobile_auth", Context.MODE_PRIVATE)
  }

  fun saveSession(token: String, userId: String, planType: String) {
    prefs.edit()
      .putString(TOKEN_KEY, token)
      .putString(USER_ID_KEY, userId)
      .putString(PLAN_TYPE_KEY, planType)
      .apply()
  }

  fun getToken(): String? = prefs.getString(TOKEN_KEY, null)

  fun getUserId(): String? = prefs.getString(USER_ID_KEY, null)

  fun getPlanType(): String = prefs.getString(PLAN_TYPE_KEY, "free") ?: "free"

  fun clear() {
    prefs.edit().clear().apply()
  }

  companion object {
    private const val TOKEN_KEY = "session_token"
    private const val USER_ID_KEY = "user_id"
    private const val PLAN_TYPE_KEY = "plan_type"
  }
}
