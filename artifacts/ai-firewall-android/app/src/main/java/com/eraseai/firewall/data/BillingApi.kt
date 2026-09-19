package com.eraseai.firewall.data

import org.json.JSONObject

data class PlayProduct(
  val productId: String,
  val plan: String,
  val billingPeriod: String,
  val name: String,
)

class BillingApi(private val apiClient: ApiClient) {
  suspend fun playProducts(): Result<List<PlayProduct>> = runCatching {
    // Prefer authenticated request; endpoint is also public as a fallback.
    val response = runCatching { apiClient.get("/mobile/play/products", includeAuth = true) }
      .getOrElse { apiClient.get("/mobile/play/products", includeAuth = false) }
    val products = response.optJSONArray("products") ?: return@runCatching emptyList()
    buildList {
      for (index in 0 until products.length()) {
        val product = products.getJSONObject(index)
        add(
          PlayProduct(
            productId = product.getString("product_id"),
            plan = product.optString("plan", "personal"),
            billingPeriod = product.optString("billing_period", "monthly"),
            name = product.optString("name", product.getString("product_id")),
          ),
        )
      }
    }
  }

  suspend fun verifyPlayPurchase(productId: String, purchaseToken: String): Result<Unit> = runCatching {
    apiClient.post(
      "/mobile/play/verify",
      JSONObject()
        .put("productId", productId)
        .put("purchaseToken", purchaseToken)
        .put("packageName", "com.eraseai.firewall"),
    )
    Unit
  }
}
