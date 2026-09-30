package com.mesinha.app

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Recebe o disparo do despertador (e os eventos que bagunçam o agendamento:
 * relógio/fuso mudou, app atualizado, permissão de alarme exato concedida).
 */
class WakeupReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            WakeupScheduler.ACTION_FIRE -> fire(context, intent)
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

        // Só toca o que ainda existe e está ligado na cópia local (pode ter
        // sido apagado depois do agendamento).
        val validos = WakeupStore.mine(context).filter { it.enabled && it.id in ids }.map { it.id }

        // Um disparo muito atrasado (aparelho desligado, alarme inexato preso
        // no Doze) não toca meia hora depois — seria pior que não tocar.
        val atrasado = System.currentTimeMillis() - time > WakeupRingService.MAX_RING_MS
        if (validos.isNotEmpty() && !atrasado) {
            ContextCompat.startForegroundService(
                context,
                Intent(context, WakeupRingService::class.java)
                    .setAction(WakeupRingService.ACTION_START)
                    .putExtra(WakeupRingService.EXTRA_IDS, validos.joinToString(","))
                    .putExtra(WakeupRingService.EXTRA_OCCURRENCE, WakeupScheduler.occurrenceKey(time))
            )
        }

        // Próximo toque (depois deste).
        WakeupScheduler.reschedule(context, maxOf(time, System.currentTimeMillis()))
    }
}
