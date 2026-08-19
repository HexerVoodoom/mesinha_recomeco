package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Widget "Jardim" (2x2): mostra a sequência atual do casal (🔥, ou 💤 quando
 * está congelada esperando a atividade de hoje) e o nível do jardim,
 * consultando o endpoint `/garden` via [GardenRepository].
 */
class GardenWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        WidgetScheduler.scheduleDailyUpdate(context, GardenWidgetProvider::class.java, 4325)
        GardenRepository.maybeRefresh(context)
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.scheduleDailyUpdate(context, GardenWidgetProvider::class.java, 4325)
        GardenRepository.maybeRefresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, GardenWidgetProvider::class.java)
            )
            for (id in ids) {
                renderWidget(context, manager, id)
            }
            // Reagenda o próximo (o alarme é one-shot).
            WidgetScheduler.scheduleDailyUpdate(context, GardenWidgetProvider::class.java, 4325)
            GardenRepository.maybeRefresh(context)
        }
    }

    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val state = GardenRepository.cachedState(context)
        val views = RemoteViews(context.packageName, R.layout.widget_garden).apply {
            if (state == null) {
                setTextViewText(R.id.tv_streak, "🌱")
                setTextViewText(R.id.tv_streak_label, context.getString(R.string.widget_garden_loading))
                setTextViewText(R.id.tv_level, "")
            } else {
                val emoji = if (state.frozen) "💤" else "🔥"
                setTextViewText(R.id.tv_streak, "$emoji ${state.streak}")
                val label = if (state.streak == 1) {
                    context.getString(R.string.widget_garden_day_streak)
                } else {
                    context.getString(R.string.widget_garden_days_streak)
                }
                setTextViewText(R.id.tv_streak_label, label)
                setTextViewText(
                    R.id.tv_level,
                    context.getString(R.string.widget_garden_level, state.level, state.longest)
                )
            }
            setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        }
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
