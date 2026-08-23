package com.eraseai.firewall

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast
import com.eraseai.firewall.data.KnownLlmApps
import com.eraseai.firewall.data.ProtectedAppsStore

/**
 * Detects newly installed known LLM / AI apps and offers them for protection.
 * Does not auto-enable scanning for unknown packages.
 */
class PackageInstallReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_PACKAGE_ADDED) return
    if (intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)) return
    val packageName = intent.data?.schemeSpecificPart ?: return
    if (!KnownLlmApps.isKnown(packageName)) return

    val store = ProtectedAppsStore(context)
    val selected = store.getSelectedPackages().toMutableSet()
    if (selected.contains(packageName)) return
    selected += packageName
    store.setSelectedPackages(selected)

    val label = KnownLlmApps.labelFor(packageName)
    Toast.makeText(
      context.applicationContext,
      "$label installed. Added to EraseAI protected apps — open the app to review.",
      Toast.LENGTH_LONG,
    ).show()
  }
}
