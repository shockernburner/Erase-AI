package com.eraseai.firewall

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
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
import com.eraseai.firewall.data.ApiClient
import com.eraseai.firewall.data.ApiError
import com.eraseai.firewall.data.AuthApi
import com.eraseai.firewall.data.EntitlementRepository
import com.eraseai.firewall.data.EntitlementState
import com.eraseai.firewall.data.HistoryRepository
import com.eraseai.firewall.data.MobileSessionStore
import com.eraseai.firewall.data.ProtectedApp
import com.eraseai.firewall.data.ProtectedAppsStore
import com.eraseai.firewall.data.ScanApi
import com.eraseai.firewall.data.ScanHistoryItem
import com.eraseai.firewall.data.ScanResult
import com.eraseai.firewall.data.loadInstalledApps
import com.eraseai.firewall.ui.theme.EraseAIFirewallTheme
import kotlinx.coroutines.launch

private const val MAX_SCAN_TEXT_LENGTH = 5000
private const val INTERNAL_RELEASE_NOTES = "Initial internal testing build of EraseAI AI Firewall for Android. Includes sign-in, entitlement sync, manual scan, share-sheet scan, selected-app Accessibility protection, warning overlay, redaction/copy-safe-text flow, billing handoff, protected app sync, and sanitized diagnostics."

