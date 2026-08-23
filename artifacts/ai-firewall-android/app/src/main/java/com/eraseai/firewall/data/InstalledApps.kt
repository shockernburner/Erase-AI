package com.eraseai.firewall.data

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager

fun loadInstalledApps(context: Context): List<ProtectedApp> {
  val packageManager = context.packageManager
  val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
  val installed = packageManager.queryIntentActivities(launcherIntent, PackageManager.MATCH_ALL)
    .map { resolveInfo ->
      val packageName = resolveInfo.activityInfo.packageName
      ProtectedApp(
        packageName = packageName,
        label = resolveInfo.loadLabel(packageManager).toString(),
        suggested = KnownLlmApps.isKnown(packageName),
        installed = true,
      )
    }
    .distinctBy { it.packageName }

  val installedByPackage = installed.associateBy { it.packageName }
  val suggestions = KnownLlmApps.labels.map { (packageName, label) ->
    installedByPackage[packageName] ?: ProtectedApp(packageName, label, suggested = true, installed = false)
  }
  return (suggestions + installed)
    .distinctBy { it.packageName }
    .sortedWith(
      compareByDescending<ProtectedApp> { it.suggested && it.installed }
        .thenByDescending { it.suggested }
        .thenBy { it.label.lowercase() },
    )
}
