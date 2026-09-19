import java.util.Properties

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("org.jetbrains.kotlin.plugin.compose")
}

val signingProperties = Properties().apply {
  val signingFile = rootProject.file("keystore.properties")
  if (signingFile.exists()) signingFile.inputStream().use(::load)
}

fun signingValue(name: String): String? =
  signingProperties.getProperty(name)?.takeIf { it.isNotBlank() } ?: System.getenv(name)?.takeIf { it.isNotBlank() }

val releaseStoreFile = signingValue("RELEASE_STORE_FILE")
val releaseStorePassword = signingValue("RELEASE_STORE_PASSWORD")
val releaseKeyAlias = signingValue("RELEASE_KEY_ALIAS")
val releaseKeyPassword = signingValue("RELEASE_KEY_PASSWORD")
val hasReleaseSigning = listOf(releaseStoreFile, releaseStorePassword, releaseKeyAlias, releaseKeyPassword).all { !it.isNullOrBlank() }

android {
  namespace = "com.eraseai.firewall"
  compileSdk = 36

  defaultConfig {
    applicationId = "com.eraseai.firewall"
    minSdk = 28
    targetSdk = 36
    versionCode = 8
    versionName = "0.1.7-internal"

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    buildConfigField("String", "API_BASE_URL", "\"https://eraseai.ai/api\"")
    buildConfigField("String", "WEB_BASE_URL", "\"https://eraseai.ai\"")
    buildConfigField("String", "PRIVACY_URL", "\"https://eraseai.ai/privacy\"")
    buildConfigField("String", "PLAY_MANAGE_URL", "\"https://play.google.com/store/account/subscriptions?package=com.eraseai.firewall\"")
  }

  signingConfigs {
    if (hasReleaseSigning) {
      create("release") {
        storeFile = rootProject.file(releaseStoreFile!!)
        storePassword = releaseStorePassword
        keyAlias = releaseKeyAlias
        keyPassword = releaseKeyPassword
      }
    }
  }

  buildTypes {
    debug {
      buildConfigField("String", "QA_SAMPLE_TEXT", "\"My client John Rahman's phone is +8801712345678, email john@example.com, and the API key is sk_live_test_123456789.\"")
    }

    release {
      isMinifyEnabled = true
      isShrinkResources = true
      buildConfigField("String", "QA_SAMPLE_TEXT", "\"\"")
      if (hasReleaseSigning) signingConfig = signingConfigs.getByName("release")
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro",
      )
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  buildFeatures {
    compose = true
    buildConfig = true
  }

}

dependencies {
  val composeBom = platform("androidx.compose:compose-bom:2025.01.01")
  implementation(composeBom)
  androidTestImplementation(composeBom)

  implementation("androidx.core:core-ktx:1.15.0")
  implementation("androidx.activity:activity-compose:1.10.0")
  implementation("androidx.browser:browser:1.8.0")
  implementation("androidx.datastore:datastore-preferences:1.1.2")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
  implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
  implementation("androidx.security:security-crypto:1.1.0-alpha06")

  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.compose.material3:material3:1.3.1")
  implementation("androidx.compose.material:material-icons-extended")

  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("com.android.billingclient:billing-ktx:8.0.0")

  debugImplementation("androidx.compose.ui:ui-tooling")
  debugImplementation("androidx.compose.ui:ui-test-manifest")
}
