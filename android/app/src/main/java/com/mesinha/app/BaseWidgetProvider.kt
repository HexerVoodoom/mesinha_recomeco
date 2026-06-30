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
 * Base dos widgets de "conversa do dia". Cuida do agendamento diário, do clique
 * que abre o app e da re-renderização à meia-noite. Cada widget concreto só
 * precisa fornecer seu [scheduleRequestCode] e montar suas [RemoteViews] em
 * [render] (com a frase do dia).
 */
abstract class BaseWidgetProvider : AppWidgetProvider() {

    /** Código único do alarme diário deste tipo de widget. */
    protected abstract val scheduleRequestCode: Int

    /** Monta as RemoteViews já com o conteúdo do dia. */
    protected abstract fun render(context: Context): RemoteViews

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val views = withClick(context, render(context))
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, views)
        }
        WidgetScheduler.scheduleDailyUpdate(context, javaClass, scheduleRequestCode)
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.scheduleDailyUpdate(context, javaClass, scheduleRequestCode)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, javaClass))
            if (ids.isEmpty()) return
            val views = withClick(context, render(context))
            for (id in ids) {
                manager.updateAppWidget(id, views)
            }
        }
    }

    /** Toque em qualquer ponto do widget abre o app Mesinha. */
    private fun withClick(context: Context, views: RemoteViews): RemoteViews {
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
        return views
    }
}
