package com.mesinha.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Após o aparelho reiniciar, os alarmes agendados são perdidos. Este receiver
 * reagenda a troca diária de frase dos três widgets.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            WidgetScheduler.scheduleDailyUpdate(context, MesinhaWidgetProvider::class.java, 4321)
            WidgetScheduler.scheduleDailyUpdate(context, AlpaquinhaWidgetProvider::class.java, 4322)
            WidgetScheduler.scheduleDailyUpdate(context, CorvinhoWidgetProvider::class.java, 4323)
            WidgetScheduler.scheduleDailyUpdate(context, MeetupWidgetProvider::class.java, 4324)
            // Jardim desabilitado por enquanto (receiver comentado no manifest).
            // WidgetScheduler.scheduleDailyUpdate(context, GardenWidgetProvider::class.java, 4325)
            WidgetScheduler.scheduleDailyUpdate(context, CalendarWidgetProvider::class.java, 4326)
            WidgetScheduler.scheduleDailyUpdate(context, CalendarWeekWidgetProvider::class.java, 4327)
        }
    }
}
