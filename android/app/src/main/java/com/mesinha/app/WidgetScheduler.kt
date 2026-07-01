package com.mesinha.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/**
 * Agenda um disparo diário à meia-noite para trocar a frase dos widgets.
 *
 * Usa um alarme inexato e repetitivo (INTERVAL_DAY) — suficiente, já que a frase
 * só muda 1x por dia. Cada tipo de widget agenda o seu próprio alarme (com um
 * requestCode distinto) apontando para o seu próprio provider.
 */
object WidgetScheduler {

    const val ACTION_DAILY_UPDATE = "com.mesinha.app.ACTION_DAILY_UPDATE"

    fun scheduleDailyUpdate(context: Context, provider: Class<*>, requestCode: Int) {
        val alarmManager =
            context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, provider).apply {
            action = ACTION_DAILY_UPDATE
        }

        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        val pendingIntent =
            PendingIntent.getBroadcast(context, requestCode, intent, flags)

        // Próxima meia-noite (00:00:01 do dia seguinte).
        val nextMidnight = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 1)
            set(Calendar.MILLISECOND, 0)
        }

        alarmManager.setInexactRepeating(
            AlarmManager.RTC,
            nextMidnight.timeInMillis,
            AlarmManager.INTERVAL_DAY,
            pendingIntent
        )
    }
}
