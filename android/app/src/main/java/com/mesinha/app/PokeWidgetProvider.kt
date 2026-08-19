package com.mesinha.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import android.widget.Toast
import org.json.JSONObject

/**
 * Widget "Poke" (1x1): um botão de cutucada. Ao tocar, envia direto a
 * notificação push pro outro (endpoint `/nudge`), com a mensagem escolhida na
 * configuração do widget — sem precisar abrir o app. O servidor limita a
 * 1 cutucada a cada 3 min por pessoa; quando cai no limite, o widget mostra a
 * mensagem amigável do servidor num Toast.
 */
class PokeWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            PokeConfig.delete(context, id)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_POKE) {
            val widgetId = intent.getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            )
            sendPoke(context, widgetId)
        }
    }

    /** Envia a cutucada em segundo plano e mostra o resultado num Toast. */
    private fun sendPoke(context: Context, widgetId: Int) {
        val from = PokeConfig.from(context, widgetId)
        if (from == null) {
            Toast.makeText(context, R.string.widget_poke_not_configured, Toast.LENGTH_LONG).show()
            return
        }
        val message = PokeConfig.message(context, widgetId)

        // goAsync mantém o receiver vivo enquanto a thread faz o POST.
        val pendingResult = goAsync()
        val appContext = context.applicationContext
        val mainHandler = Handler(Looper.getMainLooper())
        Thread {
            val toastText: String = try {
                val body = JSONObject().apply {
                    put("from", from)
                    if (!message.isNullOrBlank()) put("message", message)
                }
                val (code, responseText) = WidgetCommon.postJson(URL_NUDGE, body.toString())
                if (code in 200..299) {
                    val to = if (from == "Amanda") "Mateus" else "Amanda"
                    appContext.getString(R.string.widget_poke_sent, to)
                } else {
                    // O servidor devolve mensagem amigável (ex.: rate limit).
                    val serverError = try {
                        JSONObject(responseText).optString("error", "")
                    } catch (_: Exception) {
                        ""
                    }
                    serverError.ifBlank { appContext.getString(R.string.widget_poke_failed) }
                }
            } catch (_: Exception) {
                appContext.getString(R.string.widget_poke_failed)
            } finally {
                pendingResult.finish()
            }
            mainHandler.post {
                Toast.makeText(appContext, toastText, Toast.LENGTH_LONG).show()
            }
        }.start()
    }

    companion object {
        const val ACTION_POKE = "com.mesinha.app.ACTION_POKE"

        private const val URL_NUDGE =
            "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/nudge"

        /** Redesenha o widget (chamado também pela activity de configuração). */
        fun renderWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_poke).apply {
                setOnClickPendingIntent(R.id.widget_root, pokeIntent(context, appWidgetId))
            }
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun pokeIntent(context: Context, appWidgetId: Int): PendingIntent {
            val intent = Intent(context, PokeWidgetProvider::class.java).apply {
                action = ACTION_POKE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            var flags = PendingIntent.FLAG_UPDATE_CURRENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags = flags or PendingIntent.FLAG_IMMUTABLE
            }
            // requestCode = appWidgetId para cada widget ter seu PendingIntent.
            return PendingIntent.getBroadcast(context, appWidgetId, intent, flags)
        }
    }
}

/** Configuração de cada widget Poke (quem envia + mensagem), por appWidgetId. */
object PokeConfig {
    private const val PREFS = "poke_widget"

    fun save(context: Context, widgetId: Int, from: String, message: String?) {
        prefs(context).edit()
            .putString("from:$widgetId", from)
            .putString("message:$widgetId", message ?: "")
            .apply()
    }

    fun from(context: Context, widgetId: Int): String? =
        prefs(context).getString("from:$widgetId", null)

    fun message(context: Context, widgetId: Int): String? =
        prefs(context).getString("message:$widgetId", null)?.ifBlank { null }

    fun delete(context: Context, widgetId: Int) {
        prefs(context).edit()
            .remove("from:$widgetId")
            .remove("message:$widgetId")
            .apply()
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
