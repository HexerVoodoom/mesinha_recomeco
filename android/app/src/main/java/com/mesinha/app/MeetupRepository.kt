package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Fonte do estado do widget "Encontro hoje?": consulta o endpoint leve
 * `/meetup-today` (que já resolve "hoje" no fuso de Brasília e devolve
 * confirmação + tipo do encontro) e guarda em cache local para o widget nunca
 * ficar em branco sem internet.
 */
object MeetupRepository {

    private const val URL_JSON =
        "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/meetup-today"
    private const val SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YmRtbWFxeG51dGJieGlxZW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDE2OTMsImV4cCI6MjA4ODA3NzY5M30.jLMAGrD0jOaId3Tjy1IKDPc4rtDqm4hx-Bv6Mzo0dDw"

    private const val PREFS = "meetup_today"
    private const val KEY_DATE = "date"
    private const val KEY_CONFIRMED = "confirmed"
    private const val KEY_TYPE = "type"
    private const val KEY_LAST_FETCH = "last_fetch"

    // Não baixa com mais frequência que isso (o widget também se atualiza
    // sozinho a cada 30min via updatePeriodMillis e à meia-noite).
    private const val MIN_INTERVAL_MS = 20L * 60L * 1000L // 20 minutos

    /** Estado atual em cache (ou "vazio" se nunca baixou nada ainda). */
    fun cachedConfirmedToday(context: Context): Boolean {
        val prefs = prefs(context)
        val cachedDate = prefs.getString(KEY_DATE, null) ?: return false
        if (cachedDate != todayStr()) return false // cache de um dia anterior não vale mais
        return prefs.getBoolean(KEY_CONFIRMED, false)
    }

    /** Tipo do encontro confirmado hoje ("coracao" | "videogame" | "pegadas"), ou null. */
    fun cachedTypeToday(context: Context): String? {
        if (!cachedConfirmedToday(context)) return null
        return prefs(context).getString(KEY_TYPE, null)
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
                // Sem internet / erro: mantém o cache (ou o coração vazio).
            }
        }.start()
    }

    private fun fetchAndStore(context: Context) {
        val text = download(URL_JSON)
        val root = JSONObject(text)
        val date = root.optString("date", todayStr())
        val confirmed = root.optBoolean("confirmed", false)
        val type = if (root.isNull("type")) null else root.optString("type", null)

        val previous = prefs(context).getBoolean(KEY_CONFIRMED, false)
        val previousDate = prefs(context).getString(KEY_DATE, null)
        val previousType = prefs(context).getString(KEY_TYPE, null)

        prefs(context).edit().apply {
            putString(KEY_DATE, date)
            putBoolean(KEY_CONFIRMED, confirmed)
            if (type != null) putString(KEY_TYPE, type) else remove(KEY_TYPE)
            putLong(KEY_LAST_FETCH, System.currentTimeMillis())
        }.apply()

        if (date != previousDate || confirmed != previous || type != previousType) {
            refreshWidget(context)
        }
    }

    private fun download(urlStr: String): String {
        val conn = (URL(urlStr).openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            requestMethod = "GET"
            setRequestProperty("apikey", SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
        }
        try {
            if (conn.responseCode != HttpURLConnection.HTTP_OK) {
                throw java.io.IOException("HTTP ${conn.responseCode}")
            }
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    private fun refreshWidget(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, MeetupWidgetProvider::class.java))
        if (ids.isEmpty()) return
        context.sendBroadcast(
            Intent(context, MeetupWidgetProvider::class.java).apply {
                action = WidgetScheduler.ACTION_DAILY_UPDATE
            }
        )
    }

    private fun todayStr(): String {
        // Mesmo fuso (Brasília, UTC-3 fixo) usado pelo servidor em brazilNow().
        val brazilNowMs = System.currentTimeMillis() - 3L * 60L * 60L * 1000L
        return java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }.format(java.util.Date(brazilNowMs))
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
