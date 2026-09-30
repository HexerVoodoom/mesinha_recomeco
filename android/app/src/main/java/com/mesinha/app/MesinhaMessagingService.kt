package com.mesinha.app

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Recebe as mensagens do Firebase Cloud Messaging.
 *
 * - [onNewToken]: o token do aparelho mudou → registra no backend (se já sabemos
 *   quem está logado).
 * - [onMessageReceived]: mensagem recebida com o app em primeiro plano → mostra
 *   a notificação manualmente. (Com o app em segundo plano, o próprio FCM exibe.)
 */
class MesinhaMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        val prefs = getSharedPreferences("fcm", MODE_PRIVATE)
        prefs.edit().putString("token", token).apply()
        val profile = prefs.getString("profile", null)
        if (!profile.isNullOrEmpty()) {
            FcmRegistrar.register(applicationContext, profile, token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Despertador: mensagem só de dados, sem nada na tela. O outro criou ou
        // mudou um despertador — baixa a lista e reagenda aqui mesmo (esta
        // chamada já roda fora da thread principal).
        if (message.data["type"] == "wakeup-sync") {
            // Primeiro baixa e reagenda (cabe na janela de ~20s do FCM); a fila
            // de avisos pendentes vai numa thread à parte pra não segurar isso.
            WakeupSync.syncNow(applicationContext, flush = false)
            Thread { WakeupApi.flushQueue(applicationContext) }.start()
            return
        }
        val title = message.notification?.title ?: message.data["title"] ?: "Mesinha"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        NotificationHelper.show(this, title, body)
    }
}
