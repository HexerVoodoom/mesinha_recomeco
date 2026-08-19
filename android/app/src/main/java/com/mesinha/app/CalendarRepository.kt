package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/**
 * Fonte do widget de calendário: consulta o endpoint `/meetup-month` (dias do
 * mês atual com encontro no Calendário de Encontros, com tipo e confirmação)
 * e guarda o JSON em cache local para o widget nunca ficar em branco sem
 * internet. Cache de um mês anterior é descartado na virada do mês.
 */
object CalendarRepository {

    private const val URL_JSON =
        "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/meetup-month"

    private const val PREFS = "calendar_widget"
    private const val KEY_MONTH = "month"
    private const val KEY_DAYS_JSON = "days_json"
    private const val KEY_LAST_FETCH = "last_fetch"

    private const val MIN_INTERVAL_MS = 20L * 60L * 1000L // 20 minutos

    data class MeetupDay(val date: String, val type: String?, val confirmed: Boolean)

    /** Dias com encontro do mês em cache (vazio se o cache é de outro mês). */
    fun cachedDays(context: Context, monthStr: String): List<MeetupDay> {
        val prefs = prefs(context)
        if (prefs.getString(KEY_MONTH, null) != monthStr) return emptyList()
        val json = prefs.getString(KEY_DAYS_JSON, null) ?: return emptyList()
        return try {
            val arr = org.json.JSONArray(json)
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

    /** Dispara um download em segundo plano se já passou o intervalo mínimo. */
    fun maybeRefresh(context: Context) {
        val now = System.currentTimeMillis()
        val last = prefs(context).getLong(KEY_LAST_FETCH, 0L)
        if (now - last < MIN_INTERVAL_MS) return

        val appContext = context.applicationContext
        Thread {
            try {
                fetchAndStore(appContext)
            } catch (_: Exception) {
                // Sem internet / erro: mantém o cache anterior.
            }
        }.start()
    }

    private fun fetchAndStore(context: Context) {
        val root = JSONObject(WidgetCommon.download(URL_JSON))
        val month = root.optString("month", "")
        val daysJson = root.optJSONArray("days")?.toString() ?: "[]"

        val prefs = prefs(context)
        val changed = prefs.getString(KEY_MONTH, null) != month ||
            prefs.getString(KEY_DAYS_JSON, null) != daysJson

        prefs.edit().apply {
            putString(KEY_MONTH, month)
            putString(KEY_DAYS_JSON, daysJson)
            putLong(KEY_LAST_FETCH, System.currentTimeMillis())
        }.apply()

        if (changed) {
            refreshWidget(context)
        }
    }

    private fun refreshWidget(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, CalendarWidgetProvider::class.java))
        if (ids.isEmpty()) return
        context.sendBroadcast(
            Intent(context, CalendarWidgetProvider::class.java).apply {
                action = WidgetScheduler.ACTION_DAILY_UPDATE
            }
        )
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
