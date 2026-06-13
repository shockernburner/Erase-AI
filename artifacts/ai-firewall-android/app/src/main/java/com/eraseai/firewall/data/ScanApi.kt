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