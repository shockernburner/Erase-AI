package com.eraseai.firewall

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.net.VpnService
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import com.eraseai.firewall.billing.PlayBillingManager
import com.eraseai.firewall.data.ApiClient
import com.eraseai.firewall.data.ApiError
import com.eraseai.firewall.data.AuthApi
import com.eraseai.firewall.data.BillingApi
import com.eraseai.firewall.data.DatasetAnalysisResult
import com.eraseai.firewall.data.DatasetApi
import com.eraseai.firewall.data.DatasetUploadResult
import com.eraseai.firewall.data.EntitlementRepository
import com.eraseai.firewall.data.EntitlementState
import com.eraseai.firewall.data.GuestTrial
import com.eraseai.firewall.data.HistoryRepository
import com.eraseai.firewall.data.MobileSessionStore
import com.eraseai.firewall.data.PlayProduct
import com.eraseai.firewall.data.ProtectedApp
import com.eraseai.firewall.data.ProtectedAppsStore
import com.eraseai.firewall.data.ScanApi
import com.eraseai.firewall.data.ScanHistoryItem
import com.eraseai.firewall.data.ScanPiece
import com.eraseai.firewall.data.ScanResult
import com.eraseai.firewall.data.loadInstalledApps
import com.eraseai.firewall.guard.GuardHealth
import com.eraseai.firewall.safe.SafeActivity
import com.eraseai.firewall.guard.GuardStateStore
import com.eraseai.firewall.guard.LocalRiskScanner
import com.eraseai.firewall.ime.ImeGuardHelper
import com.eraseai.firewall.ui.BrandCard
import com.eraseai.firewall.ui.BrandChipButton
import com.eraseai.firewall.ui.BrandErrorBanner
import com.eraseai.firewall.ui.BrandField
import com.eraseai.firewall.ui.BrandHero
import com.eraseai.firewall.ui.BrandPrimaryButton
import com.eraseai.firewall.ui.BrandSecondaryButton
import com.eraseai.firewall.ui.BrandSectionLabel
import com.eraseai.firewall.ui.BrandStatRow
import com.eraseai.firewall.ui.BrandStatusBanner
import com.eraseai.firewall.ui.BrandTextButton
import com.eraseai.firewall.ui.BrandedSplashScreen
import com.eraseai.firewall.ui.DatasetSanitizerScreen
import com.eraseai.firewall.ui.theme.BrandBackground
import com.eraseai.firewall.ui.theme.BrandMutedForeground
import com.eraseai.firewall.ui.theme.BrandSuccess
import com.eraseai.firewall.ui.theme.EraseAIFirewallTheme
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val MAX_SCAN_TEXT_LENGTH = 5000
private const val SPLASH_MIN_MS = 1800L

private enum class Screen {
  Splash, Login, Dashboard, Subscription, AccessibilityGuide, KeyboardGuide, ProtectedApps,
  ManualScan, History, Settings, Diagnostics, Privacy, DatasetSanitizer,
}

class MainActivity : ComponentActivity() {
  private var pendingSharedText by mutableStateOf<String?>(null)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (intent.action == Intent.ACTION_SEND) {
      pendingSharedText = extractSharedText(intent)
    }
    setContent {
      EraseAIFirewallTheme {
        EraseAIFirewallApp(
          initialSharedText = pendingSharedText,
          onSharedTextConsumed = { pendingSharedText = null },
        )
      }
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (intent.action == Intent.ACTION_SEND) {
      pendingSharedText = extractSharedText(intent)
    }
  }

