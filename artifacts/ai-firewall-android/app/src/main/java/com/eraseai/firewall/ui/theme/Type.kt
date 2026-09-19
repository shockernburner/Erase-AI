package com.eraseai.firewall.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Typography = Typography(
  headlineLarge = Typography().headlineLarge.copy(
    fontSize = 30.sp,
    lineHeight = 36.sp,
    fontWeight = FontWeight.Bold,
  ),
  headlineMedium = Typography().headlineMedium.copy(
    fontSize = 25.sp,
    lineHeight = 31.sp,
    fontWeight = FontWeight.Bold,
  ),
  headlineSmall = Typography().headlineSmall.copy(
    fontSize = 21.sp,
    lineHeight = 27.sp,
    fontWeight = FontWeight.Bold,
  ),
  titleLarge = Typography().titleLarge.copy(
    fontSize = 18.sp,
    lineHeight = 24.sp,
    fontWeight = FontWeight.Bold,
  ),
  titleMedium = Typography().titleMedium.copy(
    fontWeight = FontWeight.SemiBold,
  ),
  bodyLarge = Typography().bodyLarge.copy(
    fontSize = 16.sp,
    lineHeight = 24.sp,
  ),
  bodyMedium = Typography().bodyMedium.copy(
    fontSize = 14.sp,
    lineHeight = 21.sp,
  ),
  labelLarge = Typography().labelLarge.copy(
    fontWeight = FontWeight.Bold,
  ),
)