private enum class Screen { Splash, Login, Dashboard, Subscription, AccessibilityGuide, ProtectedApps, ManualScan, History, Settings, Diagnostics, Privacy }

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val sharedText = if (intent.action == Intent.ACTION_SEND && intent.type == "text/plain") intent.getStringExtra(Intent.EXTRA_TEXT)?.take(MAX_SCAN_TEXT_LENGTH) else null
    setContent { EraseAIFirewallTheme { EraseAIFirewallApp(sharedText) } }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EraseAIFirewallApp(initialSharedText: String?) {
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  val sessionStore = remember { MobileSessionStore(context) }
  val apiClient = remember { ApiClient(sessionStore) }
  val authApi = remember { AuthApi(apiClient, sessionStore) }
  val scanApi = remember { ScanApi(apiClient) }
  val entitlementRepo = remember { EntitlementRepository(apiClient) }
  val historyRepo = remember { HistoryRepository(apiClient) }
  val protectedStore = remember { ProtectedAppsStore(context) }

  var screen by remember { mutableStateOf(Screen.Splash) }
  var entitlement by remember { mutableStateOf<EntitlementState?>(null) }
  var loading by remember { mutableStateOf(false) }
  var error by remember { mutableStateOf<String?>(null) }
  var apps by remember { mutableStateOf(loadInstalledApps(context)) }
  var selectedPackages by remember { mutableStateOf(protectedStore.getSelectedPackages()) }
  var firewallEnabled by remember { mutableStateOf(protectedStore.isFirewallEnabled()) }
  var history by remember { mutableStateOf<List<ScanHistoryItem>>(emptyList()) }
  var manualText by remember { mutableStateOf(initialSharedText.orEmpty().take(MAX_SCAN_TEXT_LENGTH)) }
  var scanResult by remember { mutableStateOf<ScanResult?>(null) }
  var redactedText by remember { mutableStateOf<String?>(null) }
  var backendStatus by remember { mutableStateOf("Not checked") }

  fun refreshEntitlement() {
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

  DisposableEffect(Unit) {
    val lifecycleOwner = context as? LifecycleOwner
    val observer = LifecycleEventObserver { _, event ->
      if (event == Lifecycle.Event.ON_RESUME && !sessionStore.getToken().isNullOrBlank()) refreshEntitlement()
    }
    lifecycleOwner?.lifecycle?.addObserver(observer)
    onDispose { lifecycleOwner?.lifecycle?.removeObserver(observer) }
  }

  LaunchedEffect(Unit) {
    if (sessionStore.getToken().isNullOrBlank()) screen = Screen.Login else {
      refreshEntitlement()
      refreshBackendStatus()
      val mergedPackages = protectedStore.mergeFromBackend(apiClient).getOrNull()
      if (mergedPackages != null) {
        selectedPackages = mergedPackages
        firewallEnabled = protectedStore.isFirewallEnabled()
        protectedStore.pushToBackend(apiClient)
      }
      screen = if (initialSharedText.isNullOrBlank()) Screen.Dashboard else Screen.ManualScan
    }
  }

  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text(screen.title()) },
        navigationIcon = {
          if (screen !in setOf(Screen.Login, Screen.Dashboard, Screen.Splash)) {
            IconButton(onClick = { screen = Screen.Dashboard }) { Icon(Icons.Default.ArrowBack, "Back") }
          }
        },
      )
    },
  ) { padding ->
    Surface(Modifier.fillMaxSize().padding(padding), color = MaterialTheme.colorScheme.background) {
      when (screen) {
        Screen.Splash -> LoadingScreen()
        Screen.Login -> LoginScreen(loading, error, onLogin = { email, password ->
          scope.launch {
            loading = true
            error = null
            authApi.login(email, password).onSuccess { refreshEntitlement(); refreshBackendStatus(); screen = Screen.Dashboard }.onFailure { error = it.safeMessage(); protectedStore.saveLastErrorCategory(it.errorCategory()) }
            loading = false
          }
        }, onSignup = { email, password ->
          scope.launch {
            loading = true
            error = null
            authApi.signup(email, password, null, null).onSuccess { refreshEntitlement(); refreshBackendStatus(); screen = Screen.Privacy }.onFailure { error = it.safeMessage(); protectedStore.saveLastErrorCategory(it.errorCategory()) }
            loading = false
          }
        })
        Screen.Dashboard -> DashboardScreen(
          entitlement = entitlement,
          loading = loading,
          accessibilityEnabled = isAccessibilityEnabled(context),
          firewallEnabled = firewallEnabled,
          protectedAppsCount = selectedPackages.size,
          lastScan = protectedStore.getLastScanSummary(),
          error = error,
          onRefresh = { refreshEntitlement() },
          onToggleFirewall = {
            firewallEnabled = !firewallEnabled
            protectedStore.setFirewallEnabled(firewallEnabled)
            scope.launch { protectedStore.pushToBackend(apiClient) }
          },
          onEnable = { screen = Screen.AccessibilityGuide },
          onApps = { apps = loadInstalledApps(context); screen = Screen.ProtectedApps },
          onManual = { screen = Screen.ManualScan },
          onBilling = { screen = Screen.Subscription },
          onHistory = {
            scope.launch {
              loading = true
              if (entitlement?.history == false) {
                error = "History requires an active EraseAI plan."
              } else {
                historyRepo.load().onSuccess { history = it; screen = Screen.History }.onFailure { error = it.safeMessage(); protectedStore.saveLastErrorCategory(it.errorCategory()) }
              }
              loading = false
            }
          },
          onSettings = { screen = Screen.Settings },
          onPrivacy = { screen = Screen.Privacy },
        )
        Screen.Subscription -> SubscriptionScreen(entitlement, onManageBilling = { openBilling(context, entitlement?.manageUrl ?: entitlement?.checkoutUrl) }, onRefresh = { refreshEntitlement() })
        Screen.AccessibilityGuide -> AccessibilityGuideScreen(isAccessibilityEnabled(context), { context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }, { screen = Screen.ProtectedApps })
        Screen.ProtectedApps -> ProtectedAppsScreen(apps, selectedPackages) { packageName ->
          selectedPackages = if (selectedPackages.contains(packageName)) selectedPackages - packageName else selectedPackages + packageName
          protectedStore.setSelectedPackages(selectedPackages)
          scope.launch { protectedStore.pushToBackend(apiClient) }
        }
        Screen.ManualScan -> ManualScanScreen(manualText, scanResult, redactedText, loading, error, entitlement, onTextChange = {
          manualText = it.take(MAX_SCAN_TEXT_LENGTH)
          scanResult = null
          redactedText = null
        }, onScan = {
          scope.launch {
            loading = true
            error = null
            redactedText = null
            val scanText = manualText.take(MAX_SCAN_TEXT_LENGTH)
            manualText = scanText
            scanApi.scan(scanText).onSuccess { result ->
              scanResult = result
              protectedStore.saveLastScanSummary(result.summary(), result.diagnosticsType())
              if (result.findings.isNotEmpty() && entitlement?.redaction == true) {
                scanApi.rewrite(scanText, result.findings).onSuccess { redactedText = it }.onFailure { error = it.safeMessage(); protectedStore.saveLastErrorCategory(it.errorCategory()) }
              }
              refreshEntitlement()
            }.onFailure { error = it.safeMessage(); protectedStore.saveLastErrorCategory(it.errorCategory()) }
            loading = false
          }
        }, onLoadSample = {
          manualText = BuildConfig.QA_SAMPLE_TEXT
          scanResult = null
          redactedText = null
          error = null
        }, onManageBilling = { openBilling(context, entitlement?.manageUrl ?: entitlement?.checkoutUrl) })
        Screen.History -> HistoryScreen(history)
        Screen.Settings -> SettingsScreen(BuildConfig.API_BASE_URL, BuildConfig.WEB_BASE_URL, onBilling = { openBilling(context, entitlement?.manageUrl ?: entitlement?.checkoutUrl) }, onDiagnostics = { refreshBackendStatus(); screen = Screen.Diagnostics }, onPrivacy = { screen = Screen.Privacy }, onLogout = {
          scope.launch {
            authApi.logout()
            entitlement = null
            scanResult = null
            redactedText = null
            screen = Screen.Login
          }
        })
        Screen.Diagnostics -> DiagnosticsScreen(
          report = buildDiagnosticsReport(
            backendStatus = backendStatus,
            entitlement = entitlement,
            accessibilityEnabled = isAccessibilityEnabled(context),
            protectedAppsCount = selectedPackages.size,
            lastScanTime = protectedStore.getLastScanTime(),
            lastScanResultType = protectedStore.getLastScanResultType(),
            lastErrorCategory = protectedStore.getLastErrorCategory(),
          ),
          onRefresh = { refreshBackendStatus(); refreshEntitlement() },
        )
        Screen.Privacy -> PrivacyScreen { screen = Screen.Dashboard }
      }
    }
  }
}

