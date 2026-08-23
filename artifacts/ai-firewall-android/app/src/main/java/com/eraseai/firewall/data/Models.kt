package com.eraseai.firewall.data

data class EntitlementState(
  val authenticated: Boolean = false,
  val plan: String = "free",
  val status: String = "none",
  val scansUsed: Int = 0,
  val scanLimit: Int? = null,
  val androidFirewall: Boolean = false,
  val manualScan: Boolean = true,
  val accessibilityFirewall: Boolean = false,
  val history: Boolean = false,
  val redaction: Boolean = false,
  val billingRail: String = "google_play",
  val playManageUrl: String? = null,
  val billingSource: String = "none",
  val planEndDate: String? = null,
  val trialDaysRemaining: Int? = null,
  val canManageInPlay: Boolean = false,
) {
  val subscriptionLabel: String
    get() = when {
      status == "trialing" && trialDaysRemaining != null ->
        "Trial · ${trialDaysRemaining} day${if (trialDaysRemaining == 1) "" else "s"} left"
      status == "trialing" -> "Free trial active"
      status == "expired" -> "Trial expired"
      plan != "free" -> "${plan.replaceFirstChar { it.uppercase() }} / ${status.ifBlank { "active" }}"
      else -> "Free"
    }
}

data class ScanFinding(
  val type: String,
  val label: String,
  val start: Int,
  val end: Int,
  val severity: String,
)

data class ScanResult(
  val id: String?,
  val safetyScore: Int,
  val riskScore: Int,
  val level: String,
  val action: String,
  val findings: List<ScanFinding>,
  val redactedText: String?,
  val message: String,
) {
  fun summary(): String = when {
    findings.isEmpty() -> "Allowed"
    action == "block" -> "Blocked sensitive prompt"
    action == "redact" -> "Redaction recommended"
    else -> "Warning shown"
  }

  fun diagnosticsType(): String = when {
    findings.isEmpty() -> "allow"
    action == "block" -> "block"
    action == "redact" -> "redact"
    else -> "warn"
  }
}

data class ScanPiece(
  val source: String,
  val label: String,
  val text: String,
  val skipReason: String? = null,
)

data class PieceScanSummary(
  val source: String,
  val label: String,
  val level: String,
  val issueCount: Int,
  val skipReason: String? = null,
)

data class MultiScanResult(
  val result: ScanResult,
  val pieces: List<PieceScanSummary>,
)

data class ScanHistoryItem(
  val id: String,
  val content: String,
  val riskScore: Int,
  val level: String,
  val createdAt: String,
)

data class ProtectedApp(
  val packageName: String,
  val label: String,
  val suggested: Boolean = false,
  val installed: Boolean = false,
)