  private fun extractSharedText(intent: Intent): String? {
    intent.getStringExtra(Intent.EXTRA_TEXT)?.take(MAX_SCAN_TEXT_LENGTH)?.let { return it }
    val uri = if (android.os.Build.VERSION.SDK_INT >= 33) {
      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(Intent.EXTRA_STREAM)
    } ?: return null
    return runCatching {
      contentResolver.openInputStream(uri)?.use { stream ->
        BufferedReader(InputStreamReader(stream)).readText().take(MAX_SCAN_TEXT_LENGTH)
      }
    }.getOrNull()
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EraseAIFirewallApp(
  initialSharedText: String?,
  onSharedTextConsumed: () -> Unit,
) {
  val context = LocalContext.current
  val activity = context as ComponentActivity
  val scope = rememberCoroutineScope()
  val sessionStore = remember { MobileSessionStore(context) }
  val apiClient = remember { ApiClient(sessionStore) }
  val authApi = remember { AuthApi(apiClient, sessionStore) }
  val scanApi = remember { ScanApi(apiClient) }
  val datasetApi = remember { DatasetApi(apiClient) }
  val billingApi = remember { BillingApi(apiClient) }
  val entitlementRepo = remember { EntitlementRepository(apiClient) }
  val historyRepo = remember { HistoryRepository(apiClient) }
  val protectedStore = remember { ProtectedAppsStore(context) }
  val guestTrial = remember { GuestTrial(context) }

  var screen by remember { mutableStateOf(Screen.Splash) }
  var entitlement by remember { mutableStateOf<EntitlementState?>(null) }
  var signedIn by remember { mutableStateOf(!sessionStore.getToken().isNullOrBlank()) }
  var loading by remember { mutableStateOf(false) }
  var error by remember { mutableStateOf<String?>(null) }
  var apps by remember { mutableStateOf(loadInstalledApps(context)) }
  var selectedPackages by remember { mutableStateOf(protectedStore.getSelectedPackages()) }
  var firewallEnabled by remember { mutableStateOf(protectedStore.isFirewallEnabled()) }
  var accessibilityEnabled by remember { mutableStateOf(isAccessibilityEnabled(context)) }
  var keyboardEnabled by remember { mutableStateOf(ImeGuardHelper.isEraseAiKeyboardEnabled(context)) }
  var keyboardSelected by remember { mutableStateOf(ImeGuardHelper.isEraseAiKeyboardSelected(context)) }
  var strictEgressEnabled by remember { mutableStateOf(GuardStateStore.isStrictEgressEnabled()) }
  val accessibilityRunning by GuardHealth.accessibilityRunning.collectAsState()
  // Re-read on a timer only while the bind grace window is open, so STARTING can age into STALLED.
  var healthTick by remember { mutableStateOf(0) }
  val accessibilityStatus = remember(accessibilityEnabled, accessibilityRunning, healthTick) {
    GuardHealth.accessibilityStatus(accessibilityEnabled)
  }
  var egressStatus by remember { mutableStateOf(GuardHealth.egressStatus(context)) }
  var showVpnConflictDialog by remember { mutableStateOf(false) }
  var history by remember { mutableStateOf<List<ScanHistoryItem>>(emptyList()) }
  var manualText by remember { mutableStateOf(initialSharedText.orEmpty().take(MAX_SCAN_TEXT_LENGTH)) }
  var scanResult by remember { mutableStateOf<ScanResult?>(null) }
  var redactedText by remember { mutableStateOf<String?>(null) }
  var backendStatus by remember { mutableStateOf("Not checked") }
  var playProducts by remember { mutableStateOf<List<PlayProduct>>(emptyList()) }
  var billingPeriod by remember { mutableStateOf("monthly") }
  var billingMessage by remember { mutableStateOf<String?>(null) }
  var attachmentPieces by remember { mutableStateOf<List<ScanPiece>>(emptyList()) }
  var multiScanResult by remember { mutableStateOf<ScanResult?>(null) }
  var datasetUpload by remember { mutableStateOf<DatasetUploadResult?>(null) }
  var datasetAnalysis by remember { mutableStateOf<DatasetAnalysisResult?>(null) }
  var datasetStatus by remember { mutableStateOf<String?>(null) }
  var datasetDownload by remember { mutableStateOf<File?>(null) }

  fun refreshAccessibility() {
    accessibilityEnabled = isAccessibilityEnabled(context)
    firewallEnabled = protectedStore.isFirewallEnabled()
    keyboardEnabled = ImeGuardHelper.isEraseAiKeyboardEnabled(context)
    keyboardSelected = ImeGuardHelper.isEraseAiKeyboardSelected(context)
    strictEgressEnabled = GuardStateStore.isStrictEgressEnabled()
    egressStatus = GuardHealth.egressStatus(context)
    healthTick++
  }

  LaunchedEffect(accessibilityStatus, healthTick) {
    if (accessibilityStatus == GuardHealth.AccessibilityStatus.STARTING) {
      kotlinx.coroutines.delay(HEALTH_RECHECK_MS)
      healthTick++
    }
  }

  var pendingStrictEgressEnable by remember { mutableStateOf(false) }

  val vpnPermissionLauncher = rememberLauncherForActivityResult(
    ActivityResultContracts.StartActivityForResult(),
  ) { result ->
    if (result.resultCode == Activity.RESULT_OK) {
      GuardStateStore.setStrictEgressEnabled(true)
      strictEgressEnabled = true
      pendingStrictEgressEnable = false
    }
    egressStatus = GuardHealth.egressStatus(context)
  }

  val notificationPermissionLauncher = rememberLauncherForActivityResult(
    ActivityResultContracts.RequestPermission(),
  ) { granted ->
    if (granted && pendingStrictEgressEnable) {
      val prepare = VpnService.prepare(context)
      if (prepare == null) {
        GuardStateStore.setStrictEgressEnabled(true)
        strictEgressEnabled = true
        pendingStrictEgressEnable = false
      } else {
        vpnPermissionLauncher.launch(prepare)
      }
    } else {
      pendingStrictEgressEnable = false
    }
  }

  fun enableStrictEgressGate() {
    val prepare = VpnService.prepare(context)
    if (prepare == null) {
      GuardStateStore.setStrictEgressEnabled(true)
      strictEgressEnabled = true
      pendingStrictEgressEnable = false
      egressStatus = GuardHealth.egressStatus(context)
    } else {
      vpnPermissionLauncher.launch(prepare)
    }
  }

  fun requestStrictEgress() {
    pendingStrictEgressEnable = true
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    } else {
      enableStrictEgressGate()
    }
  }

  // Granting VPN consent makes EraseAI the device's VPN app, which disconnects whatever VPN is
  // running now — a work VPN or a privacy VPN the user relies on. They must choose that knowingly.
  fun startStrictEgressFlow() {
    if (GuardHealth.otherVpnActive(context)) {
      showVpnConflictDialog = true
    } else {
      requestStrictEgress()
    }
  }

  if (showVpnConflictDialog) {
    AlertDialog(
      onDismissRequest = { showVpnConflictDialog = false },
      title = { Text("Another VPN is connected") },
      text = {
        Text(
          "Android runs one VPN at a time. Turning on the Strict network gate makes EraseAI " +
            "the VPN app and disconnects the VPN you are using now. While that other VPN is " +
            "connected later, the Strict gate cannot run.",
        )
      },
      confirmButton = {
        TextButton(onClick = {
          showVpnConflictDialog = false
          requestStrictEgress()
        }) { Text("Continue") }
      },
      dismissButton = {
        TextButton(onClick = { showVpnConflictDialog = false }) { Text("Keep my VPN") }
      },
    )
  }

  LaunchedEffect(Unit) {
    GuardStateStore.init(context)
  }

  val datasetPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri == null) return@rememberLauncherForActivityResult
    scope.launch {
      loading = true
      error = null
      datasetStatus = null
      datasetAnalysis = null
      datasetDownload = null
      runCatching {
        val name = uri.lastPathSegment?.substringAfterLast('/') ?: "dataset.txt"
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
          ?: throw IllegalStateException("Could not read file")
        datasetApi.upload(name, bytes).getOrThrow()
      }.onSuccess {
        datasetUpload = it
        datasetStatus = "Uploaded ${it.rowCount} rows"
      }.onFailure {
        error = it.safeMessage()
        protectedStore.saveLastErrorCategory(it.errorCategory())
      }
      loading = false
    }
  }

  val attachmentPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri == null) return@rememberLauncherForActivityResult
    scope.launch {
      runCatching {
        val name = uri.lastPathSegment?.substringAfterLast('/') ?: "attachment.txt"
        val text = context.contentResolver.openInputStream(uri)?.use { stream ->
          BufferedReader(InputStreamReader(stream)).readText().take(MAX_SCAN_TEXT_LENGTH)
        }.orEmpty()
        if (text.isBlank()) {
          attachmentPieces = attachmentPieces + ScanPiece(
            source = "file:$name",
            label = name,
            text = "",
            skipReason = "File content not readable as text ($name). Review before sending.",
          )
        } else {
          attachmentPieces = attachmentPieces + ScanPiece(source = "file:$name", label = name, text = text)
        }
      }.onFailure { error = it.safeMessage() }
    }
  }

  fun refreshEntitlement() {
    if (!signedIn) return
    scope.launch {
      loading = true
      error = null
      entitlementRepo.load()
        .onSuccess {
          entitlement = it
          protectedStore.saveLastErrorCategory("none")
        }
        .onFailure {
          error = it.safeMessage()
          protectedStore.saveLastErrorCategory(it.errorCategory())
        }
      loading = false
    }
  }

  val playBilling = remember(activity, billingApi, scope) {
    PlayBillingManager(
      activity = activity,
      billingApi = billingApi,
      scope = scope,
      onStatus = { billingMessage = it },
      onError = { error = it },
      onEntitlementRefresh = { refreshEntitlement() },
    )
  }

  DisposableEffect(playBilling) {
    playBilling.connect()
    onDispose { playBilling.destroy() }
  }

  fun refreshBackendStatus() {
    scope.launch {
      runCatching { apiClient.mobileHealth() }
        .onSuccess { backendStatus = if (it.optBoolean("ok")) "Reachable" else "Unavailable" }
        .onFailure {
          backendStatus = "Unavailable"
          protectedStore.saveLastErrorCategory(it.errorCategory())
        }
    }
  }

  fun loadPlayProducts() {
    scope.launch {
      billingApi.playProducts()
        .onSuccess { playProducts = it }
        .onFailure {
          billingMessage = it.safeMessage()
          protectedStore.saveLastErrorCategory(it.errorCategory())
        }
    }
  }

  fun purchaseProduct(productId: String) {
    error = null
    billingMessage = null
    playBilling.purchase(productId)
  }

  fun openPlaySubscriptions() {
    openUrl(context, entitlement?.playManageUrl ?: BuildConfig.PLAY_MANAGE_URL)
  }

  fun setFirewallScanning(enabled: Boolean) {
    val a11yOn = isAccessibilityEnabled(context)
    accessibilityEnabled = a11yOn
    if (enabled && !a11yOn) {
      error = "Turn on Accessibility for EraseAI Firewall first."
      screen = Screen.AccessibilityGuide
      return
    }
    firewallEnabled = enabled
    protectedStore.setFirewallEnabled(enabled)
    scope.launch { protectedStore.pushToBackend(apiClient) }
    error = null
  }

  DisposableEffect(Unit) {
    val lifecycleOwner = context as? LifecycleOwner
    val observer = LifecycleEventObserver { _, event ->
      if (event == Lifecycle.Event.ON_RESUME) {
        refreshAccessibility()
        GuardStateStore.refreshEgressGate()
        refreshEntitlement()
      }
    }
    lifecycleOwner?.lifecycle?.addObserver(observer)
    onDispose { lifecycleOwner?.lifecycle?.removeObserver(observer) }
  }

  LaunchedEffect(Unit) {
    val started = System.currentTimeMillis()
    loadPlayProducts()
    val next = if (!signedIn) {
      if (guestTrial.hasStarted()) Screen.Dashboard else Screen.Login
    } else {
      refreshEntitlement()
      refreshBackendStatus()
      val mergedPackages = protectedStore.mergeFromBackend(apiClient).getOrNull()
      if (mergedPackages != null) {
        selectedPackages = mergedPackages
        firewallEnabled = protectedStore.isFirewallEnabled()
        protectedStore.pushToBackend(apiClient)
      }
      if (initialSharedText.isNullOrBlank()) Screen.Dashboard else Screen.ManualScan
    }
    refreshAccessibility()
    val elapsed = System.currentTimeMillis() - started
    if (elapsed < SPLASH_MIN_MS) delay(SPLASH_MIN_MS - elapsed)
    screen = next
  }

  LaunchedEffect(initialSharedText) {
    if (!initialSharedText.isNullOrBlank()) {
      manualText = initialSharedText.take(MAX_SCAN_TEXT_LENGTH)
      if ((signedIn || guestTrial.hasStarted()) && screen != Screen.Splash) {
        screen = Screen.ManualScan
      }
      onSharedTextConsumed()
    }
  }

  val hideTopBar = screen == Screen.Splash

  Scaffold(
    containerColor = BrandBackground,
    topBar = {
      if (!hideTopBar) {
        TopAppBar(
          title = {
            Text(
              screen.title(),
              style = MaterialTheme.typography.titleLarge,
            )
          },
          navigationIcon = {
            val atRoot = screen == Screen.Dashboard || (screen == Screen.Login && !guestTrial.hasStarted())
            if (!atRoot) {
              IconButton(onClick = { screen = Screen.Dashboard }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
              }
            }
          },
          colors = TopAppBarDefaults.topAppBarColors(
            containerColor = BrandBackground,
            titleContentColor = MaterialTheme.colorScheme.onBackground,
            navigationIconContentColor = MaterialTheme.colorScheme.onBackground,
            actionIconContentColor = MaterialTheme.colorScheme.onBackground,
          ),
        )
      }
    },
  ) { padding ->
    Surface(
      modifier = Modifier.fillMaxSize().padding(padding),
      color = BrandBackground,
    ) {
      when (screen) {
        Screen.Splash -> BrandedSplashScreen()
        Screen.Login -> LoginScreen(
          loading = loading,
          error = error,
          guestTrialAvailable = !guestTrial.hasStarted(),
          guestTrialEnded = guestTrial.isExpired(),
          onTryWithoutAccount = {
            guestTrial.start()
            error = null
            refreshAccessibility()
            screen = Screen.Dashboard
          },
          onLogin = { email, password ->
          scope.launch {
            loading = true
            error = null
            authApi.login(email, password).onSuccess {
              signedIn = true
              refreshEntitlement()
              refreshBackendStatus()
              loadPlayProducts()
              refreshAccessibility()
              screen = Screen.Dashboard
            }.onFailure {
              error = it.safeMessage()
              protectedStore.saveLastErrorCategory(it.errorCategory())
            }
            loading = false
          }
        }, onSignup = { email, password ->
          scope.launch {
            loading = true
            error = null
            authApi.signup(email, password, null, null).onSuccess {
              signedIn = true
              refreshEntitlement()
              refreshBackendStatus()
              loadPlayProducts()
              screen = Screen.Privacy
            }.onFailure {
              error = it.safeMessage()
              protectedStore.saveLastErrorCategory(it.errorCategory())
            }
            loading = false
          }
        })
        Screen.Dashboard -> DashboardScreen(
          entitlement = entitlement,
          guestDaysLeft = if (signedIn) null else guestTrial.daysLeft(),
          onCreateAccount = { screen = Screen.Login },
          loading = loading,
          accessibilityEnabled = accessibilityEnabled,
          accessibilityStatus = accessibilityStatus,
          egressStatus = egressStatus,
          keyboardSelected = keyboardSelected,
          firewallEnabled = firewallEnabled,
          protectedAppsCount = selectedPackages.size,
          lastScan = protectedStore.getLastScanSummary(),
          error = error,
          onRefresh = {
            refreshAccessibility()
            refreshEntitlement()
          },
          onToggleFirewall = { enabled -> setFirewallScanning(enabled) },
          onEnable = {
            refreshAccessibility()
            screen = Screen.AccessibilityGuide
          },
          onKeyboard = {
            refreshAccessibility()
            screen = Screen.KeyboardGuide
          },
          onApps = {
            apps = loadInstalledApps(context)
            screen = Screen.ProtectedApps
          },
          onManual = { screen = Screen.ManualScan },
          onDatasetSanitizer = { screen = Screen.DatasetSanitizer },
          onSafeFiles = { context.startActivity(Intent(context, SafeActivity::class.java)) },
          onBilling = { screen = if (signedIn) Screen.Subscription else Screen.Login },
          onHistory = {
            scope.launch {
              loading = true
              val local = protectedStore.getLocalScans()
              val remote = historyRepo.load().getOrElse { emptyList() }
              history = (local + remote).distinctBy { "${it.createdAt}|${it.content}" }
              screen = Screen.History
              loading = false
            }
          },
          onSettings = { screen = Screen.Settings },
          onPrivacy = { screen = Screen.Privacy },
        )
        Screen.Subscription -> SubscriptionScreen(
          entitlement = entitlement,
          products = playProducts.filter { it.billingPeriod == billingPeriod },
          billingPeriod = billingPeriod,
          loading = loading,
          error = error,
          message = billingMessage,
          onPeriodChange = { billingPeriod = it },
          onPurchase = { productId -> purchaseProduct(productId) },
          onRestore = { playBilling.restorePurchases() },
          onManageInPlay = { openPlaySubscriptions() },
          onRefresh = {
            refreshEntitlement()
            loadPlayProducts()
          },
        )
        Screen.AccessibilityGuide -> AccessibilityGuideScreen(
          enabled = accessibilityEnabled,
          onOpenSettings = {
            context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
          },
          onChooseApps = {
            apps = loadInstalledApps(context)
            screen = Screen.ProtectedApps
          },
          onDone = {
            refreshAccessibility()
            if (isAccessibilityEnabled(context) && !protectedStore.isFirewallEnabled()) {
              setFirewallScanning(true)
            }
            screen = Screen.Dashboard
          },
        )
        Screen.KeyboardGuide -> KeyboardGuideScreen(
          enabled = keyboardEnabled,
          selected = keyboardSelected,
          onOpenSettings = { ImeGuardHelper.openKeyboardSettings(context) },
          onPickKeyboard = { ImeGuardHelper.showKeyboardPicker(context) },
          onDone = {
            refreshAccessibility()
            screen = Screen.Dashboard
          },
        )
        Screen.ProtectedApps -> ProtectedAppsScreen(apps, selectedPackages) { packageName ->
          selectedPackages = if (selectedPackages.contains(packageName)) {
            selectedPackages - packageName
          } else {
            selectedPackages + packageName
          }
          protectedStore.setSelectedPackages(selectedPackages)
          selectedPackages = protectedStore.getSelectedPackages()
          scope.launch { protectedStore.pushToBackend(apiClient) }
        }
        Screen.ManualScan -> ManualScanScreen(
          manualText,
          scanResult ?: multiScanResult,
          redactedText,
          loading,
          error,
          entitlement,
          attachmentPieces,
          onTextChange = {
            manualText = it.take(MAX_SCAN_TEXT_LENGTH)
            scanResult = null
            multiScanResult = null
            redactedText = null
          },
          onAddAttachment = { attachmentPicker.launch("*/*") },
          onClearAttachments = { attachmentPieces = emptyList() },
          onScan = {
            scope.launch {
              loading = true
              error = null
              redactedText = null
              val scanText = manualText.take(MAX_SCAN_TEXT_LENGTH)
              manualText = scanText
              if (!signedIn) {
                // Guests get the on-device rules, the same ones that run in the AI apps.
                val local = LocalRiskScanner.scan(scanText)
                scanResult = local.toScanResult(scanText)
                multiScanResult = null
                protectedStore.saveLastScanSummary(local.summary(), local.level)
                if (local.findings.isNotEmpty()) redactedText = LocalRiskScanner.redact(scanText)
                if (attachmentPieces.isNotEmpty()) error = "Attachments are scanned with an account. The text above was checked on this phone."
              } else if (attachmentPieces.isEmpty()) {
                scanApi.scan(scanText, source = "android_share_or_manual").onSuccess { result ->
                  scanResult = result
                  multiScanResult = null
                  protectedStore.saveLastScanSummary(result.summary(), result.diagnosticsType())
                  if (result.findings.isNotEmpty() && entitlement?.redaction == true) {
                    scanApi.rewrite(scanText, result.findings).onSuccess { redactedText = it }
                      .onFailure {
                        error = it.safeMessage()
                        protectedStore.saveLastErrorCategory(it.errorCategory())
                      }
                  }
                  refreshEntitlement()
                }.onFailure {
                  error = it.safeMessage()
                  protectedStore.saveLastErrorCategory(it.errorCategory())
                }
              } else {
                scanApi.scanAttachments(scanText, attachmentPieces, source = "android_share_or_manual").onSuccess { multi ->
                  multiScanResult = multi.result
                  scanResult = null
                  protectedStore.saveLastScanSummary(multi.result.summary(), multi.result.diagnosticsType())
                  if (multi.result.findings.isNotEmpty() && entitlement?.redaction == true) {
                    scanApi.rewrite(scanText, multi.result.findings).onSuccess { redactedText = it }
                      .onFailure {
                        error = it.safeMessage()
                        protectedStore.saveLastErrorCategory(it.errorCategory())
                      }
                  }
                  refreshEntitlement()
                }.onFailure {
                  error = it.safeMessage()
                  protectedStore.saveLastErrorCategory(it.errorCategory())
                }
              }
              loading = false
            }
          },
          onLoadSample = {
            manualText = BuildConfig.QA_SAMPLE_TEXT
            scanResult = null
            redactedText = null
            error = null
          },
          onManageBilling = { screen = Screen.Subscription },
        )
        Screen.History -> HistoryScreen(history)
        Screen.Settings -> SettingsScreen(
          BuildConfig.API_BASE_URL,
          BuildConfig.WEB_BASE_URL,
          strictEgressEnabled = strictEgressEnabled,
          egressStatus = egressStatus,
          onStrictEgressChange = { desired ->
            if (!desired) {
              GuardStateStore.setStrictEgressEnabled(false)
              strictEgressEnabled = false
              pendingStrictEgressEnable = false
              egressStatus = GuardHealth.egressStatus(context)
              return@SettingsScreen
            }
            startStrictEgressFlow()
          },
          onReconnectStrictEgress = { startStrictEgressFlow() },
          onBilling = { screen = if (signedIn) Screen.Subscription else Screen.Login },
          onDiagnostics = {
            refreshBackendStatus()
            screen = Screen.Diagnostics
          },
          onPrivacy = { screen = Screen.Privacy },
          onOpenPrivacyPolicy = { openUrl(context, BuildConfig.PRIVACY_URL) },
          signedIn = signedIn,
          onSignIn = { screen = Screen.Login },
          onLogout = {
            scope.launch {
              authApi.logout()
              signedIn = false
              entitlement = null
              scanResult = null
              redactedText = null
              screen = Screen.Login
            }
          },
        )
        Screen.Diagnostics -> DiagnosticsScreen(
          report = buildDiagnosticsReport(
            backendStatus = backendStatus,
            entitlement = entitlement,
            accessibilityEnabled = accessibilityEnabled,
            accessibilityStatus = accessibilityStatus,
            keyboardSelected = keyboardSelected,
            strictEgressEnabled = strictEgressEnabled,
            egressStatus = egressStatus,
            firewallEnabled = firewallEnabled,
            protectedAppsCount = selectedPackages.size,
            lastScanTime = protectedStore.getLastScanTime(),
            lastScanResultType = protectedStore.getLastScanResultType(),
            lastErrorCategory = protectedStore.getLastErrorCategory(),
          ),
          onRefresh = {
            refreshAccessibility()
            refreshBackendStatus()
            refreshEntitlement()
          },
        )
        Screen.Privacy -> PrivacyScreen(
          onContinue = { screen = Screen.Subscription },
          onOpenPolicy = { openUrl(context, BuildConfig.PRIVACY_URL) },
        )
        Screen.DatasetSanitizer -> DatasetSanitizerScreen(
          loading = loading,
          error = error,
          upload = datasetUpload,
          analysis = datasetAnalysis,
          status = datasetStatus,
          downloadedFile = datasetDownload,
          onPickFile = { datasetPicker.launch("*/*") },
          onAnalyze = {
            val upload = datasetUpload ?: return@DatasetSanitizerScreen
            scope.launch {
              loading = true
              error = null
              datasetApi.analyze(upload.datasetId).onSuccess {
                datasetAnalysis = it
                datasetStatus = "Found ${it.totalIssues} issues"
              }.onFailure {
                error = it.safeMessage()
                protectedStore.saveLastErrorCategory(it.errorCategory())
              }
              loading = false
            }
          },
          onApplyFixes = {
            val upload = datasetUpload ?: return@DatasetSanitizerScreen
            val analysis = datasetAnalysis ?: return@DatasetSanitizerScreen
            scope.launch {
              loading = true
              error = null
              val issueTypes = analysis.summary.map { it.type }
              datasetApi.applyAllSuggestions(upload.datasetId, issueTypes).onSuccess {
                datasetStatus = "Applied fixes to ${it.affectedCount} rows (v${it.versionNumber})"
              }.onFailure {
                error = it.safeMessage()
                protectedStore.saveLastErrorCategory(it.errorCategory())
              }
              loading = false
            }
          },
          onDownload = {
            val upload = datasetUpload ?: return@DatasetSanitizerScreen
            scope.launch {
              loading = true
              error = null
              val dir = File(context.cacheDir, "datasets").apply { mkdirs() }
              val destination = File(dir, "${upload.datasetId}_clean.${upload.format}")
              datasetApi.downloadClean(upload.datasetId, destination).onSuccess {
                datasetDownload = destination
                datasetStatus = "Downloaded cleaned file"
              }.onFailure {
                error = it.safeMessage()
                protectedStore.saveLastErrorCategory(it.errorCategory())
              }
              loading = false
            }
          },
          onShareDownload = {},
        )
      }
    }
  }
}