@Composable
private fun LoadingScreen() {
  Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
    CircularProgressIndicator()
    Spacer(Modifier.height(16.dp))
    Text("Loading EraseAI Firewall")
  }
}

@Composable
private fun LoginScreen(loading: Boolean, error: String?, onLogin: (String, String) -> Unit, onSignup: (String, String) -> Unit) {
  var email by remember { mutableStateOf("") }
  var password by remember { mutableStateOf("") }
  LazyColumn(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
    item {
      Text("AI Firewall for your phone", style = MaterialTheme.typography.headlineMedium)
      Text("EraseAI checks sensitive data before you send it to ChatGPT, Gemini, Claude, DeepSeek, Replit, or other AI apps.")
    }
    item { OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), label = { Text("Email") }, singleLine = true) }
    item { OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation()) }
    if (error != null) item { ErrorCard(error) }
    item {
      Button(enabled = !loading && email.isNotBlank() && password.isNotBlank(), onClick = { onLogin(email.trim(), password) }, modifier = Modifier.fillMaxWidth()) {
        Icon(Icons.Default.Lock, null)
        Spacer(Modifier.width(8.dp))
        Text(if (loading) "Signing in" else "Sign In")
      }
    }
    item { OutlinedButton(onClick = { onSignup(email.trim(), password) }, modifier = Modifier.fillMaxWidth(), enabled = !loading && email.isNotBlank() && password.length >= 8) { Text("Create Account") } }
  }
}

