package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.graphics.Color
import android.widget.RemoteViews
import java.util.Calendar

/**
 * Widget "Calendário da semana" (4x1): a semana atual em uma linha (domingo a
 * sábado), com os dias que têm encontro pintados pela cor do tipo (versão
 * suave quando ainda não confirmado) e o dia de hoje com contorno. Mesma fonte
 * do calendário mensal ([CalendarRepository]) — a diferença é o recorte.
 *
 * Quando a semana cruza a virada do mês, os DOIS meses são pedidos ao
 * servidor, senão os dias do outro mês apareceriam sempre vazios.
 */
class CalendarWeekWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        agendarEAtualizar(context)
    }

    override fun onEnabled(context: Context) {
        agendarEAtualizar(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == WidgetScheduler.ACTION_DAILY_UPDATE) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, CalendarWeekWidgetProvider::class.java)
            )
            for (id in ids) {
                renderWidget(context, manager, id)
            }
            // Reagenda o próximo (o alarme é one-shot).
            agendarEAtualizar(context)
        }
    }


    /**
     * Reagenda o alarme diário e pede os dados novos. Embrulhado em try/catch
     * de propósito: uma exceção aqui escaparia do BroadcastReceiver e mataria
     * o processo do app — derrubando junto os broadcasts de update que
     * estivessem na fila para os outros widgets.
     */
    private fun agendarEAtualizar(context: Context) {
        try {
            WidgetScheduler.scheduleDailyUpdate(context, CalendarWeekWidgetProvider::class.java, 4327)
            CalendarRepository.maybeRefresh(context, weekMonths())
        } catch (_: Exception) {
            // O desenho já aconteceu; perder o agendamento é bem menos grave
            // do que derrubar o app.
        }
    }

    /**
     * Chamado quando o launcher posiciona ou redimensiona o widget. Serve de
     * auto-cura: um widget que ficou preso no layout inicial (porque o
     * broadcast de update se perdeu) volta a desenhar aqui.
     */
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        renderWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onRestored(context: Context, oldWidgetIds: IntArray, newWidgetIds: IntArray) {
        val manager = AppWidgetManager.getInstance(context)
        for (id in newWidgetIds) {
            renderWidget(context, manager, id)
        }
    }

    /**
     * Desenha o widget. Uma exceção aqui deixaria o widget preso no layout
     * inicial — caixa vazia e sem clique, indistinguível de "quebrado" — então
     * o erro vira um texto visível, num layout de emergência separado (reusar
     * o layout que pode ter falhado tornaria este try/catch inútil).
     */
    private fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        try {
            draw(context, appWidgetManager, appWidgetId)
        } catch (e: Exception) {
            try {
                val fallback = RemoteViews(context.packageName, R.layout.widget_fallback).apply {
                    setTextViewText(R.id.tv_erro, "Calendário: ${e.javaClass.simpleName}")
                    setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
                }
                appWidgetManager.updateAppWidget(appWidgetId, fallback)
            } catch (_: Exception) {
                // Widget quebrado é melhor que processo derrubado: uma exceção
                // escapando daqui mataria o app e levaria junto os broadcasts
                // enfileirados para os outros widgets.
            }
        }
    }

    private fun draw(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val todayStr = WidgetCommon.dateStrOf(WidgetCommon.brazilCalendar())
        val sunday = firstDayOfWeek()
        val meetupByDay = CalendarRepository.cachedDaysByDate(context, weekMonths())

        val views = RemoteViews(context.packageName, R.layout.widget_calendar_week)

        val day = sunday.clone() as Calendar
        for (index in 0 until 7) {
            val dateStr = WidgetCommon.dateStrOf(day)
            val meetup = meetupByDay[dateStr]
            val isToday = dateStr == todayStr

            views.setTextViewText(NUMBER_IDS[index], day.get(Calendar.DAY_OF_MONTH).toString())
            views.setTextViewText(LABEL_IDS[index], WidgetCommon.WEEKDAY_INITIALS[index])
            views.setInt(
                NUMBER_IDS[index],
                "setBackgroundResource",
                when {
                    meetup != null -> CalendarRepository.dayBackground(meetup)
                    isToday -> R.drawable.day_today
                    else -> 0
                }
            )
            views.setTextColor(
                NUMBER_IDS[index],
                when {
                    meetup?.confirmed == true -> Color.WHITE
                    isToday -> Color.parseColor("#4D989B")
                    else -> Color.parseColor("#1A1A1A")
                }
            )
            day.add(Calendar.DAY_OF_YEAR, 1)
        }

        // Cabeçalho: "18 – 24 de Agosto" (ou os dois meses, quando a semana vira).
        val last = (sunday.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, 6) }
        val startMonth = WidgetCommon.MONTH_NAMES[sunday.get(Calendar.MONTH)]
        val endMonth = WidgetCommon.MONTH_NAMES[last.get(Calendar.MONTH)]
        val title = if (startMonth == endMonth) {
            "${sunday.get(Calendar.DAY_OF_MONTH)} – ${last.get(Calendar.DAY_OF_MONTH)} de $startMonth"
        } else {
            "${sunday.get(Calendar.DAY_OF_MONTH)} de $startMonth – " +
                "${last.get(Calendar.DAY_OF_MONTH)} de $endMonth"
        }
        views.setTextViewText(R.id.tv_week, title)

        views.setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    /** Domingo da semana atual (fuso de Brasília). */
    private fun firstDayOfWeek(): Calendar = WidgetCommon.brazilCalendar().apply {
        add(Calendar.DAY_OF_YEAR, -(get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY))
    }

    /** Meses tocados pela semana atual (um, ou dois na virada do mês). */
    private fun weekMonths(): List<String> {
        val sunday = firstDayOfWeek()
        val saturday = (sunday.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, 6) }
        return listOf(WidgetCommon.monthStrOf(sunday), WidgetCommon.monthStrOf(saturday)).distinct()
    }

    companion object {
        private val LABEL_IDS = intArrayOf(
            R.id.wl0, R.id.wl1, R.id.wl2, R.id.wl3, R.id.wl4, R.id.wl5, R.id.wl6
        )
        private val NUMBER_IDS = intArrayOf(
            R.id.wd0, R.id.wd1, R.id.wd2, R.id.wd3, R.id.wd4, R.id.wd5, R.id.wd6
        )
    }
}
