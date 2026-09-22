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
    // Credential findings are typed PII deliberately: the server's rewriter only redacts
    // flags whose type is "pii", so any other value would show a finding in the gate and
    // then hand back an unchanged prompt when the user taps Sanitize.
    fun add(
      pattern: Regex,
      type: String,
      label: String,
      severity: String,
      accept: (MatchResult) -> Boolean = { true },
    ) {
      val match = pattern.findAll(text).firstOrNull(accept) ?: return
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
      Regex("(?i)(?:api(?:\\s+key)?|client\\s+secret|access\\s+token|secret|bearer|password|passwd|pwd)\\s*(?:is|=|:|for)\\s*\\S{6,}"),
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
    // Everything below mirrors the server's secret rules. They were server-only, so an
    // expired trial, a dropped network or simply a verdict that had not come back yet left
    // these completely ungated on device — a pasted AWS key went straight through.
    add(
      Regex("\\bAKIA[0-9A-Z]{16}\\b"),
      "PII",
      "AWS access key",
      "high",
    )
    add(
      Regex("\\b(?:gh[posur]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\\b"),
      "PII",
      "GitHub token",
      "high",
    )
    add(
      Regex("\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b"),
      "PII",
      "Slack token",
      "high",
    )
    add(
      Regex("\\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\\b"),
      "PII",
      "AI provider API key",
      "high",
    )
    add(
      Regex("\\beyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}"),
      "PII",
      "JWT token",
      "high",
    )
    add(
      Regex("-----BEGIN[A-Z ]*PRIVATE KEY-----"),
      "PII",
      "Private key",
      "high",
    )
    add(
      Regex("\\bssh-(?:rsa|ed25519|dss)\\s+[A-Za-z0-9+/=]{40,}"),
      "PII",
      "SSH key",
      "high",
    )
    add(
      Regex("(?i)\\b(?:postgres(?:ql)?|mysql|mongodb(?:\\+srv)?|redis)://\\S{3,}"),
      "PII",
      "Database connection URL",
      "high",
    )
    add(
      Regex("\\b\\d(?:[ -]?\\d){12,18}\\b"),
      "PII",
      "Payment card number",
      "high",
    ) { isLuhnValid(it.value) }
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

  /**
   * Any long-enough digit run looks like a card number — order references, IDs and phone
   * numbers all match the shape. The checksum is what separates a real card from noise.
   */
  private fun isLuhnValid(candidate: String): Boolean {
    val digits = candidate.filter(Char::isDigit)
    if (digits.length !in 13..19) return false
    var sum = 0
    var doubling = false
    for (index in digits.indices.reversed()) {
      var digit = digits[index] - '0'
      if (doubling) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      doubling = !doubling
    }
    return sum % 10 == 0
  }
}
