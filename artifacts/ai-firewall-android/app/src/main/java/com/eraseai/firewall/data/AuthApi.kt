package com.eraseai.firewall.data

import org.json.JSONObject

data class MobileAuthResult(
  val token: String,
  val userId: String,
  val planType: String,
)

class AuthApi(
  private val apiClient: ApiClient,
  private val sessionStore: MobileSessionStore,
) {
  suspend fun login(email: String, password: String): Result<MobileAuthResult> {
    val payload = JSONObject()
      .put("email", email)
      .put("password", password)
    return postForSession("/mobile-auth/login", payload)
  }

  suspend fun signup(
    email: String,
    password: String,
    firstName: String?,
    lastName: String?,
  ): Result<MobileAuthResult> {
    val payload = JSONObject()
      .put("email", email)
      .put("password", password)
    if (!firstName.isNullOrBlank()) payload.put("firstName", firstName)
    if (!lastName.isNullOrBlank()) payload.put("lastName", lastName)
    return postForSession("/mobile-auth/signup", payload)
  }

  /** Ensures terms are accepted for existing accounts created before mobile auto-accept. */
  suspend fun acceptTerms(): Result<Unit> = runCatching {
    apiClient.post("/auth/accept-terms", JSONObject())
    Unit
  }

  /**
   * Joins the signed-in person to the organization whose enrollment token IT set in managed
   * configuration (see ManagedConfig). The server checks the email domain and seats, and answers
   * the same when they're already a member. Returns the organization's name.
   */
  suspend fun enrollInOrganization(enrollmentToken: String): Result<String> = runCatching {
    val payload = JSONObject()
      .put("token", enrollmentToken)
      .put("client", "android")
    val json = apiClient.post("/org/enroll", payload)
    json.optJSONObject("organization")?.optString("name").orEmpty()
  }

  suspend fun logout(): Result<Unit> = runCatching {
    runCatching { apiClient.post("/mobile-auth/logout", JSONObject()) }
    sessionStore.clear()
  }

  private suspend fun postForSession(path: String, payload: JSONObject): Result<MobileAuthResult> = runCatching {
    val json = apiClient.post(path, payload, includeAuth = false)
    val user = json.getJSONObject("user")
    val result = MobileAuthResult(
      token = json.getString("token"),
      userId = user.getString("id"),
      planType = user.optString("planType", "free"),
    )
    sessionStore.saveSession(result.token, result.userId, result.planType)
    // Best-effort for older accounts; signup/login already stamp terms on the server.
    runCatching { acceptTerms() }
    result
  }
}
