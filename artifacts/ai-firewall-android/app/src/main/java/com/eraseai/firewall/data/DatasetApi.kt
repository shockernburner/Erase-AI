package com.eraseai.firewall.data

import org.json.JSONObject

data class DatasetUploadResult(
  val datasetId: Int,
  val name: String,
  val format: String,
  val rowCount: Int,
)

data class DatasetAnalysisResult(
  val datasetId: Int,
  val version: Int,
  val totalIssues: Int,
  val summary: List<DatasetIssueSummary>,
)

data class DatasetIssueSummary(
  val type: String,
  val count: Int,
  val severity: String,
)

data class DatasetApplyResult(
  val affectedCount: Int,
  val versionNumber: Int,
  val message: String?,
)

class DatasetApi(private val apiClient: ApiClient) {
  suspend fun upload(fileName: String, bytes: ByteArray): Result<DatasetUploadResult> = runCatching {
    val response = apiClient.uploadMultipart("/datasets/upload", fileName, bytes)
    DatasetUploadResult(
      datasetId = response.getInt("dataset_id"),
      name = response.getString("name"),
      format = response.optString("format", "txt"),
      rowCount = response.optInt("row_count", 0),
    )
  }

  suspend fun analyze(datasetId: Int): Result<DatasetAnalysisResult> = runCatching {
    val response = apiClient.post("/datasets/$datasetId/analyze", JSONObject())
    val summary = mutableListOf<DatasetIssueSummary>()
    val summaryArray = response.optJSONArray("summary") ?: org.json.JSONArray()
    for (index in 0 until summaryArray.length()) {
      val item = summaryArray.getJSONObject(index)
      summary.add(
        DatasetIssueSummary(
          type = item.optString("type", "unknown"),
          count = item.optInt("count", 0),
          severity = item.optString("severity", "medium"),
        ),
      )
    }
    DatasetAnalysisResult(
      datasetId = response.optInt("dataset_id", datasetId),
      version = response.optInt("version", 1),
      totalIssues = response.optInt("total_issues", 0),
      summary = summary,
    )
  }

  suspend fun applyAllSuggestions(datasetId: Int, issueTypes: List<String>): Result<DatasetApplyResult> = runCatching {
    val types = org.json.JSONArray()
    issueTypes.forEach { types.put(it) }
    val response = apiClient.post(
      "/datasets/$datasetId/apply-suggestions",
      JSONObject().put("issue_types", types),
    )
    DatasetApplyResult(
      affectedCount = response.optInt("affected_count", 0),
      versionNumber = response.optInt("version_number", 1),
      message = response.optString("message", null),
    )
  }

  suspend fun downloadClean(datasetId: Int, destination: java.io.File): Result<Unit> =
    apiClient.downloadToFile("/datasets/$datasetId/download?mode=clean", destination)
}