@Composable
private fun LoginScreen(
  loading: Boolean,
  error: String?,
  guestTrialAvailable: Boolean,
  guestTrialEnded: Boolean,
  onTryWithoutAccount: () -> Unit,
  onLogin: (String, String) -> Unit,
  onSignup: (String, String) -> Unit,
) {
  var email by remember { mutableStateOf("") }
  var password by remember { mutableStateOf("") }
  val canSignIn = !loading && email.isNotBlank() && password.isNotBlank()
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(14.dp),
  ) {
    item {
      BrandHero(
        title = "AI Firewall for your phone",
        subtitle = "EraseAI checks what you're about to send in ChatGPT, Gemini, Claude and other AI apps, and stops API keys, passwords and personal data before they leave your phone.",
      )
    }
    if (guestTrialAvailable) {
      item {
        BrandPrimaryButton(
          text = "Try free for ${GuestTrial.DAYS} days, no account",
          onClick = onTryWithoutAccount,
          enabled = !loading,
          icon = Icons.Default.Shield,
        )
      }
      item {
        Text(
          "Checks run on this phone. Create an account any time to keep protection after ${GuestTrial.DAYS} days and add server scanning and history.",
          style = MaterialTheme.typography.bodySmall,
          color = BrandMutedForeground,
        )
      }
      item { BrandSectionLabel("Or sign in") }
    } else if (guestTrialEnded) {
      item {
        BrandErrorBanner("Your ${GuestTrial.DAYS} days without an account have ended. Create a free account or sign in to turn the firewall back on.")
      }
    }
    item { BrandField(email, { email = it }, "Email", singleLine = true) }
    item {
      BrandField(
        password,
        { password = it },
        "Password",
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
      )
    }
    if (error != null) item { BrandErrorBanner(error) }
    item {
      val label = if (loading) "Signing in…" else "Sign In"
      if (guestTrialAvailable) {
        BrandSecondaryButton(label, { onLogin(email.trim(), password) }, enabled = canSignIn, icon = Icons.Default.Lock)
      } else {
        BrandPrimaryButton(label, { onLogin(email.trim(), password) }, enabled = canSignIn, icon = Icons.Default.Lock)
      }
    }
    item {
      BrandSecondaryButton(
        text = "Create Account",
        onClick = { onSignup(email.trim(), password) },
        enabled = !loading && email.isNotBlank() && password.length >= 8,
      )
    }
  }
}

