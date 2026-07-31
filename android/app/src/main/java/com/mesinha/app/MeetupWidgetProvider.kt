package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Widget "Encontro hoje?" (1x1, quadrado): coração cheio quando o dia de hoje
 * está confirmado no Calendário de Encontros do app, vazio quando ainda não.
 */
class MeetupWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        WidgetScheduler.scheduleDailyUpdate(context, MeetupWidgetProvider::class.java, 4324)
        MeetupRepository.maybeRefresh(context)
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.scheduleDailyUpdate(context, MeetupWidgetProvider::class.java, 4324)
        MeetupRepository.maybeRefresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, MeetupWidgetProvider::class.java)
            )
            for (id in ids) {
                renderWidget(context, manager, id)
            }
            // Reagenda o próximo (o alarme é one-shot).
            WidgetScheduler.scheduleDailyUpdate(context, MeetupWidgetProvider::class.java, 4324)
            MeetupRepository.maybeRefresh(context)
        }
    }

    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val confirmed = MeetupRepository.cachedConfirmedToday(context)
        val heart = if (confirmed) R.drawable.heart_full else R.drawable.heart_empty
        val views = RemoteViews(context.packageName, R.layout.widget_meetup).apply {
            setImageViewResource(R.id.iv_heart, heart)
            setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        }
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
