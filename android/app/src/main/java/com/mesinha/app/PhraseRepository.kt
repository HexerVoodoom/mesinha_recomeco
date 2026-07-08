package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

/**
 * Fonte das frases dos widgets. Prioriza a lista baixada do backend
 * (endpoint `/widget-phrases`, editável pelo app em Configurações sem
 * reinstalar) e cai para as frases embutidas ([Dialogues]) quando ainda não
 * há cache ou está sem internet.
 *
 * O download roda em segundo plano, é limitado (throttle) e, quando chega uma
 * lista nova, dispara a re-renderização dos três widgets.
 */
object PhraseRepository {

    // Endpoint do Supabase que devolve { dupla, amanda, mateus }. É a mesma
    // fonte editada pelo app em Configurações. O anon key é público (já vai no PWA).
    private const val URL_JSON =
        "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/widget-phrases"
    private const val SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YmRtbWFxeG51dGJieGlxZW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDE2OTMsImV4cCI6MjA4ODA3NzY5M30.jLMAGrD0jOaId3Tjy1IKDPc4rtDqm4hx-Bv6Mzo0dDw"

    private const val PREFS = "widget_phrases"
    private const val KEY_DUPLA = "dupla"
    private const val KEY_AMANDA = "amanda"
    private const val KEY_MATEUS = "mateus"
    private const val KEY_LAST_FETCH = "last_fetch"

    // Não baixa com mais frequência que isso (evita tráfego desnecessário).
    private const val MIN_INTERVAL_MS = 3L * 60L * 60L * 1000L // 3 horas

    // --- Seleção do dia -----------------------------------------------------

    fun today(context: Context): DialoguePair {
        val pool = pool(context)
        return pool[Dialogues.dailyIndex(pool.size)]
    }

    fun amandaToday(context: Context): String {
        val list = amanda(context)
        return list[Dialogues.dailyIndex(list.size)]
    }

    fun mateusToday(context: Context): String {
        val list = mateus(context)
        return list[Dialogues.dailyIndex(list.size)]
    }

    // --- Leitura do cache (ou reserva embutida) -----------------------------

    private fun pool(context: Context): List<DialoguePair> {
        val raw = prefs(context).getString(KEY_DUPLA, null) ?: return Dialogues.DEFAULT_POOL
        return parsePairs(raw) ?: Dialogues.DEFAULT_POOL
    }

    private fun amanda(context: Context): List<String> {
        val raw = prefs(context).getString(KEY_AMANDA, null) ?: return Dialogues.DEFAULT_AMANDA
        return parseStrings(raw) ?: Dialogues.DEFAULT_AMANDA
    }

    private fun mateus(context: Context): List<String> {
        val raw = prefs(context).getString(KEY_MATEUS, null) ?: return Dialogues.DEFAULT_MATEUS
        return parseStrings(raw) ?: Dialogues.DEFAULT_MATEUS
    }

    // --- Atualização a partir do servidor -----------------------------------

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
                // Sem internet / erro: mantém o cache (ou a reserva embutida).
            }
        }.start()
    }

    private fun fetchAndStore(context: Context) {
        val text = download(URL_JSON)
        // Valida antes de gravar: só aceita arrays não vazios.
        val root = org.json.JSONObject(text)
        val editor = prefs(context).edit()
        var changed = false

        root.optJSONArray("dupla")?.let {
            if (it.length() > 0) { editor.putString(KEY_DUPLA, it.toString()); changed = true }
        }
        root.optJSONArray("amanda")?.let {
            if (it.length() > 0) { editor.putString(KEY_AMANDA, it.toString()); changed = true }
        }
        root.optJSONArray("mateus")?.let {
            if (it.length() > 0) { editor.putString(KEY_MATEUS, it.toString()); changed = true }
        }

        editor.putLong(KEY_LAST_FETCH, System.currentTimeMillis())
        editor.apply()

        if (changed) refreshAllWidgets(context)
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

    /** Manda os três widgets se re-renderizarem com a nova lista. */
    private fun refreshAllWidgets(context: Context) {
        val providers = listOf(
            MesinhaWidgetProvider::class.java,
            AlpaquinhaWidgetProvider::class.java,
            CorvinhoWidgetProvider::class.java
        )
        val manager = AppWidgetManager.getInstance(context)
        for (cls in providers) {
            val ids = manager.getAppWidgetIds(ComponentName(context, cls))
            if (ids.isEmpty()) continue
            context.sendBroadcast(
                Intent(context, cls).apply {
                    action = WidgetScheduler.ACTION_DAILY_UPDATE
                }
            )
        }
    }

    // --- Parsing ------------------------------------------------------------

    private fun parsePairs(raw: String): List<DialoguePair>? {
        return try {
            val arr = JSONArray(raw)
            val list = ArrayList<DialoguePair>(arr.length())
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val c = o.optString("corvinho")
                val a = o.optString("alpaquinha")
                if (c.isNotBlank() && a.isNotBlank()) list.add(DialoguePair(c, a))
            }
            if (list.isEmpty()) null else list
        } catch (_: Exception) {
            null
        }
    }

    private fun parseStrings(raw: String): List<String>? {
        return try {
            val arr = JSONArray(raw)
            val list = ArrayList<String>(arr.length())
            for (i in 0 until arr.length()) {
                val s = arr.optString(i)
                if (s.isNotBlank()) list.add(s)
            }
            if (list.isEmpty()) null else list
        } catch (_: Exception) {
            null
        }
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