@Composable
private fun DashboardScreen(
  entitlement: EntitlementState?,
  /** Days left of the no-account trial; null when signed in, 0 once it has ended. */
  guestDaysLeft: Int?,
  onCreateAccount: () -> Unit,
  loading: Boolean,
  accessibilityEnabled: Boolean,
  accessibilityStatus: GuardHealth.AccessibilityStatus,
  egressStatus: GuardHealth.EgressStatus,
  keyboardSelected: Boolean,
  firewallEnabled: Boolean,
  protectedAppsCount: Int,
  lastScan: String,
  error: String?,
  onRefresh: () -> Unit,
  onToggleFirewall: (Boolean) -> Unit,
  onEnable: () -> Unit,
  onKeyboard: () -> Unit,
  onApps: () -> Unit,
  onManual: () -> Unit,
  onDatasetSanitizer: () -> Unit,
  onSafeFiles: () -> Unit,
  onBilling: () -> Unit,
  onHistory: () -> Unit,
  onSettings: () -> Unit,
  onPrivacy: () -> Unit,
) {
  val serviceRunning = accessibilityStatus == GuardHealth.AccessibilityStatus.ACTIVE
  val serviceStalled = accessibilityStatus == GuardHealth.AccessibilityStatus.STALLED
  val guestEnded = guestDaysLeft == 0
  val protectionActive = firewallEnabled && serviceRunning && protectedAppsCount > 0 && !guestEnded
  val canUseFirewall = entitlement?.androidFirewall != false && !guestEnded
  val canUseAccessibility = entitlement?.accessibilityFirewall != false

  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(
        title = "EraseAI Firewall",
        subtitle = "Warn, redact, or block risky prompts before they leave selected AI apps.",
        trailing = {
          IconButton(onClick = onSettings) {
            Icon(Icons.Default.Settings, "Settings", tint = BrandMutedForeground)
          }
        },
      )
    }
    if (error != null) item { BrandErrorBanner(error) }

    item {
      BrandStatusBanner(
        title = if (protectionActive) "Protection active" else "Protection incomplete",
        body = when {
          guestEnded ->
            "Your ${GuestTrial.DAYS} days without an account have ended, so EraseAI is not checking anything. " +
              "Create a free account or sign in to turn it back on."
          !accessibilityEnabled -> "Accessibility is off — EraseAI cannot intercept Send yet."
          serviceStalled ->
            "Accessibility is switched on, but Android stopped the EraseAI service, so nothing " +
              "is being checked. Turn EraseAI off and on again in Accessibility settings."
          accessibilityStatus == GuardHealth.AccessibilityStatus.STARTING ->
            "Starting the EraseAI service…"
          protectedAppsCount == 0 -> "No protected apps selected."
          !firewallEnabled -> "Scanning is paused. Turn it back on below."
          else -> "Scanning prompts in $protectedAppsCount protected app(s)."
        },
        active = protectionActive,
      )
    }
    if (guestDaysLeft != null && !guestEnded) {
      item {
        BrandCard {
          Text(
            "No account · $guestDaysLeft ${if (guestDaysLeft == 1) "day" else "days"} left",
            style = MaterialTheme.typography.titleMedium,
          )
          Text(
            "Protection runs on this phone. Create a free account to keep it after the trial, and add server scanning, attachment scanning and history.",
            style = MaterialTheme.typography.bodySmall,
            color = BrandMutedForeground,
          )
          Spacer(modifier = Modifier.height(8.dp))
          BrandSecondaryButton("Create account or sign in", onCreateAccount)
        }
      }
    }

    item {
      BrandStatRow(
        "Accessibility" to when (accessibilityStatus) {
          GuardHealth.AccessibilityStatus.ACTIVE -> "Running"
          GuardHealth.AccessibilityStatus.STARTING -> "Starting…"
          GuardHealth.AccessibilityStatus.STALLED -> "Not running"
          GuardHealth.AccessibilityStatus.OFF -> "Needed"
        },
        "Keyboard" to if (keyboardSelected) "EraseAI" else "System",
      )
    }
    item {
      BrandStatRow(
        "Apps" to protectedAppsCount.toString(),
        "Plan" to when {
          guestEnded -> "Trial ended"
          guestDaysLeft != null -> "No account"
          else -> entitlement?.subscriptionLabel ?: if (loading) "Loading…" else "Unknown"
        },
      )
    }
    item {
      BrandStatRow(
        "Scans" to if (guestDaysLeft != null) "On device" else scansUsed(entitlement),
        "Mode" to if (keyboardSelected) "IME primary" else "Curtain fallback",
      )
    }
    item {
      BrandCard {
        Text("Last action", style = MaterialTheme.typography.labelMedium, color = BrandMutedForeground)
        Text(lastScan.ifBlank { "None yet" }, style = MaterialTheme.typography.bodyMedium)
      }
    }

    item { BrandSectionLabel("Firewall") }
    item {
      BrandCard(highlighted = !accessibilityEnabled) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
          Box(modifier = Modifier.weight(1f)) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
              Text("Firewall scanning", style = MaterialTheme.typography.titleMedium)
              Text(
                if (!accessibilityEnabled) {
                  "Enable Accessibility first, then use this switch to pause/resume."
                } else {
                  "Pause scanning without removing Accessibility permission."
                },
                style = MaterialTheme.typography.bodySmall,
                color = BrandMutedForeground,
              )
            }
          }
          Switch(
            checked = firewallEnabled && accessibilityEnabled && !guestEnded,
            enabled = canUseFirewall,
            onCheckedChange = { desired ->
              if (desired && !accessibilityEnabled) {
                onEnable()
              } else {
                onToggleFirewall(desired)
              }
            },
            colors = SwitchDefaults.colors(
              checkedThumbColor = BrandBackground,
              checkedTrackColor = BrandSuccess,
              uncheckedThumbColor = BrandMutedForeground,
              uncheckedTrackColor = BrandBackground,
            ),
          )
        }
      }
    }

    if (egressStatus == GuardHealth.EgressStatus.OTHER_VPN ||
      egressStatus == GuardHealth.EgressStatus.PERMISSION_LOST
    ) {
      item { BrandErrorBanner(egressStatusMessage(egressStatus)) }
    }

    item {
      when {
        guestEnded -> BrandPrimaryButton(
          text = "Create account or sign in",
          onClick = onCreateAccount,
          icon = Icons.Default.Lock,
        )
        !accessibilityEnabled -> BrandPrimaryButton(
          text = "Enable EraseAI Firewall",
          onClick = onEnable,
          enabled = canUseAccessibility,
          icon = Icons.Default.Shield,
        )
        serviceStalled -> BrandPrimaryButton(
          text = "Restart EraseAI in Accessibility",
          onClick = onEnable,
          icon = Icons.Default.Shield,
        )
        protectedAppsCount == 0 -> BrandPrimaryButton(
          text = "Choose Protected Apps",
          onClick = onApps,
          icon = Icons.Default.Security,
        )
        !firewallEnabled -> BrandPrimaryButton(
          text = "Resume scanning",
          onClick = { onToggleFirewall(true) },
          enabled = canUseFirewall,
          icon = Icons.Default.Shield,
        )
        else -> BrandSecondaryButton(
          text = "Review Accessibility setup",
          onClick = onEnable,
          icon = Icons.Default.Shield,
        )
      }
    }
    if (accessibilityEnabled) {
      item {
        BrandCard(highlighted = !keyboardSelected) {
          Text("EraseAI Keyboard (recommended)", style = MaterialTheme.typography.titleMedium)
          Text(
            if (keyboardSelected) {
              "Input-layer firewall active — typed prompts are held before they reach the AI app."
            } else {
              "Switch to EraseAI Keyboard in ChatGPT/Gemini for send protection that does not depend on send-button UI."
            },
            style = MaterialTheme.typography.bodySmall,
            color = BrandMutedForeground,
          )
        }
      }
      item {
        BrandPrimaryButton(
          text = if (keyboardSelected) "Keyboard setup" else "Enable EraseAI Keyboard",
          onClick = onKeyboard,
          icon = Icons.Default.Security,
        )
      }
    }

    item { BrandSectionLabel("Apps & activity") }
    item { BrandSecondaryButton("Protected Apps", onApps, icon = Icons.Default.Security) }
    item {
      BrandSecondaryButton(
        text = "Scanner History",
        onClick = onHistory,
        enabled = entitlement?.history != false,
        icon = Icons.Default.History,
      )
    }
    item {
      BrandSecondaryButton(
        text = "Trial & Subscription",
        onClick = onBilling,
        icon = Icons.Default.OpenInBrowser,
      )
    }

    item { BrandSectionLabel("Misc services") }
    item {
      BrandSecondaryButton(
        text = "Manual / Share Scan",
        onClick = onManual,
        enabled = entitlement?.manualScan != false,
      )
    }
    item { BrandSecondaryButton("EraseAI Safe files", onSafeFiles) }
    item { BrandSecondaryButton("Dataset Sanitizer", onDatasetSanitizer) }
    item {
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        BrandTextButton("Refresh", onRefresh)
        BrandTextButton("Privacy", onPrivacy)
      }
    }
  }
}

