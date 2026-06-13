package com.eraseai.firewall.data

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager

private val suggestedLabels = mapOf(
  "com.openai.chatgpt" to "ChatGPT",
  "com.google.android.apps.bard" to "Gemini",
  "com.google.android.googlequicksearchbox" to "Google / Gemini",
  "com.anthropic.claude" to "Claude",
  "ai.deepseek" to "DeepSeek",
  "com.replit.app" to "Replit",
)

fun loadInstalledApps(context: Context): List<ProtectedApp> {
  val packageManager = context.packageManager
  val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
  val installed = packageManager.queryIntentActivities(launcherIntent, PackageManager.MATCH_ALL)
    .map { resolveInfo ->
      ProtectedApp(
        packageName = resolveInfo.activityInfo.packageName,
        label = resolveInfo.loadLabel(packageManager).toString(),
        suggested = suggestedLabels.containsKey(resolveInfo.activityInfo.packageName),
        installed = true,
      )
    }
    .distinctBy { it.packageName }

  val installedByPackage = installed.associateBy { it.packageName }
  val suggestions = suggestedLabels.map { (packageName, label) ->
    installedByPackage[packageName] ?: ProtectedApp(packageName, label, suggested = true, installed = false)
  }
  return (suggestions + installed)
    .distinctBy { it.packageName }
    .sortedWith(compareByDescending<ProtectedApp> { it.suggested }.thenBy { it.label.lowercase() })
}