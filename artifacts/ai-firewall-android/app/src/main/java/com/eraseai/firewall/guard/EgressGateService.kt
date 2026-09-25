package com.eraseai.firewall.guard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import com.eraseai.firewall.MainActivity
import com.eraseai.firewall.R
import com.eraseai.firewall.data.ProtectedAppsStore
import java.io.FileInputStream
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Optional Strict mode: routes protected AI apps through a local VPN and drops packets while
 * [GuardStateStore.isEgressBlocked] is true. The tunnel is torn down as soon as the guard
 * disarms — leaving the interface open would keep those apps offline even after a safe prompt.
 */
class EgressGateService : VpnService() {

  private var tunInterface: ParcelFileDescriptor? = null
  private var drainThread: Thread? = null
  private val draining = AtomicBoolean(false)
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun onCreate() {
    super.onCreate()
    runningInstance = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    GuardStateStore.init(this)
    if (!GuardStateStore.isEgressBlocked()) {
      tearDownAndStop()
      return START_NOT_STICKY
    }
    try {
      startForeground(NOTIFICATION_ID, buildNotification())
    } catch (err: Exception) {
      GuardLog.warn(
        "egress.foreground.failed",
        GuardStateStore.getArmedPackage(),
        err.message ?: err.javaClass.simpleName,
      )
      tearDownAndStop()
      return START_NOT_STICKY
    }
    if (tunInterface == null) establishTunnel()
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    stopTunnel()
    if (runningInstance === this) runningInstance = null
    super.onDestroy()
  }

  private fun establishTunnel() {
    val prepare = prepare(this)
    if (prepare != null) {
      // Another VPN app connecting takes consent away from us; the settings screen reports it.
      val reason = if (GuardHealth.otherVpnActive(this)) "other-vpn-active" else "vpn-permission-missing"
      GuardLog.warn("egress.tunnel.failed", GuardStateStore.getArmedPackage(), reason)
      tearDownAndStop()
      return
    }
    val packages = ProtectedAppsStore(this).getSelectedPackages()
    if (packages.isEmpty()) {
      GuardLog.warn("egress.tunnel.failed", GuardStateStore.getArmedPackage(), "no-protected-apps")
      tearDownAndStop()
      return
    }
    val builder = Builder()
      .setSession(getString(R.string.egress_vpn_session))
      .setMtu(1500)
      .addAddress("10.64.0.2", 32)
      .addRoute("0.0.0.0", 0)
    packages.forEach { pkg ->
      runCatching { builder.addAllowedApplication(pkg) }
    }
    tunInterface = builder.establish()
    if (tunInterface == null) {
      GuardLog.warn("egress.tunnel.failed", null, "establish returned null")
      tearDownAndStop()
      return
    }
    GuardLog.event("egress.tunnel.up", GuardStateStore.getArmedPackage(), "apps=${packages.size}")
    draining.set(true)
    drainThread = Thread({ drainPackets() }, "EraseAI-EgressDrain").also { it.start() }
  }

  private fun drainPackets() {
    val fd = tunInterface?.fileDescriptor ?: return
    val input = FileInputStream(fd)
    val buffer = ByteArray(32767)
    while (draining.get()) {
      if (!GuardStateStore.isEgressBlocked()) {
        mainHandler.post { tearDownAndStop() }
        break
      }
      try {
        val read = input.read(buffer)
        if (read < 0) break
      } catch (_: InterruptedException) {
        break
      } catch (err: Exception) {
        GuardLog.warn("egress.drain.error", GuardStateStore.getArmedPackage(), err.message ?: "unknown")
        break
      }
    }
    draining.set(false)
  }

  private fun stopTunnel() {
    draining.set(false)
    drainThread?.interrupt()
    drainThread = null
    runCatching { tunInterface?.close() }
    tunInterface = null
    GuardLog.event("egress.tunnel.down", GuardStateStore.getArmedPackage())
  }

  private fun tearDownAndStop() {
    stopTunnel()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  private fun buildNotification(): Notification {
    val channelId = "eraseai_egress_gate"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        channelId,
        getString(R.string.egress_notification_channel),
        NotificationManager.IMPORTANCE_LOW,
      )
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
    val openApp = PendingIntent.getActivity(
      this,
      0,
      Intent(this, MainActivity::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return Notification.Builder(this, channelId)
      .setContentTitle(getString(R.string.egress_notification_title))
      .setContentText(getString(R.string.egress_notification_body))
      .setSmallIcon(R.drawable.eraseai_logo)
      .setContentIntent(openApp)
      .setOngoing(true)
      .build()
  }

  companion object {
    private const val NOTIFICATION_ID = 4102

    @Volatile
    private var runningInstance: EgressGateService? = null

    /** True while EraseAI's own tunnel service is alive, so its VPN is not mistaken for another. */
    val isRunning: Boolean get() = runningInstance != null

    fun stop(context: Context) {
      runningInstance?.tearDownAndStop()
      context.stopService(Intent(context, EgressGateService::class.java))
    }
  }
}
