package com.eraseai.firewall.data

import org.json.JSONArray
import org.json.JSONObject

class ScanApi(private val apiClient: ApiClient) {
  suspend fun scan(
    text: String,
    source: String = "android_manual",
    targetPackage: String? = null,
    targetName: String? = null,
  ): Result<ScanResult> = runCatching {
    val response = apiClient.post(
      "/personal/analyze",
      JSONObject()
        .put("text", text)
        .put("source", source)
        .put("target_app_package", targetPackage)
        .put("target_app_name", targetName)
        .put("mode", "prompt_pre_send"),
    )
    response.toScanResult(text)
  }

  suspend fun scanPieces(
    pieces: List<ScanPiece>,
    source: String = "android_accessibility_send",
    targetPackage: String? = null,
    targetName: String? = null,
  ): Result<MultiScanResult> = runCatching {
    val payload = JSONArray()
    pieces.forEach { piece ->
      payload.put(
        JSONObject()
          .put("source", piece.source)
          .put("label", piece.label)
          .put("text", piece.text)
          .put("skip_reason", piece.skipReason),
      )
    }
    val response = apiClient.post(
      "/mobile/analyze-pieces",
      JSONObject()
        .put("pieces", payload)
        .put("source", source)
        .put("target_app_package", targetPackage)
        .put("target_app_name", targetName),
    )
    response.toMultiScanResult()
  }

  suspend fun scanAttachments(
    promptText: String,
    attachments: List<ScanPiece>,
    source: String = "android_manual",
  ): Result<MultiScanResult> = runCatching {
    val pieces = mutableListOf<ScanPiece>()
    if (promptText.isNotBlank()) {
      pieces.add(ScanPiece(source = "prompt", label = "Prompt text", text = promptText))
    }
    pieces.addAll(attachments)
    scanPieces(pieces, source = source).getOrThrow()
  }

  suspend fun rewrite(text: String, findings: List<ScanFinding>): Result<String> = runCatching {
    val flags = JSONArray()
    findings.forEach { finding ->
      flags.put(
        JSONObject()
          .put("type", finding.type.lowercase())
          .put("severity", finding.severity)
          .put("detail", finding.label)
          .put("matchedText", text.substring(finding.start.coerceAtLeast(0), finding.end.coerceAtMost(text.length)))
          .put("position", JSONObject().put("start", finding.start).put("end", finding.end)),
      )
    }
    apiClient.post("/personal/rewrite", JSONObject().put("text", text).put("flags", flags)).getString("rewritten")
  }

  suspend fun recordOutcome(
    action: String,
    level: String,
    riskScore: Int,
    findingCount: Int,
    source: String,
  ): Result<Unit> = runCatching {
    apiClient.post(
      "/mobile/outcome",
      JSONObject()
        .put("action", action)
        .put("level", level)
        .put("risk_score", riskScore)
        .put("finding_count", findingCount)
        .put("source", source),
    )
  }
}

fun JSONObject.toScanResult(originalText: String): ScanResult {
  val safetyScore = optInt("riskScore", 100)
  val level = optString("level", "low")
  val findings = mutableListOf<ScanFinding>()
  val flags = optJSONArray("flags") ?: JSONArray()
  for (index in 0 until flags.length()) {
    val flag = flags.getJSONObject(index)
    val position = flag.optJSONObject("position") ?: JSONObject()
    findings.add(
      ScanFinding(
        type = flag.optString("type", "pii").uppercase(),
        label = flag.optString("detail", "Sensitive data detected"),
        start = position.optInt("start", 0),
        end = position.optInt("end", 0),
        severity = flag.optString("severity", "medium"),
      ),
    )
  }

  val action = when {
    findings.isEmpty() -> "allow"
    level == "high" -> "block"
    level == "medium" -> "redact"
    else -> "warn"
  }

  return ScanResult(
    id = optString("id", null),
    safetyScore = safetyScore,
    riskScore = (100 - safetyScore).coerceIn(0, 100),
    level = level,
    action = action,
    findings = findings,
    redactedText = null,
    message = if (findings.isEmpty()) "No sensitive data detected." else "Sensitive data detected before sending to AI.",
  )
}

fun JSONObject.toMultiScanResult(): MultiScanResult {
  val level = optString("level", "low")
  val riskScore = optInt("riskScore", 100)
  val findings = mutableListOf<ScanFinding>()
  val flags = optJSONArray("flags") ?: JSONArray()
  for (index in 0 until flags.length()) {
    val flag = flags.getJSONObject(index)
    val position = flag.optJSONObject("position") ?: JSONObject()
    findings.add(
      ScanFinding(
        type = flag.optString("type", "pii").uppercase(),
        label = flag.optString("detail", "Sensitive data detected"),
        start = position.optInt("start", 0),
        end = position.optInt("end", 0),
        severity = flag.optString("severity", "medium"),
      ),
    )
  }

  val action = when {
    findings.isEmpty() && !optBoolean("has_attachment_blocker", false) -> "allow"
    level == "high" -> "block"
    level == "medium" -> "redact"
    optBoolean("has_attachment_blocker", false) -> "warn"
    else -> "warn"
  }

  val pieces = mutableListOf<PieceScanSummary>()
  val pieceArray = optJSONArray("pieces") ?: JSONArray()
  for (index in 0 until pieceArray.length()) {
    val piece = pieceArray.getJSONObject(index)
    pieces.add(
      PieceScanSummary(
        source = piece.optString("source", "prompt"),
        label = piece.optString("label", "Piece"),
        level = piece.optString("level", "low"),
        issueCount = piece.optInt("issue_count", 0),
        skipReason = piece.optString("skip_reason", null),
      ),
    )
  }

  return MultiScanResult(
    result = ScanResult(
      id = optString("id", null),
      safetyScore = riskScore,
      riskScore = (100 - riskScore).coerceIn(0, 100),
      level = level,
      action = action,
      findings = findings,
      redactedText = null,
      message = if (findings.isEmpty()) "No sensitive data detected." else "Sensitive data detected before sending to AI.",
    ),
    pieces = pieces,
  )
}

fun maskFindings(text: String, findings: List<ScanFinding>): String {
  if (findings.isEmpty()) return text
  val sorted = findings.sortedByDescending { it.start }
  val builder = StringBuilder(text)
  for (finding in sorted) {
    val start = finding.start.coerceIn(0, builder.length)
    val end = finding.end.coerceIn(start, builder.length)
    val token = when {
      finding.label.contains("Phone", true) -> "[PHONE]"
      finding.label.contains("Email", true) -> "[EMAIL]"
      finding.label.contains("API", true) || finding.label.contains("token", true) -> "[API_KEY]"
      finding.label.contains("Name", true) -> "[NAME]"
      else -> "[REDACTED]"
    }
    builder.replace(start, end, token)
  }
  return builder.toString()
}
