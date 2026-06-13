package com.eraseai.firewall.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightScheme = lightColorScheme(
  primary = BrandBlue,
  secondary = BrandMint,
  background = BrandBackground,
  surface = BrandBackground,
  onPrimary = BrandInk,
)

private val DarkScheme = darkColorScheme(
  primary = BrandBlue,
  secondary = BrandMint,
)

@Composable
fun EraseAIFirewallTheme(content: @Composable () -> Unit) {
  MaterialTheme(
    colorScheme = LightScheme,
    typography = Typography,
    content = content,
  )
}
