package com.eraseai.firewall.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkScheme = darkColorScheme(
  primary = BrandPrimary,
  onPrimary = BrandBackground,
  primaryContainer = BrandSecondary,
  onPrimaryContainer = BrandForeground,
  secondary = BrandPrimaryBright,
  onSecondary = BrandBackground,
  secondaryContainer = BrandMuted,
  onSecondaryContainer = BrandForeground,
  tertiary = BrandSuccess,
  onTertiary = BrandBackground,
  background = BrandBackground,
  onBackground = BrandForeground,
  surface = BrandSurface,
  onSurface = BrandForeground,
  surfaceVariant = BrandSecondary,
  onSurfaceVariant = BrandMutedForeground,
  outline = BrandBorder,
  outlineVariant = BrandBorder,
  error = BrandDestructive,
  onError = BrandForeground,
  errorContainer = BrandWarningContainer,
  onErrorContainer = BrandOnWarning,
  inverseSurface = BrandForeground,
  inverseOnSurface = BrandBackground,
  inversePrimary = BrandPrimary,
  scrim = Color.Black.copy(alpha = 0.6f),
)

@Composable
fun EraseAIFirewallTheme(content: @Composable () -> Unit) {
  MaterialTheme(
    colorScheme = DarkScheme,
    typography = Typography,
    content = content,
  )
}