@Composable
private fun SubscriptionScreen(
  entitlement: EntitlementState?,
  products: List<PlayProduct>,
  billingPeriod: String,
  loading: Boolean,
  error: String?,
  message: String?,
  onPeriodChange: (String) -> Unit,
  onPurchase: (String) -> Unit,
  onRestore: () -> Unit,
  onManageInPlay: () -> Unit,
  onRefresh: () -> Unit,
) {
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(
        title = "Subscription",
        subtitle = "New accounts start a 7-day trial (25 scans). Subscribe through Google Play. Web billing on eraseai.ai stays on Stripe and is separate.",
      )
    }
    item {
      BrandCard(highlighted = true) {
        Text(entitlement?.subscriptionLabel ?: "Unknown", style = MaterialTheme.typography.titleMedium)
      }
    }
    if (error != null) item { BrandErrorBanner(error) }
    if (message != null) {
      item {
        BrandCard {
          Text("Billing", style = MaterialTheme.typography.labelMedium, color = BrandMutedForeground)
          Text(message)
        }
      }
    }
    item {
      Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        BrandChipButton("Monthly", billingPeriod == "monthly") { onPeriodChange("monthly") }
        BrandChipButton("Annual", billingPeriod == "annual") { onPeriodChange("annual") }
      }
    }
    if (products.isEmpty()) {
      item {
        BrandCard {
          Text(
            message
              ?: "Google Play subscription products are not available yet. Create matching subscription IDs in Play Console (eraseai_personal_monthly / annual), then Refresh. Install from Play internal testing for real purchases.",
          )
        }
      }
    } else {
      items(products) { product ->
        BrandCard(highlighted = true) {
          Text(product.name, style = MaterialTheme.typography.titleMedium)
          Text(
            "${product.plan.replaceFirstChar { it.uppercase() }} · ${product.billingPeriod}",
            color = BrandMutedForeground,
          )
          BrandPrimaryButton(
            text = if (loading) "Opening Google Play…" else "Subscribe with Google Play",
            onClick = { onPurchase(product.productId) },
            enabled = !loading,
          )
        }
      }
    }
    if (entitlement?.canManageInPlay == true) {
      item { BrandSecondaryButton("Manage in Google Play", onManageInPlay) }
    }
    item { BrandSecondaryButton("Restore Google Play purchases", onRestore) }
    item { BrandTextButton("Refresh subscription", onRefresh) }
  }
}

