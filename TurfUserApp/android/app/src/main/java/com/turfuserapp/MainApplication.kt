package com.turfuserapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(LocalNotificationPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }

  private fun createNotificationChannel() {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val channelId = "turf_notifications"
      val name = "Turf Notifications"
      val descriptionText = "Notifications for Turf bookings, requests, and updates"
      val importance = android.app.NotificationManager.IMPORTANCE_HIGH
      val channel = android.app.NotificationChannel(channelId, name, importance).apply {
        description = descriptionText
        enableLights(true)
        enableVibration(true)
        val audioAttributes = android.media.AudioAttributes.Builder()
          .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
          .build()
        setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, audioAttributes)
      }
      val notificationManager = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
      notificationManager.createNotificationChannel(channel)
    }
  }
}