@Composable
private fun DashboardScreen(
  entitlement: EntitlementState?,
  loading: Boolean,
  accessibilityEnabled: Boolean,
  firewallEnabled: Boolean,
  protectedAppsCount: Int,
  lastScan: String,
  error: String?,
  onRefresh: () -> Unit,
  onToggleFirewall: () -> Unit,
  onEnable: () -> Unit,
  onApps: () -> Unit,
  onManual: () -> Unit,
  onBilling: () -> Unit,
  onHistory: () -> Unit,
  onSettings: () -> Unit,
  onPrivacy: () -> Unit,
) {
  LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    item {
      Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
          Text("AI Firewall for your phone", style = MaterialTheme.typography.headlineSmall)
          Text("Warn, redact, or block risky prompts before they leave selected AI apps.")
        }
        IconButton(onSettings) { Icon(Icons.Default.Settings, "Settings") }
      }
    }
    if (error != null) item { ErrorCard(error) }
    item { CardRow("Firewall" to if (firewallEnabled && accessibilityEnabled) "On" else "Off", "Accessibility" to if (accessibilityEnabled) "Enabled" else "Not enabled") }
    item { CardRow("Subscription" to (entitlement?.subscriptionLabel ?: if (loading) "Loading" else "Unknown"), "Protected Apps" to protectedAppsCount.toString()) }
    item { CardRow("Scans Used" to scansUsed(entitlement), "Last Action" to lastScan) }
    item {
      Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text("Firewall scanning", Modifier.weight(1f))
        Switch(checked = firewallEnabled, enabled = entitlement?.androidFirewall != false, onCheckedChange = { onToggleFirewall() })
      }
    }
    item { Button(enabled = entitlement?.accessibilityFirewall != false, onClick = onEnable, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Shield, null); Spacer(Modifier.width(8.dp)); Text("Enable AI Firewall") } }
    item { OutlinedButton(onClick = onApps, modifier = Modifier.fillMaxWidth()) { Text("Choose Protected Apps") } }
    item { OutlinedButton(enabled = entitlement?.manualScan != false, onClick = onManual, modifier = Modifier.fillMaxWidth()) { Text("Manual Scan") } }
    item { OutlinedButton(enabled = entitlement?.history != false, onClick = onHistory, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.History, null); Spacer(Modifier.width(8.dp)); Text("Scanner History") } }
    item { OutlinedButton(onClick = onBilling, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.OpenInBrowser, null); Spacer(Modifier.width(8.dp)); Text("Upgrade / Manage Billing") } }
    item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { TextButton(onRefresh) { Text("Refresh") }; TextButton(onPrivacy) { Text("Privacy") } } }
  }
}

@Composable
private fun SubscriptionScreen(entitlement: EntitlementState?, onManageBilling: () -> Unit, onRefresh: () -> Unit) {
  Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    Text("Current plan", style = MaterialTheme.typography.headlineSmall)
    Text(entitlement?.subscriptionLabel ?: "Unknown")
    Text("Android firewall access follows your existing EraseAI account plan and backend entitlement state.")
    Button(onClick = onManageBilling, modifier = Modifier.fillMaxWidth()) { Text("Manage Billing") }
    OutlinedButton(onClick = onRefresh, modifier = Modifier.fillMaxWidth()) { Text("Refresh Subscription") }
  }
}

@Composable
private fun AccessibilityGuideScreen(enabled: Boolean, onOpenSettings: () -> Unit, onChooseApps: () -> Unit) {
  LazyColumn(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
    item { Text("Enable Accessibility", style = MaterialTheme.typography.headlineSmall) }
    item { Text("EraseAI Firewall uses Android Accessibility permission only to inspect text you are actively entering in selected AI apps, so it can warn or redact sensitive data before it is sent.") }
    item { Text("Status: ${if (enabled) "Enabled" else "Not enabled"}") }
    item { Button(onClick = onOpenSettings, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Security, null); Spacer(Modifier.width(8.dp)); Text("Open Accessibility Settings") } }
    item { OutlinedButton(onClick = onChooseApps, modifier = Modifier.fillMaxWidth()) { Text("Choose Apps") } }
  }
}

