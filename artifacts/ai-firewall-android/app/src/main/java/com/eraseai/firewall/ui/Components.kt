package com.eraseai.firewall.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.eraseai.firewall.ui.theme.BrandBorder
import com.eraseai.firewall.ui.theme.BrandMuted
import com.eraseai.firewall.ui.theme.BrandMutedForeground
import com.eraseai.firewall.ui.theme.BrandPrimary
import com.eraseai.firewall.ui.theme.BrandSuccess
import com.eraseai.firewall.ui.theme.BrandSurface

val BrandShape = RoundedCornerShape(16.dp)
val BrandShapeSm = RoundedCornerShape(12.dp)

@Composable
fun BrandHero(
  title: String,
  subtitle: String,
  trailing: (@Composable () -> Unit)? = null,
) {
  Row(
    modifier = Modifier.fillMaxWidth(),
    verticalAlignment = Alignment.Top,
  ) {
    Box(modifier = Modifier.weight(1f)) {
      Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(title, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = BrandMutedForeground)
      }
    }
    if (trailing != null) {
      Spacer(modifier = Modifier.width(8.dp))
      trailing()
    }
  }
}

@Composable
fun BrandCard(
  highlighted: Boolean = false,
  content: @Composable ColumnScope.() -> Unit,
) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = BrandShape,
    colors = CardDefaults.cardColors(containerColor = BrandSurface),
    border = BorderStroke(1.dp, if (highlighted) BrandPrimary.copy(alpha = 0.55f) else BrandBorder),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp),
      content = content,
    )
  }
}

@Composable
fun BrandStatCard(title: String, value: String, accent: Color? = null) {
  BrandCard {
    Text(title, style = MaterialTheme.typography.labelMedium, color = BrandMutedForeground)
    Text(
      value.ifBlank { "—" },
      style = MaterialTheme.typography.titleMedium,
      color = accent ?: MaterialTheme.colorScheme.onSurface,
    )
  }
}

@Composable
fun BrandStatRow(vararg stats: Pair<String, String>) {
  Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
    stats.forEach { (title, value) ->
      Box(modifier = Modifier.weight(1f)) {
        BrandStatCard(title = title, value = value)
      }
    }
  }
}

@Composable
fun BrandPrimaryButton(
  text: String,
  onClick: () -> Unit,
  enabled: Boolean = true,
  icon: ImageVector? = null,
) {
  Button(
    onClick = onClick,
    enabled = enabled,
    modifier = Modifier.fillMaxWidth().height(52.dp),
    shape = BrandShapeSm,
    colors = ButtonDefaults.buttonColors(
      containerColor = BrandPrimary,
      contentColor = MaterialTheme.colorScheme.onPrimary,
      disabledContainerColor = BrandMuted,
      disabledContentColor = BrandMutedForeground,
    ),
    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp),
  ) {
    if (icon != null) {
      Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp))
      Spacer(modifier = Modifier.width(8.dp))
    }
    Text(text, style = MaterialTheme.typography.labelLarge)
  }
}

@Composable
fun BrandSecondaryButton(
  text: String,
  onClick: () -> Unit,
  enabled: Boolean = true,
  icon: ImageVector? = null,
) {
  OutlinedButton(
    onClick = onClick,
    enabled = enabled,
    modifier = Modifier.fillMaxWidth().height(52.dp),
    shape = BrandShapeSm,
    border = BorderStroke(1.dp, BrandBorder),
    colors = ButtonDefaults.outlinedButtonColors(
      contentColor = MaterialTheme.colorScheme.onBackground,
      disabledContentColor = BrandMutedForeground,
    ),
  ) {
    if (icon != null) {
      Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp))
      Spacer(modifier = Modifier.width(8.dp))
    }
    Text(text, style = MaterialTheme.typography.labelLarge)
  }
}

@Composable
fun BrandTextButton(text: String, onClick: () -> Unit, enabled: Boolean = true) {
  TextButton(onClick = onClick, enabled = enabled) {
    Text(text, color = BrandPrimary)
  }
}

@Composable
fun BrandField(
  value: String,
  onValueChange: (String) -> Unit,
  label: String,
  singleLine: Boolean = true,
  minLines: Int = 1,
  visualTransformation: VisualTransformation = VisualTransformation.None,
  fieldModifier: Modifier = Modifier,
) {
  OutlinedTextField(
    value = value,
    onValueChange = onValueChange,
    modifier = fieldModifier.fillMaxWidth(),
    label = { Text(label) },
    singleLine = singleLine,
    minLines = minLines,
    visualTransformation = visualTransformation,
    shape = BrandShapeSm,
    colors = OutlinedTextFieldDefaults.colors(
      focusedBorderColor = BrandPrimary,
      unfocusedBorderColor = BrandBorder,
      focusedLabelColor = BrandPrimary,
      unfocusedLabelColor = BrandMutedForeground,
      cursorColor = BrandPrimary,
      focusedTextColor = MaterialTheme.colorScheme.onBackground,
      unfocusedTextColor = MaterialTheme.colorScheme.onBackground,
      focusedContainerColor = BrandMuted,
      unfocusedContainerColor = BrandMuted,
    ),
  )
}

@Composable
fun BrandErrorBanner(message: String) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = BrandShapeSm,
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.35f)),
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(14.dp),
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.error)
      Spacer(modifier = Modifier.width(10.dp))
      Text(message, color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodyMedium)
    }
  }
}

@Composable
fun BrandStatusBanner(
  title: String,
  body: String,
  active: Boolean,
) {
  val accent = if (active) BrandSuccess else BrandPrimary
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = BrandShape,
    colors = CardDefaults.cardColors(containerColor = BrandSurface),
    border = BorderStroke(1.dp, accent.copy(alpha = 0.45f)),
  ) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .background(
          Brush.horizontalGradient(
            listOf(accent.copy(alpha = 0.14f), Color.Transparent),
          ),
        )
        .padding(16.dp),
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Box(modifier = Modifier.weight(1f)) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
          Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
          Text(body, style = MaterialTheme.typography.bodySmall, color = BrandMutedForeground)
        }
      }
      Text(
        if (active) "ON" else "OFF",
        style = MaterialTheme.typography.labelLarge,
        color = accent,
      )
    }
  }
}

@Composable
fun BrandSectionLabel(text: String) {
  Text(
    text = text.uppercase(),
    style = MaterialTheme.typography.labelMedium,
    color = BrandMutedForeground,
    modifier = Modifier.padding(top = 4.dp),
  )
}

@Composable
fun RowScope.BrandChipButton(
  text: String,
  selected: Boolean,
  onClick: () -> Unit,
) {
  if (selected) {
    Button(
      onClick = onClick,
      modifier = Modifier.weight(1f).height(44.dp),
      shape = BrandShapeSm,
      colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary, contentColor = MaterialTheme.colorScheme.onPrimary),
    ) { Text(text) }
  } else {
    OutlinedButton(
      onClick = onClick,
      modifier = Modifier.weight(1f).height(44.dp),
      shape = BrandShapeSm,
      border = BorderStroke(1.dp, BrandBorder),
    ) { Text(text) }
  }
}
