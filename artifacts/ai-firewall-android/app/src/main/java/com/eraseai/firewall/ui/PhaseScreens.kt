package com.eraseai.firewall.ui

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import com.eraseai.firewall.ui.theme.BrandBackground
import com.eraseai.firewall.ui.theme.BrandMutedForeground
import com.eraseai.firewall.ui.theme.BrandPrimary
import com.eraseai.firewall.ui.theme.BrandPrimaryBright
import com.eraseai.firewall.ui.theme.BrandSurface
import java.io.File

private val SplashMid = Color(0xFF0F172A)

@Composable
fun BrandedSplashScreen() {
  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(
        Brush.verticalGradient(
          listOf(BrandSurface, SplashMid, BrandBackground),
        ),
      ),
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 28.dp, vertical = 48.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center,
    ) {
      Image(
        painter = painterResource(id = R.drawable.eraseai_shield),
        contentDescription = "EraseAI Firewall",
        modifier = Modifier
          .size(128.dp)
          .clip(RoundedCornerShape(32.dp)),
        contentScale = ContentScale.Fit,
      )
      Spacer(modifier = Modifier.height(28.dp))
      Text(
        text = "EraseAI",
        style = MaterialTheme.typography.displayLarge,
        color = BrandPrimaryBright,
        textAlign = TextAlign.Center,
      )
      Text(
        text = "Firewall",
        style = MaterialTheme.typography.headlineLarge,
        color = MaterialTheme.colorScheme.onBackground,
        textAlign = TextAlign.Center,
      )
      Spacer(modifier = Modifier.height(14.dp))
      Text(
        text = "Stop unwanted data from reaching public AI apps",
        style = MaterialTheme.typography.bodyLarge,
        color = BrandMutedForeground,
        textAlign = TextAlign.Center,
      )
      Spacer(modifier = Modifier.height(36.dp))
      CircularProgressIndicator(
        color = BrandPrimary,
        trackColor = BrandSurface,
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
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BrandHero(
        title = "Dataset Sanitizer",
        subtitle = "Upload CSV, JSON, or TXT. Analyze for PII, apply fixes, then download a cleaned dataset.",
      )
    }
    if (error != null) item { BrandErrorBanner(error) }
    if (status != null) {
      item {
        BrandCard {
          Text(status, style = MaterialTheme.typography.bodyMedium)
        }
      }
    }
    item {
      BrandSecondaryButton(
        text = "Choose file",
        onClick = onPickFile,
        enabled = !loading,
        icon = Icons.Default.Upload,
      )
    }
    upload?.let { result ->
      item {
        BrandCard(highlighted = true) {
          Text(result.name, style = MaterialTheme.typography.titleMedium)
          Text("${result.rowCount} rows · ${result.format.uppercase()}", color = BrandMutedForeground)
        }
      }
      item {
        BrandPrimaryButton(
          text = if (loading) "Working…" else "Analyze dataset",
          onClick = onAnalyze,
          enabled = !loading,
        )
      }
    }
    analysis?.let { result ->
      item {
        BrandCard {
          Text("${result.totalIssues} issues found", style = MaterialTheme.typography.titleMedium)
          Text("Version ${result.version}", color = BrandMutedForeground)
        }
      }
      items(result.summary) { item ->
        BrandCard {
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(item.type)
            Text("${item.count} · ${item.severity}", color = BrandMutedForeground)
          }
        }
      }
      if (result.totalIssues > 0) {
        item {
          BrandPrimaryButton(
            text = "Apply suggested fixes",
            onClick = onApplyFixes,
            enabled = !loading,
          )
        }
      }
      item {
        BrandSecondaryButton(
          text = "Download cleaned file",
          onClick = onDownload,
          enabled = !loading,
          icon = Icons.Default.Download,
        )
      }
    }
    downloadedFile?.let { file ->
      item {
        BrandSecondaryButton(
          text = "Share downloaded file",
          onClick = {
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val share = Intent(Intent.ACTION_SEND).apply {
              type = "application/octet-stream"
              putExtra(Intent.EXTRA_STREAM, uri)
              addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(share, "Share cleaned dataset"))
            onShareDownload()
          },
        )
      }
    }
  }
}
