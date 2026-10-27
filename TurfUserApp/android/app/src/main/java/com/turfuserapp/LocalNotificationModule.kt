package com.turfuserapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class LocalNotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LocalNotificationModule"

    private fun ensureChannel(notificationManager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = "turf_notifications"
            val existing = notificationManager.getNotificationChannel(channelId)
            if (existing == null) {
                val channel = NotificationChannel(
                    channelId,
                    "Turf Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifications for Turf bookings, requests, and updates"
                    enableLights(true)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 250, 250)
                    val audioAttributes = AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build()
                    setSound(Settings.System.DEFAULT_NOTIFICATION_URI, audioAttributes)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                }
                notificationManager.createNotificationChannel(channel)
            }
        }
    }

    @ReactMethod
    fun showNotification(title: String, body: String, data: ReadableMap?) {
        try {
            val channelId = "turf_notifications"
            val notificationManager =
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            ensureChannel(notificationManager)

            val intent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                if (data != null) {
                    val map = data.toHashMap()
                    for ((k, v) in map) {
                        putExtra(k, v?.toString() ?: "")
                    }
                }
            }

            val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val pendingIntent = PendingIntent.getActivity(
                reactContext,
                System.currentTimeMillis().toInt(),
                intent,
                pendingIntentFlags
            )

            val largeIconBitmap = try {
                BitmapFactory.decodeResource(reactContext.resources, R.drawable.ic_notification_large)
            } catch (e: Exception) {
                null
            }

            val notificationId = (System.currentTimeMillis() % 100000).toInt()

            val builder = NotificationCompat.Builder(reactContext, channelId)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setSound(Settings.System.DEFAULT_NOTIFICATION_URI)
                .setVibrate(longArrayOf(0, 250, 250, 250))

            if (largeIconBitmap != null) {
                builder.setLargeIcon(largeIconBitmap)
            }

            notificationManager.notify(notificationId, builder.build())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun getInitialNotification(promise: com.facebook.react.bridge.Promise) {
        try {
            val activity = currentActivity ?: reactContext.currentActivity
            val intent = activity?.intent
            val extras = intent?.extras
            if (extras != null && (extras.containsKey("screen") || extras.containsKey("type") || extras.containsKey("tournamentId") || extras.containsKey("bookingId"))) {
                val map = com.facebook.react.bridge.Arguments.createMap()
                for (key in extras.keySet()) {
                    val value = extras.get(key)
                    if (value != null) {
                        map.putString(key, value.toString())
                    }
                }
                intent.replaceExtras(android.os.Bundle())
                promise.resolve(map)
                return
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }
}
