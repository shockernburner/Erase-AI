package com.eraseai.firewall.billing

import android.app.Activity
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.eraseai.firewall.data.BillingApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class PlayBillingManager(
  private val activity: Activity,
  private val billingApi: BillingApi,
  private val scope: CoroutineScope,
  private val onStatus: (String) -> Unit,
  private val onError: (String) -> Unit,
  private val onEntitlementRefresh: () -> Unit,
) : PurchasesUpdatedListener {
  private val billingClient: BillingClient = BillingClient.newBuilder(activity)
    .setListener(this)
    .enablePendingPurchases(
      PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
    )
    .build()

  private var connected = false
  private var connecting = false
  private val pendingProductIds = mutableListOf<String>()

  fun connect() {
    if (connected || connecting) return
    connecting = true
    billingClient.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(result: BillingResult) {
        connecting = false
        connected = result.responseCode == BillingClient.BillingResponseCode.OK
        if (!connected) {
          onError("Google Play Billing is unavailable (${result.debugMessage})")
        }
      }

      override fun onBillingServiceDisconnected() {
        connected = false
      }
    })
  }

  fun purchase(productId: String) {
    pendingProductIds.clear()
    pendingProductIds += productId
    onStatus("Opening Google Play checkout…")
    ensureConnected {
      queryAndLaunch(listOf(productId))
    }
  }

  fun restorePurchases() {
    onStatus("Checking Google Play subscriptions…")
    ensureConnected {
      billingClient.queryPurchasesAsync(
        com.android.billingclient.api.QueryPurchasesParams.newBuilder()
          .setProductType(BillingClient.ProductType.SUBS)
          .build(),
      ) { result, purchases ->
        if (result.responseCode != BillingClient.BillingResponseCode.OK) {
          onError("Could not restore Google Play purchases")
          return@queryPurchasesAsync
        }
        if (purchases.isEmpty()) {
          onStatus("No active Google Play subscriptions found")
          return@queryPurchasesAsync
        }
        purchases.forEach { handlePurchase(it) }
      }
    }
  }

  override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
    if (result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
      onStatus("Google Play checkout cancelled")
      return
    }
    if (result.responseCode != BillingClient.BillingResponseCode.OK || purchases.isNullOrEmpty()) {
      onError("Google Play purchase failed (${result.debugMessage})")
      return
    }
    purchases.forEach { handlePurchase(it) }
  }

  private fun handlePurchase(purchase: Purchase) {
    if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
    val productId = purchase.products.firstOrNull() ?: return
    scope.launch {
      billingApi.verifyPlayPurchase(productId, purchase.purchaseToken)
        .onSuccess {
          if (!purchase.isAcknowledged) {
            acknowledge(purchase)
          }
          onStatus("Subscription active via Google Play")
          onEntitlementRefresh()
        }
        .onFailure { onError(it.message ?: "Could not verify Google Play purchase") }
    }
  }

  private fun acknowledge(purchase: Purchase) {
    val params = AcknowledgePurchaseParams.newBuilder()
      .setPurchaseToken(purchase.purchaseToken)
      .build()
    billingClient.acknowledgePurchase(params) { }
  }

  private fun ensureConnected(onReady: () -> Unit) {
    if (connected) {
      onReady()
      return
    }
    connect()
    billingClient.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(result: BillingResult) {
        connected = result.responseCode == BillingClient.BillingResponseCode.OK
        if (connected) onReady() else onError("Google Play Billing is unavailable")
      }

      override fun onBillingServiceDisconnected() {
        connected = false
      }
    })
  }

  private fun queryAndLaunch(productIds: List<String>) {
    scope.launch {
      val details = queryProductDetails(productIds)
      if (details.isEmpty()) {
        onError("Subscription is not configured in Google Play Console yet")
        return@launch
      }
      val productDetails = details.first()
      val offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken
      if (offerToken.isNullOrBlank()) {
        onError("No Google Play offer is available for this subscription")
        return@launch
      }
      val params = BillingFlowParams.newBuilder()
        .setProductDetailsParamsList(
          listOf(
            BillingFlowParams.ProductDetailsParams.newBuilder()
              .setProductDetails(productDetails)
              .setOfferToken(offerToken)
              .build(),
          ),
        )
        .build()
      val launchResult = billingClient.launchBillingFlow(activity, params)
      if (launchResult.responseCode != BillingClient.BillingResponseCode.OK) {
        onError("Could not open Google Play checkout")
      }
    }
  }

  private suspend fun queryProductDetails(productIds: List<String>): List<ProductDetails> =
    suspendCancellableCoroutine { continuation ->
      val params = QueryProductDetailsParams.newBuilder()
        .setProductList(
          productIds.map { productId ->
            QueryProductDetailsParams.Product.newBuilder()
              .setProductId(productId)
              .setProductType(BillingClient.ProductType.SUBS)
              .build()
          },
        )
        .build()
      billingClient.queryProductDetailsAsync(params) { result, productDetailsList ->
        if (result.responseCode == BillingClient.BillingResponseCode.OK) {
          continuation.resume(productDetailsList)
        } else {
          continuation.resume(emptyList())
        }
      }
    }

  fun destroy() {
    if (billingClient.isReady) billingClient.endConnection()
  }
}
