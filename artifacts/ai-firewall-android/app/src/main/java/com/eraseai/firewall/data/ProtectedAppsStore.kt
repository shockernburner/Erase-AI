package com.eraseai.firewall.data

import android.content.Context
import com.eraseai.firewall.guard.LocalRiskScanner
import org.json.JSONArray
import org.json.JSONObject
import java.util.Date

class ProtectedAppsStore(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences("eraseai_firewall_prefs", Context.MODE_PRIVATE)

  fun isFirewallEnabled(): Boolean = prefs.getBoolean(FIREWALL_ENABLED_KEY, true)

  fun setFirewallEnabled(enabled: Boolean) {
    prefs.edit().putBoolean(FIREWALL_ENABLED_KEY, enabled).apply()
  }

  fun getSelectedPackages(): Set<String> =
    prefs.getStringSet(PROTECTED_APPS_KEY, DEFAULT_PROTECTED_PACKAGES) ?: DEFAULT_PROTECTED_PACKAGES

  fun setSelectedPackages(packages: Set<String>) {
    // Gemini ships as either the Gemini app or inside Google Search — keep both in sync.
    val normalized = packages.toMutableSet()
    if ("com.google.android.apps.bard" in normalized) {
      normalized += "com.google.android.googlequicksearchbox"
    }
    if ("com.google.android.googlequicksearchbox" in normalized) {
      normalized += "com.google.android.apps.bard"
    }
    prefs.edit().putStringSet(PROTECTED_APPS_KEY, normalized).apply()
  }

  suspend fun mergeFromBackend(apiClient: ApiClient): Result<Set<String>> = runCatching {
    val response = apiClient.get("/mobile/protected-apps")
    val remotePackages = response.optJSONArray("packages")?.toStringSet().orEmpty()
    val merged = getSelectedPackages() + remotePackages
    val enabled = response.optBoolean("firewall_enabled", isFirewallEnabled())
    prefs.edit()
      .putStringSet(PROTECTED_APPS_KEY, merged)
      .putBoolean(FIREWALL_ENABLED_KEY, enabled)
      .apply()
    merged
  }

  suspend fun pushToBackend(apiClient: ApiClient): Result<Unit> = runCatching {
    val packages = JSONArray()
    getSelectedPackages().sorted().forEach { packages.put(it) }
    apiClient.post(
      "/mobile/protected-apps",
      JSONObject()
        .put("packages", packages)
        .put("firewall_enabled", isFirewallEnabled()),
    )
    Unit
  }

  fun isProtected(packageName: String): Boolean = isFirewallEnabled() && getSelectedPackages().contains(packageName)

  fun saveLastScanSummary(summary: String, resultType: String = "warn") {
    prefs.edit()
      .putString(LAST_SCAN_KEY, summary.take(160))
      .putString(LAST_SCAN_TYPE_KEY, resultType.take(24))
      .putString(LAST_SCAN_TIME_KEY, Date().toInstant().toString())
      .putString(LAST_ERROR_CATEGORY_KEY, "none")
      .apply()
  }

  fun getLastScanSummary(): String = prefs.getString(LAST_SCAN_KEY, "None yet") ?: "None yet"

  fun getLastScanTime(): String = prefs.getString(LAST_SCAN_TIME_KEY, "None yet") ?: "None yet"

  fun getLastScanResultType(): String = prefs.getString(LAST_SCAN_TYPE_KEY, "none") ?: "none"

  fun saveLastErrorCategory(category: String) {
    prefs.edit().putString(LAST_ERROR_CATEGORY_KEY, category.take(32)).apply()
  }

  fun getLastErrorCategory(): String = prefs.getString(LAST_ERROR_CATEGORY_KEY, "none") ?: "none"

  fun appendLocalScan(content: String, riskScore: Int, level: String) {
    val existing = JSONArray(prefs.getString(LOCAL_HISTORY_KEY, "[]"))
    val next = JSONArray()
    next.put(
      JSONObject()
        // History exists to show what was caught, not to become a second copy of the secret.
        .put("content", LocalRiskScanner.redact(content).take(180))
        .put("riskScore", riskScore)
        .put("level", level)
        .put("createdAt", Date().toInstant().toString()),
    )
    val keep = minOf(existing.length(), 39)
    for (index in 0 until keep) {
      next.put(existing.getJSONObject(index))
    }
    prefs.edit().putString(LOCAL_HISTORY_KEY, next.toString()).apply()
  }

  fun getLocalScans(): List<ScanHistoryItem> {
    val raw = prefs.getString(LOCAL_HISTORY_KEY, "[]") ?: "[]"
    val array = runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
    return buildList {
      for (index in 0 until array.length()) {
        val item = array.optJSONObject(index) ?: continue
        add(
          ScanHistoryItem(
            id = "local-$index",
            content = item.optString("content"),
            riskScore = item.optInt("riskScore"),
            level = item.optString("level", "low"),
            createdAt = item.optString("createdAt"),
          ),
        )
      }
    }
  }

  companion object {
    private const val FIREWALL_ENABLED_KEY = "firewall_enabled"
    private const val PROTECTED_APPS_KEY = "protected_apps"
    private const val LAST_SCAN_KEY = "last_scan_summary"
    private const val LAST_SCAN_TIME_KEY = "last_scan_time"
    private const val LAST_SCAN_TYPE_KEY = "last_scan_type"
    private const val LAST_ERROR_CATEGORY_KEY = "last_error_category"
    private const val LOCAL_HISTORY_KEY = "local_scan_history"
    val DEFAULT_PROTECTED_PACKAGES = setOf(
      "com.openai.chatgpt",
      "com.google.android.apps.bard",
      "com.google.android.googlequicksearchbox",
      "com.anthropic.claude",
      "ai.deepseek",
      "com.replit.app",
      "com.microsoft.copilot",
      "com.perplexity.app",
      "com.quora.poe",
      "ai.x.grok",
      "com.xai.grok",
    )
  }
}

private fun JSONArray.toStringSet(): Set<String> = buildSet {
  for (index in 0 until length()) {
    optString(index).takeIf { it.isNotBlank() }?.let(::add)
  }
}