@Composable
private fun ProtectedAppsScreen(apps: List<ProtectedApp>, selected: Set<String>, onToggle: (String) -> Unit) {
  LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
    item { Text("Select only the AI or coding apps you want EraseAI to inspect.") }
    items(apps) { app ->
      Card(border = if (app.suggested) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null) {
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
          Checkbox(checked = selected.contains(app.packageName), onCheckedChange = { onToggle(app.packageName) })
          Column(Modifier.weight(1f)) {
            Text(app.label, style = MaterialTheme.typography.titleMedium)
            Text(app.packageName, style = MaterialTheme.typography.bodySmall)
          }
          Text(if (app.installed) "Installed" else "Suggested", style = MaterialTheme.typography.bodySmall)
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
  onTextChange: (String) -> Unit,
  onScan: () -> Unit,
  onLoadSample: () -> Unit,
  onManageBilling: () -> Unit,
) {
  val clipboard = LocalClipboardManager.current
  LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    item { OutlinedTextField(text, onTextChange, Modifier.fillMaxWidth().height(180.dp), label = { Text("Prompt or pasted text") }, minLines = 6) }
    if (error != null) item { ErrorCard(error) }
    item { Button(enabled = !loading && text.length >= 3 && entitlement?.manualScan != false, onClick = onScan, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Security, null); Spacer(Modifier.width(8.dp)); Text(if (loading) "Scanning" else "Scan") } }
    if (BuildConfig.DEBUG) item { TextButton(onClick = onLoadSample, enabled = !loading) { Text("Load QA sample") } }
    if (scanResult != null) {
      item { StatusCard("Risk", "${scanResult.riskScore}/100 (${scanResult.action})") }
      items(scanResult.findings) { finding -> StatusCard(finding.label, "${finding.type} / ${finding.severity}") }
      if (scanResult.findings.isNotEmpty() && redactedText == null && entitlement?.redaction != true) {
        item { ErrorCard("Redaction requires an active EraseAI plan.") }
        item { OutlinedButton(onClick = onManageBilling, modifier = Modifier.fillMaxWidth()) { Text("Upgrade / Manage Billing") } }
      }
      if (redactedText != null) item {
        Card { Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Text("Redacted output", style = MaterialTheme.typography.titleMedium)
          Text(redactedText)
          OutlinedButton(onClick = { clipboard.setText(AnnotatedString(redactedText)) }) { Icon(Icons.Default.ContentCopy, null); Spacer(Modifier.width(8.dp)); Text("Copy Safe Text") }
        } }
      }
    }
  }
}

@Composable
private fun HistoryScreen(items: List<ScanHistoryItem>) {
  LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
    if (items.isEmpty()) item { Text("No scan history yet.") } else items(items) { item -> StatusCard("Risk ${item.riskScore}/100", "${item.content}\n${item.createdAt}") }
  }
}

@Composable
private fun SettingsScreen(apiBase: String, webBase: String, onBilling: () -> Unit, onDiagnostics: () -> Unit, onPrivacy: () -> Unit, onLogout: () -> Unit) {
  LazyColumn(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    item { StatusCard("API", apiBase) }
    item { StatusCard("Web", webBase) }
    item { StatusCard("Internal Release Notes", INTERNAL_RELEASE_NOTES) }
    item { OutlinedButton(onClick = onBilling, modifier = Modifier.fillMaxWidth()) { Text("Manage Billing") } }
    item { OutlinedButton(onClick = onDiagnostics, modifier = Modifier.fillMaxWidth()) { Text("Diagnostics") } }
    item { OutlinedButton(onClick = onPrivacy, modifier = Modifier.fillMaxWidth()) { Text("Privacy Explanation") } }
    item { Button(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("Sign Out") } }
  }
}

