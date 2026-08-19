package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.RemoteViews

/**
 * Widget duplo (2x4): Corvinho à esquerda, Alpaquinha à direita e dois balões.
 * É responsivo à altura: quando fica baixo (~1 célula) usa um layout compacto
 * com os balões lado a lado, para o texto não cortar.
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
        WidgetScheduler.scheduleDailyUpdate(context, MesinhaWidgetProvider::class.java, 4321)
        PhraseRepository.maybeRefresh(context)
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.scheduleDailyUpdate(context, MesinhaWidgetProvider::class.java, 4321)
        // Numa instalação nova o cache está vazio: sem isto o widget ficaria
        // mostrando a lista embutida de reserva em vez das falas escritas no app.
        PhraseRepository.maybeRefresh(context)
    }

    /**
     * Auto-cura: chamado quando o launcher posiciona ou redimensiona o widget.
     * Como estes widgets não têm atualização própria além do alarme diário, um
     * broadcast de update perdido deixava o balão vazio até a virada do dia.
     */
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        renderWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onRestored(context: Context, oldWidgetIds: IntArray, newWidgetIds: IntArray) {
        val manager = AppWidgetManager.getInstance(context)
        for (id in newWidgetIds) {
            renderWidget(context, manager, id)
        }
    }

    /** Chamado quando o usuário redimensiona o widget: re-renderiza no tamanho novo. */
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        renderWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, MesinhaWidgetProvider::class.java)
            )
            for (id in ids) {
                renderWidget(context, manager, id)
            }
            // Reagenda o próximo (o alarme é one-shot).
            WidgetScheduler.scheduleDailyUpdate(context, MesinhaWidgetProvider::class.java, 4321)
            PhraseRepository.maybeRefresh(context)
        }
    }

    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Altura disponível (dp) para decidir entre layout completo e compacto.
        val minHeight = try {
            appWidgetManager.getAppWidgetOptions(appWidgetId)
                .getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        } catch (_: Exception) {
            0
        }
        // Abaixo de ~2 células (110dp) usa o compacto (balões lado a lado).
        val layout = if (minHeight in 1..104) {
            R.layout.widget_dialogue_compact
        } else {
            R.layout.widget_dialogue
        }

        val dialogue = PhraseRepository.today(context)
        val views = RemoteViews(context.packageName, layout).apply {
            setTextViewText(R.id.tv_corvinho, dialogue.corvinho)
            setTextViewText(R.id.tv_alpaquinha, dialogue.alpaquinha)
            setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        }
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
