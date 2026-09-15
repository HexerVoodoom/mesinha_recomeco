package com.mesinha.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Após o aparelho reiniciar, os alarmes agendados são perdidos. Este receiver
 * reagenda a troca diária de frase dos três widgets e religa o rastreio
 * contínuo do Mapa, se ele estava ligado.
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

            // Modo "sempre" do Mapa. A partir do Android 12 nem todo app pode
            // subir um serviço em primeiro plano vindo do background — com a
            // permissão "o tempo todo" concedida, este caso é permitido; sem
            // ela, a chamada lança e o rastreio só volta quando o app abrir
            // (o `MainActivity` faz essa autocura). Por isso o try/catch: uma
            // exceção aqui derrubaria também o reagendamento dos widgets.
            try {
                LocationSharing.restartIfEnabled(context)
            } catch (e: Exception) {
                android.util.Log.w("BootReceiver", "Rastreio não pôde religar no boot", e)
            }
        }
    }
}