@Composable
private fun KeyboardGuideScreen(
  enabled: Boolean,
  selected: Boolean,
  onOpenSettings: () -> Unit,
  onPickKeyboard: () -> Unit,
  onDone: () -> Unit,
) {
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(
        title = "EraseAI Keyboard",
        subtitle = "Real firewall for typed prompts — risky text is withheld before it reaches the AI app's composer. No send-button tracking required.",
      )
    }
    item {
      BrandStatusBanner(
        title = when {
          selected -> "EraseAI Keyboard active"
          enabled -> "Enabled — select it in your AI app"
          else -> "Enable the keyboard"
        },
        body = when {
          selected -> "Accessibility curtain is skipped for text-only sends. Attachments still use the curtain."
          enabled -> "Open ChatGPT or Gemini, tap the keyboard icon, and choose EraseAI Keyboard."
          else -> "Turn on EraseAI Keyboard under system keyboard settings."
        },
        active = selected,
      )
    }
    item {
      BrandCard {
        Text("Setup", style = MaterialTheme.typography.titleMedium)
        Text("1. Enable EraseAI Keyboard in system settings.")
        Text("2. Open a protected AI app and switch to EraseAI Keyboard.")
        Text("3. Type a risky prompt and tap Send on the keyboard — text is held, not transmitted.")
        Text("4. Optional: Settings → Strict network gate blocks AI app network while a prompt is held.")
      }
    }
    item { BrandPrimaryButton("Open Keyboard Settings", onOpenSettings, icon = Icons.Default.Settings) }
    item { BrandSecondaryButton("Choose keyboard now", onPickKeyboard) }
    item { BrandSecondaryButton(if (selected) "Done" else "I'll set it up later", onDone) }
  }
}

