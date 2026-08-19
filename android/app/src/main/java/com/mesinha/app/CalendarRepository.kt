package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

/**
 * Fonte dos widgets de calendário (mensal e semanal): consulta o endpoint
 * `/meetup-month` (dias com encontro no Calendário de Encontros, com tipo e
 * confirmação) e guarda o resultado em cache local por mês, para o widget
 * nunca ficar em branco sem internet.
 *
 * O cache é por mês (e não "o mês atual") porque a semana do widget semanal
 * cai em DOIS meses na virada — aí ele pede os dois e cada um é guardado na
 * sua chave.
 */
object CalendarRepository {

    private const val URL_JSON =
        "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/meetup-month"

    private const val PREFS = "calendar_widget"

    private const val MIN_INTERVAL_MS = 20L * 60L * 1000L // 20 minutos

    data class MeetupDay(val date: String, val type: String?, val confirmed: Boolean)

    /** Dias com encontro dos meses pedidos, indexados por data ("YYYY-MM-DD"). */
    fun cachedDaysByDate(context: Context, months: List<String>): Map<String, MeetupDay> {
        val result = HashMap<String, MeetupDay>()
        for (month in months.distinct()) {
            for (day in cachedDays(context, month)) {
                result[day.date] = day
            }
        }
        return result
    }

    /** Dias com encontro de um mês ("YYYY-MM") em cache. */
    fun cachedDays(context: Context, monthStr: String): List<MeetupDay> {
        val json = prefs(context).getString(keyDays(monthStr), null) ?: return emptyList()
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).mapNotNull { i ->
                val obj = arr.optJSONObject(i) ?: return@mapNotNull null
                val date = obj.optString("date", "")
                if (date.isEmpty()) return@mapNotNull null
                MeetupDay(
                    date = date,
                    type = if (obj.isNull("type")) null else obj.optString("type", null),
                    confirmed = obj.optBoolean("confirmed", false),
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    /**
     * Baixa em segundo plano os meses pedidos que já passaram do intervalo
     * mínimo, e redesenha os widgets se algum deles mudou.
     */
    fun maybeRefresh(context: Context, months: List<String>) {
        val now = System.currentTimeMillis()
        val stale = months.distinct().filter { month ->
            now - prefs(context).getLong(keyFetch(month), 0L) >= MIN_INTERVAL_MS
        }
        if (stale.isEmpty()) return

        // Marca a tentativa ANTES de sair a thread: na primeira adição do
        // widget, onEnabled e onUpdate chegam quase juntos, e sem isto os dois
        // passariam pela checagem de "vencido" e baixariam o mesmo mês em
        // duplicata.
        for (month in stale) marcarTentativa(context, month)

        val appContext = context.applicationContext
        Thread {
            var changed = false
            for (month in stale) {
                try {
                    if (fetchAndStore(appContext, month)) changed = true
                } catch (_: Exception) {
                    // Sem internet / erro: mantém o cache anterior daquele mês.
                    // A tentativa já foi marcada antes da thread, então o
                    // widget não fica martelando a rede enquanto está offline.
                }
            }
            if (changed) refreshWidgets(appContext)
        }.start()
    }

    /** Baixa um mês e guarda; devolve true se o conteúdo mudou. */
    private fun fetchAndStore(context: Context, monthStr: String): Boolean {
        val root = JSONObject(WidgetCommon.download("$URL_JSON?month=$monthStr"))
        val daysJson = root.optJSONArray("days")?.toString() ?: "[]"

        val prefs = prefs(context)
        val changed = prefs.getString(keyDays(monthStr), null) != daysJson
        prefs.edit()
            .putString(keyDays(monthStr), daysJson)
            .putLong(keyFetch(monthStr), System.currentTimeMillis())
            .apply()
        return changed
    }

    private fun refreshWidgets(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        for (provider in listOf(
            CalendarWidgetProvider::class.java,
            CalendarWeekWidgetProvider::class.java,
        )) {
            if (manager.getAppWidgetIds(ComponentName(context, provider)).isEmpty()) continue
            context.sendBroadcast(
                Intent(context, provider).apply { action = WidgetScheduler.ACTION_DAILY_UPDATE }
            )
        }
    }

    /**
     * Fundo do dia. Segue o mesmo critério do Calendário de Encontros dentro
     * do app (`MeetupCalendar.tsx`): a cor comunica o ESTADO — confirmado ou
     * só proposto —, não o tipo do encontro. O tipo aparece no app pelo ícone
     * dentro da célula, que não cabe num widget desse tamanho.
     */
    fun dayBackground(meetup: MeetupDay, isToday: Boolean = false): Int = when {
        meetup.confirmed && isToday -> R.drawable.day_confirmado_hoje
        meetup.confirmed -> R.drawable.day_confirmado
        isToday -> R.drawable.day_proposto_hoje
        else -> R.drawable.day_proposto
    }

    /** Cor do número do dia, casando com o fundo escolhido acima. */
    fun dayTextColor(meetup: MeetupDay): Int =
        if (meetup.confirmed) android.graphics.Color.WHITE
        else android.graphics.Color.parseColor("#8A5A15")

    /** Marca que houve tentativa de baixar este mês (respeita o intervalo mínimo). */
    private fun marcarTentativa(context: Context, monthStr: String) {
        prefs(context).edit()
            .putLong(keyFetch(monthStr), System.currentTimeMillis())
            .apply()
    }

    private fun keyDays(monthStr: String) = "days:$monthStr"
    private fun keyFetch(monthStr: String) = "fetch:$monthStr"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
