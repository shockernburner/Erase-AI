package com.eraseai.firewall.data

import com.eraseai.firewall.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

sealed class ApiError(message: String) : Exception(message) {
  class Unauthorized : ApiError("Please sign in again.")
  class UpgradeRequired(message: String) : ApiError(message)
  class NotFound(message: String) : ApiError(message)
  class Network(message: String) : ApiError(message)
  class Server(message: String) : ApiError(message)
}

class ApiClient(private val sessionStore: MobileSessionStore) {
  private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
  private val client = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(20, TimeUnit.SECONDS)
    .writeTimeout(20, TimeUnit.SECONDS)
    .build()

  suspend fun get(path: String, includeAuth: Boolean = true): JSONObject = request("GET", path, null, includeAuth)

  suspend fun mobileHealth(): JSONObject = get("/mobile/health", includeAuth = false)

  suspend fun post(path: String, body: JSONObject, includeAuth: Boolean = true): JSONObject =
    request("POST", path, body, includeAuth)

  suspend fun uploadMultipart(path: String, fileName: String, bytes: ByteArray, mimeType: String = "application/octet-stream"): JSONObject =
    withContext(Dispatchers.IO) {
      val requestBuilder = Request.Builder()
        .url("${BuildConfig.API_BASE_URL}$path")
        .header("Accept", "application/json")

      sessionStore.getToken()?.let { requestBuilder.header("Authorization", "Bearer $it") }

      val body = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart(
          "file",
          fileName,
          bytes.toRequestBody(mimeType.toMediaType()),
        )
        .build()

      val response = try {
        client.newCall(requestBuilder.post(body).build()).execute()
      } catch (err: IOException) {
        throw ApiError.Network("Network unavailable. Check your connection and try again.")
      }

      response.use {
        val responseText = it.body?.string().orEmpty()
        val responseJson = responseText.takeIf { text -> text.isNotBlank() }?.let(::JSONObject) ?: JSONObject()
        if (it.isSuccessful) return@withContext responseJson

        val message = responseJson.optString("message", responseJson.optString("error", "Request failed"))
        throw when (it.code) {
          401 -> ApiError.Unauthorized()
          403, 429 -> ApiError.UpgradeRequired(message)
          404 -> ApiError.NotFound(message)
          409 -> ApiError.Server(message.ifBlank { "An account with this email already exists. Sign in instead." })
          in 500..599 -> ApiError.Server(
            message.takeIf { msg -> msg.isNotBlank() && !msg.contains("An error occurred", ignoreCase = true) }
              ?: "EraseAI is temporarily unavailable. Please try again.",
          )
          else -> ApiError.Server(message)
        }
      }
    }

  suspend fun downloadToFile(path: String, destination: java.io.File): Result<Unit> = runCatching {
    withContext(Dispatchers.IO) {
      val requestBuilder = Request.Builder()
        .url("${BuildConfig.API_BASE_URL}$path")
        .header("Accept", "*/*")
      sessionStore.getToken()?.let { requestBuilder.header("Authorization", "Bearer $it") }
      val response = client.newCall(requestBuilder.get().build()).execute()
      response.use {
        if (!it.isSuccessful) throw ApiError.Server("Download failed")
        val body = it.body ?: throw ApiError.Server("Download failed")
        destination.outputStream().use { out -> body.byteStream().copyTo(out) }
      }
    }
  }

  private suspend fun request(
    method: String,
    path: String,
    body: JSONObject?,
    includeAuth: Boolean = true,
  ): JSONObject = withContext(Dispatchers.IO) {
    val requestBuilder = Request.Builder()
      .url("${BuildConfig.API_BASE_URL}$path")
      .header("Accept", "application/json")

    if (includeAuth) {
      sessionStore.getToken()?.let { requestBuilder.header("Authorization", "Bearer $it") }
    }

    val request = when (method) {
      "POST" -> requestBuilder.post((body ?: JSONObject()).toString().toRequestBody(jsonMediaType)).build()
      else -> requestBuilder.get().build()
    }

    val response = try {
      client.newCall(request).execute()
    } catch (err: IOException) {
      throw ApiError.Network("Network unavailable. Check your connection and try again.")
    }

    response.use {
      val responseText = it.body?.string().orEmpty()
      val responseJson = responseText.takeIf { text -> text.isNotBlank() }?.let(::JSONObject) ?: JSONObject()
      if (it.isSuccessful) return@withContext responseJson

      val message = responseJson.optString("message", responseJson.optString("error", "Request failed"))
      throw when (it.code) {
        401 -> ApiError.Unauthorized()
        403, 429 -> ApiError.UpgradeRequired(message)
        404 -> ApiError.NotFound(message)
        409 -> ApiError.Server(message.ifBlank { "An account with this email already exists. Sign in instead." })
        in 500..599 -> ApiError.Server(
          message.takeIf { msg -> msg.isNotBlank() && !msg.contains("An error occurred", ignoreCase = true) }
            ?: "EraseAI is temporarily unavailable. Please try again.",
        )
        else -> ApiError.Server(message)
      }
    }
  }
}