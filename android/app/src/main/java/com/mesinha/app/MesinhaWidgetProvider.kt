package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Widget duplo (2x4): Corvinho à esquerda, Alpaquinha à direita e dois balões
 * de fala no centro. O conteúdo muda 1x por dia (ver [Dialogues.POOL]).
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
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.scheduleDailyUpdate(context, MesinhaWidgetProvider::class.java, 4321)
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
        }
    }

    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val dialogue = Dialogues.today()
        val views = RemoteViews(context.packageName, R.layout.widget_dialogue).apply {
            setTextViewText(R.id.tv_corvinho, dialogue.corvinho)
            setTextViewText(R.id.tv_alpaquinha, dialogue.alpaquinha)
            setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        }
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
