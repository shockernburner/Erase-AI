package com.eraseai.firewall.guard

import com.eraseai.firewall.data.ScanFinding
import com.eraseai.firewall.data.ScanResult

/**
 * On-device gate so Gemini is stopped even when the API trial is expired
 * or the network scan has not returned yet.
 */
object LocalRiskScanner {
  data class LocalScan(
    val findings: List<ScanFinding>,
    val level: String,
    val riskScore: Int,
    val blockSend: Boolean,
  ) {
    val shouldWarn: Boolean get() = findings.isNotEmpty()

    fun summary(): String = when {
      findings.isEmpty() -> "Allowed"
      blockSend -> "Blocked high-risk prompt"
      else -> "Warning shown"
    }

    fun toScanResult(text: String): ScanResult = ScanResult(
      id = null,
      safetyScore = (100 - riskScore).coerceIn(0, 100),
      riskScore = riskScore,
      level = level,
      action = when {
        findings.isEmpty() -> "allow"
        blockSend -> "block"
        else -> "warn"
      },
      findings = findings,
      redactedText = null,
      message = when {
        findings.isEmpty() -> "No sensitive data detected."
        blockSend -> "High-risk content. Do not send this to a public AI."
        else -> "Review before sending: ${findings.first().label}"
      },
      blockSend = blockSend,
    ).also { _ ->
      // text retained by caller for the overlay body
      if (text.isEmpty()) Unit
    }
  }

  fun scan(text: String): LocalScan {
    val findings = mutableListOf<ScanFinding>()
    fun add(pattern: Regex, type: String, label: String, severity: String) {
      val match = pattern.find(text) ?: return
      findings.add(
        ScanFinding(
          type = type,
          label = label,
          start = match.range.first,
          end = match.range.last + 1,
          severity = severity,
        ),
      )
    }

    add(
      Regex("\\b(mass\\s+shooting|school\\s+shooting|shoot\\s+up\\s+(?:a\\s+)?(?:school|campus)|how\\s+to\\s+(?:make|build)\\s+(?:a\\s+)?(?:bomb|explosive))\\b", RegexOption.IGNORE_CASE),
      "VIOLENCE_INTENT",
      "Attack-planning language",
      "high",
    )
    add(
      Regex("\\b(child\\s*porn|csam|underage\\s+(?:sex|nude|porn))\\b", RegexOption.IGNORE_CASE),
      "CHILD_SAFETY",
      "Child-safety risk",
      "high",
    )
    add(
      Regex("\\b(buy\\s+(?:a\\s+)?gun|get\\s+(?:a\\s+)?gun|firearm|handgun|shotgun|rifle|ghost\\s+gun)\\b", RegexOption.IGNORE_CASE),
      "WEAPONS_HARM",
      "Firearm language",
      "medium",
    )
    add(
      Regex("(?i)(?:api(?:\\s+key)?|client\\s+secret|access\\s+token|secret|bearer)\\s*(?:is|=|:|for)\\s*\\S{6,}"),
      "PII",
      "Shared API credential",
      "high",
    )
    add(
      Regex("\\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{8,}\\b"),
      "PII",
      "API key detected",
      "high",
    )
    add(
      Regex("\\bAIza[0-9A-Za-z_-]{20,}\\b"),
      "PII",
      "Google API key detected",
      "high",
    )
    add(
      Regex("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b"),
      "PII",
      "Email address",
      "high",
    )
    add(
      Regex("\\b(?:\\+?\\d{1,3}[-.\\s]?)?(?:\\(\\d{3}\\)|\\d{3})[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b"),
      "PII",
      "Phone number",
      "high",
    )

    val block = findings.any { it.type == "VIOLENCE_INTENT" || it.type == "CHILD_SAFETY" }
    val level = when {
      findings.isEmpty() -> "low"
      block -> "high"
      findings.any { it.severity == "high" } -> "high"
      else -> "medium"
    }
    val risk = when (level) {
      "high" -> 80
      "medium" -> 45
      else -> 0
    }
    return LocalScan(findings, level, risk, block)
  }
}
