package com.mesinha.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews

/**
 * Widget de tela inicial (tamanho 2x4) com o Corvinho à esquerda, a Alpaquinha
 * à direita e dois balões de fala no centro. O conteúdo dos balões muda 1x por
 * dia, sorteado de um pool de 32 pares de frases (ver [Dialogues]).
 */
class MesinhaWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        // (Re)agenda a troca diária sempre que o sistema atualiza o widget.
        WidgetScheduler.scheduleDailyUpdate(context)
    }

    override fun onEnabled(context: Context) {
        // Primeiro widget adicionado à tela: garante o agendamento diário.
        WidgetScheduler.scheduleDailyUpdate(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        // Disparo da virada do dia: re-renderiza todos os widgets ativos.
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, MesinhaWidgetProvider::class.java)
            )
            for (id in ids) {
                renderWidget(context, manager, id)
            }
        }
    }

    /**
     * Desenha um widget: aplica o par de falas do dia e o clique que abre o app.
     */
    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val dialogue = Dialogues.today()

        val views = RemoteViews(context.packageName, R.layout.widget_dialogue).apply {
            setTextViewText(R.id.tv_corvinho, dialogue.corvinho)
            setTextViewText(R.id.tv_alpaquinha, dialogue.alpaquinha)
        }

        // Toque em qualquer ponto do widget abre o app Mesinha.
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        val openApp = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java),
            flags
        )
        views.setOnClickPendingIntent(R.id.widget_root, openApp)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
