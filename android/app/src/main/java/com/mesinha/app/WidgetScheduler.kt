package com.mesinha.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/**
 * Agenda a troca diária de frase dos widgets (à meia-noite).
 *
 * Usa um alarme ONE-SHOT `setAndAllowWhileIdle` com `RTC_WAKEUP`, que dispara
 * mesmo com o aparelho em Doze / bateria otimizada (sem exigir permissão de
 * alarme exato). Como é one-shot, cada disparo REAGENDA o próximo — por isso os
 * providers chamam [scheduleDailyUpdate] de novo ao receberem o disparo.
 *
 * (O `setInexactRepeating` antigo era descartado pelo Doze em vários OEMs, o que
 * fazia o widget "congelar" a frase depois de um dia.)
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

        // Próxima meia-noite (00:00:05 do dia seguinte).
        val nextMidnight = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 5)
            set(Calendar.MILLISECOND, 0)
        }

        // Dispara mesmo em Doze; não exige SCHEDULE_EXACT_ALARM.
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            nextMidnight.timeInMillis,
            pendingIntent
        )
    }
}
