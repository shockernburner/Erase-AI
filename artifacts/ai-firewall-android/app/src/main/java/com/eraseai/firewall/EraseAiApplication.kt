package com.eraseai.firewall

import android.app.Application
import com.eraseai.firewall.guard.GuardStateStore

/** Ensures shared guard prefs are ready before Accessibility or IME services start. */
class EraseAiApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    GuardStateStore.init(this)
  }
}