@Composable
private fun AccessibilityGuideScreen(
  enabled: Boolean,
  onOpenSettings: () -> Unit,
  onChooseApps: () -> Unit,
  onDone: () -> Unit,
) {
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(
        title = "Enable Accessibility",
        subtitle = "EraseAI intercepts Send in ChatGPT, Claude, Gemini, and other selected AI apps. You'll see Cancel, Sanitize, or Send Anyway before risky prompts leave your phone.",
      )
    }
    item {
      BrandStatusBanner(
        title = if (enabled) "Accessibility enabled" else "Accessibility required",
        body = if (enabled) {
          "Return here after choosing apps, then tap Done."
        } else {
          "Open system settings and enable EraseAI Firewall under Accessibility / Downloaded apps."
        },
        active = enabled,
      )
    }
    item {
      BrandCard {
        Text("Setup checklist", style = MaterialTheme.typography.titleMedium)
        Text("1. Open Accessibility settings and enable EraseAI Firewall.")
        Text("2. Choose protected AI apps (Gemini + Google if both appear).")
        Text("3. Confirm firewall scanning is On from Home.")
        Text("4. Type a prompt and tap Send — EraseAI scans before it goes out.")
      }
    }
    item {
      BrandPrimaryButton(
        text = "Open Accessibility Settings",
        onClick = onOpenSettings,
        icon = Icons.Default.Security,
      )
    }
    item { BrandSecondaryButton("Choose Protected Apps", onChooseApps) }
    item {
      BrandSecondaryButton(
        text = if (enabled) "Done — back to Home" else "I'll enable it later",
        onClick = onDone,
      )
    }
  }
}

@Composable
private fun ProtectedAppsScreen(
  apps: List<ProtectedApp>,
  selected: Set<String>,
  onToggle: (String) -> Unit,
) {
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(10.dp),
  ) {
    item {
      BrandHero(
        title = "Protected Apps",
        subtitle = "Select AI or coding apps to protect. Suggested LLM apps are listed first. For Gemini, enable both “Gemini” and “Google” if both appear.",
      )
    }
    items(apps) { app ->
      BrandCard(highlighted = app.suggested || selected.contains(app.packageName)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
          Checkbox(
            checked = selected.contains(app.packageName),
            onCheckedChange = { onToggle(app.packageName) },
          )
          Box(modifier = Modifier.weight(1f)) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
              Text(app.label, style = MaterialTheme.typography.titleMedium)
              Text(app.packageName, style = MaterialTheme.typography.bodySmall, color = BrandMutedForeground)
            }
          }
          Text(
            if (app.installed) "Installed" else "Suggested",
            style = MaterialTheme.typography.labelMedium,
            color = if (app.installed) BrandSuccess else BrandMutedForeground,
          )
        }
      }
    }
  }
}

@Composable
private fun ManualScanScreen(
  text: String,
  scanResult: ScanResult?,
  redactedText: String?,
  loading: Boolean,
  error: String?,
  entitlement: EntitlementState?,
  attachments: List<ScanPiece>,
  onTextChange: (String) -> Unit,
  onAddAttachment: () -> Unit,
  onClearAttachments: () -> Unit,
  onScan: () -> Unit,
  onLoadSample: () -> Unit,
  onManageBilling: () -> Unit,
) {
  val clipboard = LocalClipboardManager.current
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(
        title = "Manual Scan",
        subtitle = "Paste a prompt or share text/JSON/CSV into EraseAI. Add attachments for multi-piece scanning before sending to a public LLM.",
      )
    }
    item {
      BrandField(
        value = text,
        onValueChange = onTextChange,
        label = "Prompt or uploaded text",
        singleLine = false,
        minLines = 6,
        fieldModifier = Modifier.height(180.dp),
      )
    }
    item {
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        BrandTextButton("Add attachment", onAddAttachment, enabled = !loading)
        if (attachments.isNotEmpty()) {
          BrandTextButton("Clear ${attachments.size}", onClearAttachments)
        }
      }
    }
    if (attachments.isNotEmpty()) {
      items(attachments) { piece ->
        BrandCard {
          Text(piece.label, style = MaterialTheme.typography.titleSmall)
          Text(piece.skipReason ?: "${piece.text.length} chars scanned", color = BrandMutedForeground)
        }
      }
    }
    if (error != null) item { BrandErrorBanner(error) }
    item {
      BrandPrimaryButton(
        text = if (loading) "Scanning…" else "Scan & sanitize check",
        onClick = onScan,
        enabled = !loading && text.length >= 3 && entitlement?.manualScan != false,
        icon = Icons.Default.Security,
      )
    }
    if (BuildConfig.DEBUG) {
      item { BrandTextButton("Load QA sample", onLoadSample, enabled = !loading) }
    }
    if (scanResult != null) {
      item {
        BrandCard(highlighted = true) {
          Text("Risk ${scanResult.riskScore}/100", style = MaterialTheme.typography.titleMedium)
          Text("Action: ${scanResult.action}", color = BrandMutedForeground)
        }
      }
      items(scanResult.findings) { finding ->
        BrandCard {
          Text(finding.label, style = MaterialTheme.typography.titleSmall)
          Text("${finding.type} / ${finding.severity}", color = BrandMutedForeground)
        }
      }
      if (scanResult.findings.isNotEmpty() && redactedText == null && entitlement?.redaction != true) {
        item { BrandErrorBanner("Redaction / sanitize copy requires an active paid EraseAI plan.") }
        item { BrandSecondaryButton("Upgrade in Google Play", onManageBilling) }
      }
      if (redactedText != null) {
        item {
          BrandCard(highlighted = true) {
            Text("Sanitized output", style = MaterialTheme.typography.titleMedium)
            Text(redactedText)
            BrandSecondaryButton(
              text = "Copy Safe Text",
              onClick = { clipboard.setText(AnnotatedString(redactedText)) },
              icon = Icons.Default.ContentCopy,
            )
          }
        }
      }
    }
  }
}

@Composable
private fun HistoryScreen(items: List<ScanHistoryItem>) {
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(10.dp),
  ) {
    if (items.isEmpty()) {
      item {
        BrandCard {
          Text("No scan history yet.", color = BrandMutedForeground)
        }
      }
    } else {
      items(items) { item ->
        BrandCard {
          Text(
            "Risk ${item.riskScore}/100 · ${item.level.ifBlank { "low" }}",
            style = MaterialTheme.typography.titleMedium,
          )
          Text(item.content)
          Text(item.createdAt, style = MaterialTheme.typography.bodySmall, color = BrandMutedForeground)
        }
      }
    }
  }
}

