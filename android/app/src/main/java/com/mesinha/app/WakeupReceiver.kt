package com.mesinha.app

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import org.json.JSONObject

/**
 * Recebe o disparo do despertador (e os eventos que bagunçam o agendamento:
 * relógio/fuso mudou, app atualizado, permissão de alarme exato mudou), além
 * da retentativa da fila de avisos pro servidor.
 */
class WakeupReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            WakeupScheduler.ACTION_FIRE -> fire(context, intent)
            WakeupScheduler.ACTION_RETRY_REPORTS -> {
                val pending = goAsync()
                Thread {
                    try { WakeupApi.flushQueue(context.applicationContext) } finally { pending.finish() }
                }.start()
            }
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED ->
                WakeupScheduler.reschedule(context)
        }
    }

    private fun fire(context: Context, intent: Intent) {
        val time = intent.getLongExtra(WakeupScheduler.EXTRA_TIME, System.currentTimeMillis())
        val ids = intent.getStringExtra(WakeupScheduler.EXTRA_IDS)
            ?.split(",")?.filter { it.isNotBlank() }.orEmpty()
        val occurrence = WakeupScheduler.occurrenceKey(time)

        // O próximo toque é agendado ANTES de tudo: se algo abaixo falhar, o
        // despertador de amanhã continua garantido.
        WakeupScheduler.reschedule(context, time)

        // Só toca o que ainda existe e está ligado na cópia local (pode ter
        // sido apagado depois do agendamento).
        val validos = WakeupStore.mine(context)
            .filter { it.enabled && it.id in ids && !WakeupStore.isHandled(context, "${it.id}|$occurrence") }
            .map { it.id }
        if (validos.isEmpty()) return

        // Um disparo muito atrasado (aparelho desligado, alarme preso no Doze)
        // não toca meia hora depois — seria pior que não tocar. Mas avisa o
        // servidor, pra quem criou não ficar sem saber.
        if (System.currentTimeMillis() - time > WakeupRingService.MAX_RING_MS) {
            val profile = WakeupStore.profile(context) ?: return
            val pending = goAsync()
            Thread {
                try {
                    for (id in validos) {
                        WakeupApi.reportNow(context, "/wakeups/$id/ring", JSONObject()
                            .put("profile", profile).put("occurrence", occurrence).put("status", "missed")
                            .put("at", WakeupScheduler.isoUtc(System.currentTimeMillis())))
                    }
                } finally { pending.finish() }
            }.start()
            return
        }

        val start = Intent(context, WakeupRingService::class.java)
            .setAction(WakeupRingService.ACTION_START)
            .putExtra(WakeupRingService.EXTRA_IDS, validos.joinToString(","))
            .putExtra(WakeupRingService.EXTRA_OCCURRENCE, occurrence)
        try {
            ContextCompat.startForegroundService(context, start)
        } catch (e: Exception) {
            // O Android não deixou subir o serviço (ex.: alarme que não é
            // "despertador" no Android 12+). Plano B: notificação de alarme com
            // tela cheia — tocar nela abre a tela do despertador, e de lá (em
            // primeiro plano) o serviço sobe e toca a música.
            Log.w("Wakeup", "Não deu pra subir o serviço do despertador", e)
            WakeupRingService.postFallbackNotification(context, validos, occurrence)
        }
    }
}
