package com.mesinha.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/**
 * Agenda um disparo diário à meia-noite para trocar a frase do widget.
 *
 * Usa um alarme inexato e repetitivo (INTERVAL_DAY) — suficiente, já que a frase
 * só muda 1x por dia e não precisa ser no segundo exato. É leve para a bateria.
 */
object WidgetScheduler {

    const val ACTION_DAILY_UPDATE = "com.mesinha.app.ACTION_DAILY_UPDATE"
    private const val REQUEST_CODE = 4321

    fun scheduleDailyUpdate(context: Context) {
        val alarmManager =
            context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, MesinhaWidgetProvider::class.java).apply {
            action = ACTION_DAILY_UPDATE
        }

        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        val pendingIntent =
            PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)

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
