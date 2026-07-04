package com.mesinha.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Endpoint do backend (mesmo do widget). O anon key é público. */
object Backend {
    const val BASE_URL =
        "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce"
    const val ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YmRtbWFxeG51dGJieGlxZW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDE2OTMsImV4cCI6MjA4ODA3NzY5M30.jLMAGrD0jOaId3Tjy1IKDPc4rtDqm4hx-Bv6Mzo0dDw"
}

/** Cria o canal de notificação e exibe notificações recebidas via FCM. */
object NotificationHelper {
    const val CHANNEL_ID = "mesinha_default"

    fun ensureChannel(context: Context) {
        val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Mesinha",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Lembretes e novidades do Mural"
            }
            mgr.createNotificationChannel(channel)
        }
    }

    fun show(context: Context, title: String, body: String) {
        ensureChannel(context)

        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            flags
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(contentIntent)
            .build()

        try {
            NotificationManagerCompat.from(context)
                .notify(System.currentTimeMillis().toInt(), notification)
        } catch (_: SecurityException) {
            // Sem permissão POST_NOTIFICATIONS: ignora silenciosamente.
        }
    }
}

/** Registra o token FCM do aparelho no backend, sob o perfil (Amanda/Mateus). */
object FcmRegistrar {
    fun register(context: Context, profile: String, token: String) {
        Thread {
            try {
                val conn = (URL("${Backend.BASE_URL}/fcm-token").openConnection()
                        as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 8000
                    readTimeout = 8000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("apikey", Backend.ANON_KEY)
                    setRequestProperty("Authorization", "Bearer ${Backend.ANON_KEY}")
                }
                val payload = JSONObject()
                    .put("profile", profile)
                    .put("token", token)
                    .toString()
                conn.outputStream.use { it.write(payload.toByteArray()) }
                conn.responseCode // dispara o envio
                conn.disconnect()
            } catch (_: Exception) {
                // Sem internet / erro: tenta de novo na próxima abertura do app.
            }
        }.start()
    }
}
