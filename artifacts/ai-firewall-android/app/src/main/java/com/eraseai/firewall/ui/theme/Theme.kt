package com.eraseai.firewall.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes

private val LightScheme = lightColorScheme(
  primary = BrandBlue,
  onPrimary = BrandInk,
  secondary = BrandMint,
  onSecondary = BrandInk,
  background = BrandBackground,
  surface = BrandSurface,
  surfaceVariant = BrandSurfaceAlt,
  onSurface = BrandInk,
  onSurfaceVariant = BrandMuted,
  outline = BrandBorder,
  error = BrandDanger,
  errorContainer = Color(0xFFFFE8E9),
  onErrorContainer = Color(0xFF5F1720),
)

private val DarkScheme = darkColorScheme(
  primary = BrandBlue,
  secondary = BrandMint,
  background = BrandNavy,
  surface = BrandNavy,
)

private val AppShapes = Shapes(
  extraSmall = RoundedCornerShape(10),
  small = RoundedCornerShape(14),
  medium = RoundedCornerShape(18),
  large = RoundedCornerShape(24),
  extraLarge = RoundedCornerShape(30),
)

@Composable
fun EraseAIFirewallTheme(content: @Composable () -> Unit) {
  MaterialTheme(
    colorScheme = LightScheme,
    typography = Typography,
    shapes = AppShapes,
    content = content,
  )
}