@Composable
private fun SettingsScreen(
  apiBase: String,
  webBase: String,
  strictEgressEnabled: Boolean,
  egressStatus: GuardHealth.EgressStatus,
  onStrictEgressChange: (Boolean) -> Unit,
  onReconnectStrictEgress: () -> Unit,
  onBilling: () -> Unit,
  onDiagnostics: () -> Unit,
  onPrivacy: () -> Unit,
  onOpenPrivacyPolicy: () -> Unit,
  signedIn: Boolean,
  onSignIn: () -> Unit,
  onLogout: () -> Unit,
) {
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(title = "Settings", subtitle = "Account, billing, diagnostics, and privacy.")
    }
    item {
      BrandCard {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
          Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Strict network gate", style = MaterialTheme.typography.titleMedium)
            Text(
              "While a risky prompt is held, block protected AI apps from reaching the network. Does not read HTTPS content.",
              style = MaterialTheme.typography.bodySmall,
              color = BrandMutedForeground,
            )
            if (egressStatus == GuardHealth.EgressStatus.OTHER_VPN ||
              egressStatus == GuardHealth.EgressStatus.PERMISSION_LOST
            ) {
              Text(
                egressStatusMessage(egressStatus),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
              )
              if (egressStatus == GuardHealth.EgressStatus.PERMISSION_LOST) {
                TextButton(onClick = onReconnectStrictEgress) { Text("Reconnect gate") }
              }
            }
          }
          Switch(
            checked = strictEgressEnabled,
            onCheckedChange = onStrictEgressChange,
            colors = SwitchDefaults.colors(
              checkedThumbColor = BrandBackground,
              checkedTrackColor = BrandSuccess,
            ),
          )
        }
      }
    }
    item {
      BrandCard {
        Text("API", style = MaterialTheme.typography.labelMedium, color = BrandMutedForeground)
        Text(apiBase, style = MaterialTheme.typography.bodySmall)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Web", style = MaterialTheme.typography.labelMedium, color = BrandMutedForeground)
        Text(webBase, style = MaterialTheme.typography.bodySmall)
      }
    }
    item { BrandSecondaryButton("Trial & Subscription", onBilling) }
    item { BrandSecondaryButton("Diagnostics", onDiagnostics) }
    item { BrandSecondaryButton("Privacy Explanation", onPrivacy) }
    item { BrandSecondaryButton("Open Privacy Policy", onOpenPrivacyPolicy) }
    item {
      if (signedIn) BrandPrimaryButton("Sign Out", onLogout) else BrandPrimaryButton("Sign in or create account", onSignIn)
    }
  }
}

@Composable
private fun DiagnosticsScreen(report: String, onRefresh: () -> Unit) {
  val clipboard = LocalClipboardManager.current
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(title = "Diagnostics", subtitle = "Sanitized status for support and internal testing.")
    }
    item {
      BrandCard {
        Text("Report", style = MaterialTheme.typography.labelMedium, color = BrandMutedForeground)
        Text(report, style = MaterialTheme.typography.bodySmall)
      }
    }
    item { BrandSecondaryButton("Refresh Diagnostics", onRefresh) }
    item {
      BrandPrimaryButton(
        text = "Copy Diagnostics",
        onClick = { clipboard.setText(AnnotatedString(report)) },
        icon = Icons.Default.ContentCopy,
      )
    }
  }
}

@Composable
private fun PrivacyScreen(onContinue: () -> Unit, onOpenPolicy: () -> Unit) {
  LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(
        title = "Privacy",
        subtitle = "EraseAI Firewall scans only text you enter in apps you select, plus prompts you share into the app.",
      )
    }
    item {
      BrandCard {
        Text("It skips password fields and does not inspect banking apps, settings, or unrelated apps by default.")
        Text("Selected text is sent to eraseai.ai for breach/PII scanning. Android subscriptions use Google Play Billing; eraseai.ai web billing uses Stripe separately.")
      }
    }
    item {
      BrandCard {
        Text("1. Sign in with your EraseAI account.")
        Text("2. Review trial / subscribe through Google Play.")
        Text("3. Enable Accessibility permission.")
        Text("4. Choose which AI apps to protect.")
        Text("5. Use AI apps normally; EraseAI warns or sanitizes risky prompts.")
      }
    }
    item { BrandSecondaryButton("Open Privacy Policy", onOpenPolicy) }
    item { BrandPrimaryButton("Continue to Subscription", onContinue) }
  }
}

private fun scansUsed(entitlement: EntitlementState?): String =
  entitlement?.let {
    if (it.scanLimit == null) it.scansUsed.toString() else "${it.scansUsed}/${it.scanLimit}"
  } ?: "Loading"

private fun Screen.title(): String = when (this) {
  Screen.Splash, Screen.Login -> "EraseAI Firewall"
  Screen.Dashboard -> "Home"
  Screen.Subscription -> "Subscription"
  Screen.AccessibilityGuide -> "Enable Accessibility"
  Screen.KeyboardGuide -> "EraseAI Keyboard"
  Screen.ProtectedApps -> "Protected Apps"
  Screen.ManualScan -> "Manual Scan"
  Screen.DatasetSanitizer -> "Dataset Sanitizer"
  Screen.History -> "Scanner History"
  Screen.Settings -> "Settings"
  Screen.Diagnostics -> "Diagnostics"
  Screen.Privacy -> "Privacy"
}

private fun Throwable.safeMessage(): String = when (this) {
  is ApiError.Unauthorized -> message ?: "Please sign in again."
  is ApiError.UpgradeRequired -> message ?: "Upgrade required."
  is ApiError.NotFound -> message ?: "Not found."
  is ApiError.Network -> message ?: "Network unavailable."
  is ApiError.Server -> message ?: "EraseAI is temporarily unavailable."
  else -> message ?: "Something went wrong."
}

private fun Throwable.errorCategory(): String = when (this) {
  is ApiError.Unauthorized -> "auth"
  is ApiError.UpgradeRequired -> "entitlement"
  is ApiError.NotFound -> "not_found"
  is ApiError.Network -> "network"
  is ApiError.Server -> "server"
  else -> "unknown"
}

private fun buildDiagnosticsReport(
  backendStatus: String,
  entitlement: EntitlementState?,
  accessibilityEnabled: Boolean,
  accessibilityStatus: GuardHealth.AccessibilityStatus,
  keyboardSelected: Boolean,
  strictEgressEnabled: Boolean,
  egressStatus: GuardHealth.EgressStatus,
  firewallEnabled: Boolean,
  protectedAppsCount: Int,
  lastScanTime: String,
  lastScanResultType: String,
  lastErrorCategory: String,
): String = listOf(
  "app_version=${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
  "backend_status=$backendStatus",
  "auth_status=${if (entitlement?.authenticated == true) "authenticated" else "unknown"}",
  "entitlement_status=${entitlement?.status ?: "unknown"}",
  "accessibility_permission=${if (accessibilityEnabled) "enabled" else "disabled"}",
  "accessibility_service=${accessibilityStatus.name.lowercase()}",
  "accessibility_last_event=${GuardHealth.lastEventAtMs.takeIf { it > 0 }?.let { "${(System.currentTimeMillis() - it) / 1000}s ago" } ?: "never"}",
  "eraseai_keyboard_selected=${if (keyboardSelected) "yes" else "no"}",
  "strict_egress_gate=${if (strictEgressEnabled) "on" else "off"}",
  "strict_egress_status=${egressStatus.name.lowercase()}",
  "egress_armed=${GuardStateStore.getArmedPackage() ?: "none"}",
  "egress_blocked=${if (GuardStateStore.isEgressBlocked()) "yes" else "no"}",
  "firewall_scanning=${if (firewallEnabled) "on" else "off"}",
  "protected_apps_count=$protectedAppsCount",
  "last_scan_time=$lastScanTime",
  "last_scan_result_type=$lastScanResultType",
  "last_error_category=$lastErrorCategory",
).joinToString("\n")

private fun egressStatusMessage(status: GuardHealth.EgressStatus): String = when (status) {
  GuardHealth.EgressStatus.OTHER_VPN ->
    "Strict network gate paused: another VPN is connected, and Android runs one VPN at a time. " +
      "The send curtain and keyboard still protect you."
  GuardHealth.EgressStatus.PERMISSION_LOST ->
    "Strict network gate is not active: EraseAI lost VPN permission, usually because another " +
      "VPN app was connected. Reconnect to restore it."
  else -> ""
}

private const val HEALTH_RECHECK_MS = 3_000L

private fun isAccessibilityEnabled(context: Context): Boolean {
  val expected = ComponentName(context, "${context.packageName}.guard.AiGuardAccessibilityService")
  val enabled = Settings.Secure.getString(
    context.contentResolver,
    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
  ).orEmpty()
  return enabled.split(':').any { ComponentName.unflattenFromString(it) == expected }
}

private fun openUrl(context: Context, url: String) {
  CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
}