@Composable
private fun DiagnosticsScreen(report: String, onRefresh: () -> Unit) {
  val clipboard = LocalClipboardManager.current
  LazyColumn(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    item { Text("Diagnostics", style = MaterialTheme.typography.headlineSmall) }
    item { StatusCard("Sanitized Report", report) }
    item { OutlinedButton(onClick = onRefresh, modifier = Modifier.fillMaxWidth()) { Text("Refresh Diagnostics") } }
    item {
      Button(onClick = { clipboard.setText(AnnotatedString(report)) }, modifier = Modifier.fillMaxWidth()) {
        Icon(Icons.Default.ContentCopy, null)
        Spacer(Modifier.width(8.dp))
        Text("Copy Diagnostics")
      }
    }
  }
}

@Composable
private fun PrivacyScreen(onContinue: () -> Unit) {
  LazyColumn(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    item { Text("Privacy", style = MaterialTheme.typography.headlineSmall) }
    item { Text("EraseAI Firewall scans only text you actively enter in apps you select. It skips password fields and does not inspect banking apps, settings, or unrelated apps by default.") }
    item { Text("Raw prompts are not stored locally. Local history uses backend-provided previews and metadata only.") }
    item { Text("1. Sign in with your EraseAI account.") }
    item { Text("2. Enable Accessibility permission.") }
    item { Text("3. Choose which AI apps to protect.") }
    item { Text("4. Use AI apps normally; EraseAI warns or redacts risky prompts.") }
    item { Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) { Text("Continue") } }
  }
}

@Composable
private fun CardRow(vararg values: Pair<String, String>) {
  Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
    values.forEach { (title, body) -> Card(Modifier.weight(1f)) { Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) { Text(title, style = MaterialTheme.typography.labelMedium); Text(body.ifBlank { "-" }, style = MaterialTheme.typography.titleMedium) } } }
  }
}

@Composable
private fun StatusCard(title: String, body: String) {
  Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) { Text(title, style = MaterialTheme.typography.titleMedium); Text(body) } }
}

@Composable
private fun ErrorCard(message: String) {
  Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Warning, null); Spacer(Modifier.width(8.dp)); Text(message) }
  }
}

private fun scansUsed(entitlement: EntitlementState?): String = entitlement?.let { if (it.scanLimit == null) it.scansUsed.toString() else "${it.scansUsed}/${it.scanLimit}" } ?: "Loading"

private fun Screen.title(): String = when (this) {
  Screen.Splash, Screen.Login -> "EraseAI AI Firewall"
  Screen.Dashboard -> "Firewall Home"
  Screen.Subscription -> "Subscription"
  Screen.AccessibilityGuide -> "Enable Accessibility"
  Screen.ProtectedApps -> "Protected Apps"
  Screen.ManualScan -> "Manual Scan"
  Screen.History -> "Scanner History"
  Screen.Settings -> "Settings"
  Screen.Diagnostics -> "Diagnostics"
  Screen.Privacy -> "Privacy"
}

private fun Throwable.safeMessage(): String = when (this) {
  is ApiError.Unauthorized -> "Please sign in again."
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

private fun ScanResult.summary(): String = when {
  findings.isEmpty() -> "Allowed"
  action == "block" -> "Blocked sensitive prompt"
  action == "redact" -> "Redaction recommended"
  else -> "Warning shown"
}

private fun ScanResult.diagnosticsType(): String = when {
  findings.isEmpty() -> "allow"
  action == "block" -> "block"
  action == "redact" -> "redact"
  else -> "warn"
}

private fun buildDiagnosticsReport(
  backendStatus: String,
  entitlement: EntitlementState?,
  accessibilityEnabled: Boolean,
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
  "protected_apps_count=$protectedAppsCount",
  "last_scan_time=$lastScanTime",
  "last_scan_result_type=$lastScanResultType",
  "last_error_category=$lastErrorCategory",
).joinToString("\n")

private fun isAccessibilityEnabled(context: Context): Boolean {
  val expected = ComponentName(context, "${context.packageName}.guard.AiGuardAccessibilityService")
  val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES).orEmpty()
  return enabled.split(':').any { ComponentName.unflattenFromString(it) == expected }
}

private fun openBilling(context: Context, url: String? = null) {
  CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url ?: "${BuildConfig.WEB_BASE_URL}/billing"))
}
