package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/**
 * Fonte do estado do widget "Jardim": consulta o endpoint `/garden` (que já é
 * cacheado por dia no servidor) e guarda localmente a sequência, o nível e o
 * recorde, para o widget nunca ficar em branco sem internet.
 */
object GardenRepository {

    private const val URL_JSON =
        "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/garden"

    private const val PREFS = "garden_widget"
    private const val KEY_STREAK = "streak"
    private const val KEY_FROZEN = "frozen"
    private const val KEY_LONGEST = "longest"
    private const val KEY_LEVEL = "level"
    private const val KEY_HAS_DATA = "has_data"
    private const val KEY_LAST_FETCH = "last_fetch"

    // O /garden é recalculado no máximo algumas vezes por dia no servidor;
    // não adianta o widget baixar com mais frequência que isso.
    private const val MIN_INTERVAL_MS = 60L * 60L * 1000L // 1 hora

    data class State(
        val streak: Int,
        val frozen: Boolean,
        val longest: Int,
        val level: Int,
    )

    /** Estado em cache, ou null se nunca baixou nada ainda. */
    fun cachedState(context: Context): State? {
        val prefs = prefs(context)
        if (!prefs.getBoolean(KEY_HAS_DATA, false)) return null
        return State(
            streak = prefs.getInt(KEY_STREAK, 0),
            frozen = prefs.getBoolean(KEY_FROZEN, false),
            longest = prefs.getInt(KEY_LONGEST, 0),
            level = prefs.getInt(KEY_LEVEL, 1),
        )
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
        val streakObj = root.optJSONObject("streak")
        val state = State(
            streak = streakObj?.optInt("current", 0) ?: 0,
            frozen = streakObj?.optBoolean("frozen", false) ?: false,
            longest = streakObj?.optInt("longest", 0) ?: 0,
            level = root.optInt("level", 1),
        )

        val previous = cachedState(context)
        prefs(context).edit().apply {
            putBoolean(KEY_HAS_DATA, true)
            putInt(KEY_STREAK, state.streak)
            putBoolean(KEY_FROZEN, state.frozen)
            putInt(KEY_LONGEST, state.longest)
            putInt(KEY_LEVEL, state.level)
            putLong(KEY_LAST_FETCH, System.currentTimeMillis())
        }.apply()

        if (state != previous) {
            refreshWidget(context)
        }
    }

    private fun refreshWidget(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, GardenWidgetProvider::class.java))
        if (ids.isEmpty()) return
        context.sendBroadcast(
            Intent(context, GardenWidgetProvider::class.java).apply {
                action = WidgetScheduler.ACTION_DAILY_UPDATE
            }
        )
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
