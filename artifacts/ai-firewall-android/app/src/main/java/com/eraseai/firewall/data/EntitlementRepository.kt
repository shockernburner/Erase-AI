package com.eraseai.firewall.data

class EntitlementRepository(private val apiClient: ApiClient) {
  suspend fun load(): Result<EntitlementState> = runCatching {
    parseMobileEntitlement(apiClient.get("/mobile/entitlement"))
  }

  private fun parseMobileEntitlement(response: org.json.JSONObject): EntitlementState {
    val features = response.optJSONObject("features")
    val billing = response.optJSONObject("billing")
    return EntitlementState(
      authenticated = response.optBoolean("authenticated", true),
      plan = response.optString("plan", "free"),
      status = response.optString("status", "none"),
      scansUsed = response.optInt("monthly_scans_used", 0),
      scanLimit = if (response.isNull("monthly_scan_limit")) null else response.optInt("monthly_scan_limit"),
      androidFirewall = features?.optBoolean("android_firewall", true) ?: true,
      manualScan = features?.optBoolean("manual_scan", true) ?: true,
      accessibilityFirewall = features?.optBoolean("accessibility_firewall", true) ?: true,
      history = features?.optBoolean("history", true) ?: true,
      redaction = features?.optBoolean("redaction", false) ?: false,
      billingRail = billing?.optString("rail", "google_play") ?: "google_play",
      playManageUrl = billing?.optString("manage_url")?.takeIf { it.isNotBlank() },
      billingSource = response.optString("billing_source", "none"),
      planEndDate = response.optString("plan_end_date").takeIf { it.isNotBlank() },
      trialDaysRemaining = if (response.isNull("trial_days_remaining")) null else response.optInt("trial_days_remaining"),
      canManageInPlay = response.optBoolean("can_manage_in_play", false),
    )
  }
}

class HistoryRepository(private val apiClient: ApiClient) {
  suspend fun load(): Result<List<ScanHistoryItem>> = runCatching {
    val response = apiClient.get("/mobile/history?limit=50")
    val scans = response.optJSONArray("scans") ?: return@runCatching emptyList()
    buildList {
      for (index in 0 until scans.length()) {
        val scan = scans.getJSONObject(index)
        add(
          ScanHistoryItem(
            id = scan.optString("id"),
            content = scan.optString("content"),
            riskScore = 100 - scan.optInt("riskScore", 100),
            level = scan.optString("level", "low"),
            createdAt = scan.optString("createdAt"),
          ),
        )
      }
    }
  }
}
