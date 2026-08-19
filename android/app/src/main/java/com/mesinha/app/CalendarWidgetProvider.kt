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
import java.util.Locale

/**
 * Widget "Calendário do mês" (4x3): grade do mês atual (semana começando no
 * domingo), com os dias que têm encontro pintados pela cor do tipo
 * (coração/video game/pegadas; versão suave quando ainda não confirmado) e o
 * dia de hoje com contorno. Os dados vêm do endpoint `/meetup-month` via
 * [CalendarRepository]. O mês segue o fuso de Brasília, igual ao servidor.
 *
 * A versão de uma linha só, com a semana atual, é o [CalendarWeekWidgetProvider].
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
                ComponentName(context, CalendarWidgetProvider::class.java)
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
            WidgetScheduler.scheduleDailyUpdate(context, CalendarWidgetProvider::class.java, 4326)
            CalendarRepository.maybeRefresh(context, listOf(WidgetCommon.currentMonthStr()))
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
        // "Agora" no fuso de Brasília (UTC-3 fixo, igual ao brazilNow() do servidor).
        val brazil = WidgetCommon.brazilCalendar()
        val year = brazil.get(Calendar.YEAR)
        val month = brazil.get(Calendar.MONTH) // 0..11
        val today = brazil.get(Calendar.DAY_OF_MONTH)
        val monthStr = String.format(Locale.US, "%04d-%02d", year, month + 1)

        val meetupByDay = CalendarRepository.cachedDaysByDate(context, listOf(monthStr))

        val first = WidgetCommon.brazilCalendar().apply { set(year, month, 1) }
        val firstWeekday = first.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY // 0=domingo
        val daysInMonth = first.getActualMaximum(Calendar.DAY_OF_MONTH)

        val views = RemoteViews(context.packageName, R.layout.widget_calendar)
        views.setTextViewText(R.id.tv_month, "${WidgetCommon.MONTH_NAMES[month]} $year")

        for (cell in 0 until 42) {
            val cellId = CELL_IDS[cell]
            val day = cell - firstWeekday + 1
            if (day < 1 || day > daysInMonth) {
                // Fora do mês: o app mostra o número esmaecido (opacity-30),
                // não uma célula vazia — é o que dá a sensação de grade contínua.
                val vizinho = (first.clone() as Calendar).apply {
                    add(Calendar.DAY_OF_MONTH, day - 1)
                }
                views.setTextViewText(cellId, vizinho.get(Calendar.DAY_OF_MONTH).toString())
                views.setInt(cellId, "setBackgroundResource", 0)
                views.setTextColor(cellId, Color.parseColor("#4D2B2A28"))
                continue
            }
            views.setTextViewText(cellId, day.toString())

            val dateStr = String.format(Locale.US, "%s-%02d", monthStr, day)
            val meetup = meetupByDay[dateStr]
            val background = when {
                meetup != null -> CalendarRepository.dayBackground(meetup, day == today)
                day == today -> R.drawable.day_hoje
                else -> 0
            }
            views.setInt(cellId, "setBackgroundResource", background)
            views.setTextColor(
                cellId,
                when {
                    meetup != null -> CalendarRepository.dayTextColor(meetup)
                    else -> Color.parseColor("#2B2A28") // --foreground do app
                }
            )
        }

        views.setOnClickPendingIntent(R.id.widget_root, WidgetCommon.openAppIntent(context))
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    companion object {
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
