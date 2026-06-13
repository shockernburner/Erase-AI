package com.eraseai.firewall.data

class EntitlementRepository(private val apiClient: ApiClient) {
  suspend fun load(): Result<EntitlementState> = runCatching {
    try {
      return@runCatching parseMobileEntitlement(apiClient.get("/mobile/entitlement"))
    } catch (err: ApiError.NotFound) {
    }

    val plan = apiClient.get("/billing/plan")
    val history = runCatching { apiClient.get("/personal/history?limit=1") }.getOrNull()
    val planType = plan.optString("planType", "free")
    val status = plan.optString("subscriptionStatus", if (planType == "free") "none" else "active")
    val paid = planType in setOf("personal", "pro", "business", "enterprise") && status != "expired"
    EntitlementState(
      authenticated = true,
      plan = planType,
      status = status,
      scansUsed = history?.optInt("totalUsed", 0) ?: 0,
      scanLimit = if (planType == "free") history?.optInt("lifetimeLimit", 10) else null,
      androidFirewall = paid,
      manualScan = true,
      accessibilityFirewall = paid,
      history = paid,
      redaction = paid,
    )
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
      androidFirewall = features?.optBoolean("android_firewall", false) ?: false,
      manualScan = features?.optBoolean("manual_scan", true) ?: true,
      accessibilityFirewall = features?.optBoolean("accessibility_firewall", false) ?: false,
      history = features?.optBoolean("history", false) ?: false,
      redaction = features?.optBoolean("redaction", false) ?: false,
      checkoutUrl = billing?.optString("checkout_url")?.takeIf { it.isNotBlank() },
      manageUrl = billing?.optString("manage_url")?.takeIf { it.isNotBlank() },
    )
  }
}

class HistoryRepository(private val apiClient: ApiClient) {
  suspend fun load(): Result<List<ScanHistoryItem>> = runCatching {
    val response = apiClient.get("/personal/history?limit=50")
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