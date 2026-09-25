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

  fun scan(text: String): LocalScan = evaluate(text).scan

  /**
   * Replaces every secret/PII match in [text]. [scan] keeps one finding per rule for display,
   * so a sanitizer built on its findings redacted the first email in a prompt and sent the
   * second one untouched.
   */
  fun redact(text: String): String {
    val merged = mergedPiiMatches(text)
    if (merged.isEmpty()) return text
    return merged.asReversed().fold(StringBuilder(text)) { acc, (range, label) ->
      acc.replace(range.first, range.last + 1, "[${label.uppercase()}]")
    }.toString()
  }

  /** Character spans [redact] would replace — used to black out OCR'd words in images. */
  fun piiRanges(text: String): List<IntRange> = mergedPiiMatches(text).map { it.first }

  /** Number of distinct spans [redact] replaces. */
  fun redactionCount(text: String): Int = mergedPiiMatches(text).size

  private fun mergedPiiMatches(text: String): List<Pair<IntRange, String>> {
    val merged = mutableListOf<Pair<IntRange, String>>()
    evaluate(text).piiMatches.sortedBy { it.first.first }.forEach { (range, label) ->
      val last = merged.lastOrNull()
      if (last != null && range.first <= last.first.last) {
        merged[merged.lastIndex] = (last.first.first..maxOf(last.first.last, range.last)) to last.second
      } else {
        merged.add(range to label)
      }
    }
    return merged
  }

  private class Evaluation(val scan: LocalScan, val piiMatches: List<Pair<IntRange, String>>)

  private fun evaluate(text: String): Evaluation {
    val findings = mutableListOf<ScanFinding>()
    val piiMatches = mutableListOf<Pair<IntRange, String>>()
    // Text EraseAI already redacted must not be flagged by its own placeholders:
    // "[SHARED API CREDENTIAL]" reads as "API <secret>" to the credential rule.
    val placeholders = PLACEHOLDER_PATTERN.findAll(text).map { it.range }.toList()
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
      val matches = pattern.findAll(text)
        .filter { match -> placeholders.none { match.range.first in it } }
        .filter(accept)
        .toList()
      val match = matches.firstOrNull() ?: return
      if (type == "PII") matches.forEach { piiMatches.add(it.range to label) }
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
      VIOLENCE_PATTERN,
      "VIOLENCE_INTENT",
      "Attack-planning language",
      "high",
    )
    add(
      CHILD_SAFETY_PATTERN,
      "CHILD_SAFETY",
      "Child-safety risk",
      "high",
    )
    add(
      FIREARM_PATTERN,
      "WEAPONS_HARM",
      "Firearm language",
      "medium",
    )
    add(
      CREDENTIAL_PHRASE_PATTERN,
      "PII",
      "Shared API credential",
      "high",
    )
    add(
      STRIPE_KEY_PATTERN,
      "PII",
      "API key detected",
      "high",
    )
    add(
      GOOGLE_KEY_PATTERN,
      "PII",
      "Google API key detected",
      "high",
    )
    // Everything below mirrors the server's secret rules. They were server-only, so an
    // expired trial, a dropped network or simply a verdict that had not come back yet left
    // these completely ungated on device — a pasted AWS key went straight through.
    // Do not use \\b — pasted keys are often glued to words ("MyAWSkeyisAKIA…") or prefixes
    // ("sAKIA…" when the prior character is still in the accessibility chunk).
    add(
      AWS_ACCESS_KEY_PATTERN,
      "PII",
      "AWS access key",
      "high",
    )
    add(
      AWS_SESSION_KEY_PATTERN,
      "PII",
      "AWS session key",
      "high",
    )
    add(
      GITHUB_TOKEN_PATTERN,
      "PII",
      "GitHub token",
      "high",
    )
    add(
      SLACK_TOKEN_PATTERN,
      "PII",
      "Slack token",
      "high",
    )
    add(
      AI_PROVIDER_KEY_PATTERN,
      "PII",
      "AI provider API key",
      "high",
    )
    add(
      JWT_PATTERN,
      "PII",
      "JWT token",
      "high",
    )
    add(
      PRIVATE_KEY_PATTERN,
      "PII",
      "Private key",
      "high",
    )
    add(
      SSH_KEY_PATTERN,
      "PII",
      "SSH key",
      "high",
    )
    add(
      DB_URL_PATTERN,
      "PII",
      "Database connection URL",
      "high",
    )
    add(
      CARD_PATTERN,
      "PII",
      "Payment card number",
      "high",
    ) { isLuhnValid(it.value) }
    add(
      EMAIL_PATTERN,
      "PII",
      "Email address",
      "high",
    )
    add(
      PHONE_PATTERN,
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
    return Evaluation(LocalScan(findings, level, risk, block), piiMatches)
  }

  private val PII_LABELS = listOf(
    "Shared API credential", "API key detected", "Google API key detected", "AWS access key",
    "AWS session key", "GitHub token", "Slack token", "AI provider API key", "JWT token",
    "Private key", "SSH key", "Database connection URL", "Payment card number",
    "Email address", "Phone number",
  )
  private val PLACEHOLDER_PATTERN =
    Regex("\\[(?:" + PII_LABELS.joinToString("|") { Regex.escape(it.uppercase()) } + ")\\]")

  // Compiled once: scan() runs on every keystroke and composer event.
  private val VIOLENCE_PATTERN = Regex("\\b(mass\\s+shooting|school\\s+shooting|shoot\\s+up\\s+(?:a\\s+)?(?:school|campus)|how\\s+to\\s+(?:make|build)\\s+(?:a\\s+)?(?:bomb|explosive))\\b", RegexOption.IGNORE_CASE)
  private val CHILD_SAFETY_PATTERN = Regex("\\b(child\\s*porn|csam|underage\\s+(?:sex|nude|porn))\\b", RegexOption.IGNORE_CASE)
  private val FIREARM_PATTERN = Regex("\\b(buy\\s+(?:a\\s+)?gun|get\\s+(?:a\\s+)?gun|firearm|handgun|shotgun|rifle|ghost\\s+gun)\\b", RegexOption.IGNORE_CASE)
  private val CREDENTIAL_PHRASE_PATTERN = Regex("(?i)(?:api(?:\\s+key)?|aws(?:\\s+access)?\\s+key|client\\s+secret|access\\s+token|secret|bearer|password|passwd|pwd)\\s*(?:is|=|:|for)?\\s*['\"]?\\S{6,}")
  private val STRIPE_KEY_PATTERN = Regex("\\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{8,}\\b")
  private val GOOGLE_KEY_PATTERN = Regex("\\bAIza[0-9A-Za-z_-]{20,}\\b")
  private val AWS_ACCESS_KEY_PATTERN = Regex("(?i)AKIA[0-9A-Z]{16}")
  private val AWS_SESSION_KEY_PATTERN = Regex("(?i)ASIA[0-9A-Z]{16}")
  private val GITHUB_TOKEN_PATTERN = Regex("\\b(?:gh[posur]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\\b")
  private val SLACK_TOKEN_PATTERN = Regex("\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b")
  private val AI_PROVIDER_KEY_PATTERN = Regex("\\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\\b")
  private val JWT_PATTERN = Regex("\\beyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}")
  private val PRIVATE_KEY_PATTERN = Regex("-----BEGIN[A-Z ]*PRIVATE KEY-----")
  private val SSH_KEY_PATTERN = Regex("\\bssh-(?:rsa|ed25519|dss)\\s+[A-Za-z0-9+/=]{40,}")
  private val DB_URL_PATTERN = Regex("(?i)\\b(?:postgres(?:ql)?|mysql|mongodb(?:\\+srv)?|redis)://\\S{3,}")
  private val CARD_PATTERN = Regex("\\b\\d(?:[ -]?\\d){12,18}\\b")
  private val EMAIL_PATTERN = Regex("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b")
  private val PHONE_PATTERN = Regex("\\b(?:\\+?\\d{1,3}[-.\\s]?)?(?:\\(\\d{3}\\)|\\d{3})[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b")

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
