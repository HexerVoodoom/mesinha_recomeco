package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/**
 * Widget "Calendário de Encontros" (4x3): grade do mês atual (semana começando
 * no domingo), com os dias que têm encontro pintados pela cor do tipo
 * (coração/video game/pegadas; versão suave quando ainda não confirmado) e o
 * dia de hoje com contorno. Os dados vêm do endpoint `/meetup-month` via
 * [CalendarRepository]. O mês segue o fuso de Brasília, igual ao servidor.
 */
class CalendarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        WidgetScheduler.scheduleDailyUpdate(context, CalendarWidgetProvider::class.java, 4326)
        CalendarRepository.maybeRefresh(context)
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.scheduleDailyUpdate(context, CalendarWidgetProvider::class.java, 4326)
        CalendarRepository.maybeRefresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, CalendarWidgetProvider::class.java)
            )
            for (id in ids) {
                renderWidget(context, manager, id)
            }
            // Reagenda o próximo (o alarme é one-shot).
            WidgetScheduler.scheduleDailyUpdate(context, CalendarWidgetProvider::class.java, 4326)
            CalendarRepository.maybeRefresh(context)
        }
    }

    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // "Agora" no fuso de Brasília (UTC-3 fixo, igual ao brazilNow() do servidor).
        val brazil = Calendar.getInstance(TimeZone.getTimeZone("GMT-03:00"))
        val year = brazil.get(Calendar.YEAR)
        val month = brazil.get(Calendar.MONTH) // 0..11
        val today = brazil.get(Calendar.DAY_OF_MONTH)
        val monthStr = String.format(Locale.US, "%04d-%02d", year, month + 1)

        val meetupByDay = CalendarRepository.cachedDays(context, monthStr)
            .associateBy { it.date }

        val first = Calendar.getInstance(TimeZone.getTimeZone("GMT-03:00")).apply {
            set(year, month, 1)
        }
        val firstWeekday = first.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY // 0=domingo
        val daysInMonth = first.getActualMaximum(Calendar.DAY_OF_MONTH)

        val views = RemoteViews(context.packageName, R.layout.widget_calendar)
        views.setTextViewText(
            R.id.tv_month,
            "${MONTH_NAMES[month]} $year"
        )

        for (cell in 0 until 42) {
            val cellId = CELL_IDS[cell]
            val day = cell - firstWeekday + 1
            if (day < 1 || day > daysInMonth) {
                views.setTextViewText(cellId, "")
                views.setInt(cellId, "setBackgroundResource", 0)
                continue
            }
            views.setTextViewText(cellId, day.toString())

            val dateStr = String.format(Locale.US, "%s-%02d", monthStr, day)
            val meetup = meetupByDay[dateStr]
            val background = when {
                meetup != null -> dayBackground(meetup)
                day == today -> R.drawable.day_today
                else -> 0
            }
            views.setInt(cellId, "setBackgroundResource", background)
            views.setTextColor(
                cellId,
                when {
                    meetup?.confirmed == true -> Color.WHITE
                    day == today -> Color.parseColor("#4D989B")
                    else -> Color.parseColor("#1A1A1A")
                }
            )
        }

        views.setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun dayBackground(meetup: CalendarRepository.MeetupDay): Int =
        when (meetup.type) {
            "videogame" -> if (meetup.confirmed) R.drawable.day_meetup_videogame
            else R.drawable.day_meetup_videogame_soft
            "pegadas" -> if (meetup.confirmed) R.drawable.day_meetup_pegadas
            else R.drawable.day_meetup_pegadas_soft
            else -> if (meetup.confirmed) R.drawable.day_meetup_coracao
            else R.drawable.day_meetup_coracao_soft
        }

    companion object {
        private val MONTH_NAMES = arrayOf(
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        )

        private val CELL_IDS = intArrayOf(
            R.id.c0, R.id.c1, R.id.c2, R.id.c3, R.id.c4, R.id.c5, R.id.c6,
            R.id.c7, R.id.c8, R.id.c9, R.id.c10, R.id.c11, R.id.c12, R.id.c13,
            R.id.c14, R.id.c15, R.id.c16, R.id.c17, R.id.c18, R.id.c19, R.id.c20,
            R.id.c21, R.id.c22, R.id.c23, R.id.c24, R.id.c25, R.id.c26, R.id.c27,
            R.id.c28, R.id.c29, R.id.c30, R.id.c31, R.id.c32, R.id.c33, R.id.c34,
            R.id.c35, R.id.c36, R.id.c37, R.id.c38, R.id.c39, R.id.c40, R.id.c41
        )
    }
}
