package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Widget só do Corvinho (Mateus): um balão com um recadinho do Mateus para a
 * Amanda. O conteúdo muda 1x por dia (ver [Dialogues.MATEUS_TO_AMANDA]).
 */
class CorvinhoWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        WidgetScheduler.scheduleDailyUpdate(context, CorvinhoWidgetProvider::class.java, 4323)
        PhraseRepository.maybeRefresh(context)
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.scheduleDailyUpdate(context, CorvinhoWidgetProvider::class.java, 4323)
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

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, CorvinhoWidgetProvider::class.java)
            )
            for (id in ids) {
                renderWidget(context, manager, id)
            }
            // Reagenda o próximo (o alarme é one-shot).
            WidgetScheduler.scheduleDailyUpdate(context, CorvinhoWidgetProvider::class.java, 4323)
            PhraseRepository.maybeRefresh(context)
        }
    }

    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_corvinho).apply {
            setTextViewText(R.id.tv_message, PhraseRepository.mateusToday(context))
            setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        }
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
