package com.eraseai.firewall.ui

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.eraseai.firewall.R
import com.eraseai.firewall.data.DatasetAnalysisResult
import com.eraseai.firewall.data.DatasetUploadResult
import java.io.File

private val SplashTop = Color(0xFF0B111E)
private val SplashMid = Color(0xFF0F172A)
private val SplashBottom = Color(0xFF070A13)
private val SplashAccent = Color(0xFF0DCCF2)
private val SplashMuted = Color(0xFF94A3B8)
private val SplashTitle = Color(0xFFF8FAFC)

@Composable
fun BrandedSplashScreen() {
  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(
        Brush.verticalGradient(listOf(SplashTop, SplashMid, SplashBottom)),
      ),
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 28.dp, vertical = 40.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center,
    ) {
      Image(
        painter = painterResource(id = R.drawable.eraseai_shield),
        contentDescription = "EraseAI shield",
        modifier = Modifier
          .size(120.dp)
          .clip(RoundedCornerShape(28.dp)),
        contentScale = ContentScale.Fit,
      )
      Spacer(Modifier.height(28.dp))
      Text(
        text = "EraseAI",
        style = MaterialTheme.typography.headlineLarge,
        color = SplashTitle,
        textAlign = TextAlign.Center,
      )
      Spacer(Modifier.height(12.dp))
      Text(
        text = "EraseAI — the firewall that stops unwanted data from reaching public AI apps",
        style = MaterialTheme.typography.bodyLarge,
        color = SplashMuted,
        textAlign = TextAlign.Center,
      )
      Spacer(Modifier.height(32.dp))
      CircularProgressIndicator(
        color = SplashAccent,
        trackColor = Color(0xFF1E293B),
        strokeWidth = 3.dp,
        modifier = Modifier.size(36.dp),
      )
    }
  }
}

@Composable
fun DatasetSanitizerScreen(
  loading: Boolean,
  error: String?,
  upload: DatasetUploadResult?,
  analysis: DatasetAnalysisResult?,
  status: String?,
  downloadedFile: File?,
  onPickFile: () -> Unit,
  onAnalyze: () -> Unit,
  onApplyFixes: () -> Unit,
  onDownload: () -> Unit,
  onShareDownload: () -> Unit,
) {
  val context = LocalContext.current
  LazyColumn(
    modifier = Modifier.fillMaxSize().padding(16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      Text("Dataset Sanitizer", style = MaterialTheme.typography.headlineSmall)
      Text("Upload CSV, JSON, or TXT training data. Analyze for PII and quality issues, apply fixes, then download a cleaned dataset.")
    }
    if (error != null) {
      item { Text(error, color = MaterialTheme.colorScheme.error) }
    }
    if (status != null) {
      item { Text(status) }
    }
    item {
      OutlinedButton(onClick = onPickFile, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
        androidx.compose.material3.Icon(Icons.Default.Upload, null)
        Text("  Choose file")
      }
    }
    upload?.let { result ->
      item {
        Card(Modifier.fillMaxWidth()) {
          Column(Modifier.padding(12.dp)) {
            Text(result.name, style = MaterialTheme.typography.titleMedium)
            Text("${result.rowCount} rows · ${result.format.uppercase()}")
          }
        }
      }
      item {
        Button(onClick = onAnalyze, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
          Text(if (loading) "Working…" else "Analyze dataset")
        }
      }
    }
    analysis?.let { result ->
      item {
        Card(Modifier.fillMaxWidth()) {
          Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("${result.totalIssues} issues found", style = MaterialTheme.typography.titleMedium)
            Text("Version ${result.version}")
          }
        }
      }
      items(result.summary) { item ->
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Text(item.type)
          Text("${item.count} · ${item.severity}")
        }
      }
      if (result.totalIssues > 0) {
        item {
          Button(onClick = onApplyFixes, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
            Text("Apply suggested fixes")
          }
        }
      }
      item {
        OutlinedButton(onClick = onDownload, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
          androidx.compose.material3.Icon(Icons.Default.Download, null)
          Text("  Download cleaned file")
        }
      }
    }
    downloadedFile?.let { file ->
      item {
        OutlinedButton(onClick = {
          val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
          val share = Intent(Intent.ACTION_SEND).apply {
            type = "application/octet-stream"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
          context.startActivity(Intent.createChooser(share, "Share cleaned dataset"))
          onShareDownload()
        }, modifier = Modifier.fillMaxWidth()) {
          Text("Share downloaded file")
        }
      }
    }
  }
}
