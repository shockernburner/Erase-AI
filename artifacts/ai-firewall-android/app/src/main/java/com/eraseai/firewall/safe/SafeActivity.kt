package com.eraseai.firewall.safe

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.eraseai.firewall.ui.BrandCard
import com.eraseai.firewall.ui.BrandHero
import com.eraseai.firewall.ui.theme.BrandMutedForeground
import com.eraseai.firewall.ui.BrandPrimaryButton
import com.eraseai.firewall.ui.BrandSectionLabel
import com.eraseai.firewall.ui.BrandTextButton
import com.eraseai.firewall.ui.theme.EraseAIFirewallTheme

/**
 * Receives "Share → Save to EraseAI Safe" and manages the folders EraseAI Safe mirrors.
 * Everything here stays on the device, so it works without an EraseAI account.
 */
class SafeActivity : ComponentActivity() {

  private lateinit var store: SafeStore

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    store = SafeStore(this)
    val imported = importShared(intent)
    setContent {
      EraseAIFirewallTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
          SafeScreen(store, imported)
        }
      }
    }
  }

  /** Returns a one-line status for what the share brought in, or null when opened directly. */
  private fun importShared(intent: Intent?): String? {
    intent ?: return null
    val uris: List<Uri> = when (intent.action) {
      Intent.ACTION_SEND -> listOfNotNull(intent.streamExtra())
      Intent.ACTION_SEND_MULTIPLE -> intent.streamListExtra()
      else -> return null
    }
    if (uris.isEmpty()) {
      val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.takeIf { it.isNotBlank() } ?: return null
      store.importText(text)
      return "Saved shared text to EraseAI Safe."
    }
    val results = uris.map { store.importToInbox(it) }
    val saved = results.count { it == SafeStore.ImportResult.SAVED }
    val unsupported = results.count { it == SafeStore.ImportResult.UNSUPPORTED }
    val unreadable = results.count { it == SafeStore.ImportResult.UNREADABLE }
    return buildString {
      append("Saved $saved file(s) to EraseAI Safe.")
      if (unsupported > 0) append(" $unsupported not supported (EraseAI Safe reads text, Word, PDF and image files).")
      if (unreadable > 0) append(" $unreadable could not be read — try sharing again from the Files app.")
    }
  }

  @Suppress("DEPRECATION")
  private fun Intent.streamExtra(): Uri? =
    if (Build.VERSION.SDK_INT >= 33) getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    else getParcelableExtra(Intent.EXTRA_STREAM)

  @Suppress("DEPRECATION")
  private fun Intent.streamListExtra(): List<Uri> =
    if (Build.VERSION.SDK_INT >= 33) getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java).orEmpty()
    else getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM).orEmpty()
}

@androidx.compose.runtime.Composable
private fun SafeScreen(store: SafeStore, status: String?) {
  var trees by remember { mutableStateOf(store.grantedTrees()) }
  var files by remember { mutableStateOf(store.inboxFiles().map { it.name }) }
  val pickFolder = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { tree ->
    if (tree != null) {
      store.addTree(tree)
      trees = store.grantedTrees()
    }
  }

  LazyColumn(
    modifier = Modifier.fillMaxSize().safeDrawingPadding(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(
        title = SafeMarker.TAG,
        subtitle = "Attach files to AI apps without their secrets. EraseAI removes keys, card numbers, emails and phone numbers the moment you attach — including text inside PDFs and images, read on this phone.",
      )
    }
    status?.let { item { BrandCard(highlighted = true) { Text(it, style = MaterialTheme.typography.bodyMedium) } } }
    item {
      BrandCard {
        Text("How to attach", style = MaterialTheme.typography.titleMedium)
        Text(
          "In ChatGPT, Gemini or Claude tap + → Files, open the menu (☰) and choose EraseAI Safe. " +
            "Attached names end in \"(EraseAI Safe)\" so the send gate knows the file is clean.",
          style = MaterialTheme.typography.bodySmall,
          color = BrandMutedForeground,
        )
      }
    }
    item { BrandSectionLabel("Folders") }
    items(trees, key = { it.toString() }) { tree ->
      BrandCard {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
          Text(store.treeDisplayName(tree), modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
          BrandTextButton("Remove", onClick = {
            store.removeTree(tree)
            trees = store.grantedTrees()
          })
        }
      }
    }
    item { BrandPrimaryButton("Add a folder", onClick = { pickFolder.launch(null) }, icon = Icons.Default.Add) }
    item { BrandSectionLabel("Shared into Safe") }
    if (files.isEmpty()) {
      item {
        Text(
          "Nothing yet. Share a file to \"Save to EraseAI Safe\" from any app.",
          style = MaterialTheme.typography.bodySmall,
          color = BrandMutedForeground,
        )
      }
    }
    items(files, key = { it }) { name ->
      BrandCard {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
          Text(name, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
          BrandTextButton("Remove", onClick = {
            store.deleteInboxFile(name)
            files = store.inboxFiles().map { it.name }
          })
        }
      }
    }
  }
}
