package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Widget só da Alpaquinha (Amanda): um balão com um recadinho da Amanda para o
 * Mateus. O conteúdo muda 1x por dia (ver [Dialogues.AMANDA_TO_MATEUS]).
 */
class AlpaquinhaWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        WidgetScheduler.scheduleDailyUpdate(context, AlpaquinhaWidgetProvider::class.java, 4322)
        PhraseRepository.maybeRefresh(context)
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.scheduleDailyUpdate(context, AlpaquinhaWidgetProvider::class.java, 4322)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, AlpaquinhaWidgetProvider::class.java)
            )
            for (id in ids) {
                renderWidget(context, manager, id)
            }
            PhraseRepository.maybeRefresh(context)
        }
    }

    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_alpaquinha).apply {
            setTextViewText(R.id.tv_message, PhraseRepository.amandaToday(context))
            setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        }
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
