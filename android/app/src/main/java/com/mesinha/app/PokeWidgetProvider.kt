package com.mesinha.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import android.widget.Toast
import org.json.JSONObject

/** Estado visual do widget Cutucar — é o feedback de que a cutucada saiu ou não. */
enum class PokeState { PRONTO, ENVIANDO, ENVIADO, ERRO }

/**
 * Widget "Cutucar" (1x1): um botão de cutucada. Ao tocar, envia direto a
 * notificação push pro outro (endpoint `/nudge`), com a mensagem escolhida na
 * configuração do widget — sem precisar abrir o app.
 *
 * **Feedback:** o próprio widget muda enquanto envia (⏳), quando dá certo (✅)
 * e quando falha (⚠️), além do Toast. Só o Toast não bastava: ele é postado
 * depois do envio, quando o processo já pode ter sido derrubado — e aí a
 * cutucada saía (ou não) sem ninguém ficar sabendo.
 *
 * **Redesenho:** widget com tela de configuração NÃO recebe `onUpdate` ao ser
 * criado, então o desenho feito pela config era o único da vida dele — se
 * aquele único desenho se perdesse (host ainda não pronto), o erro era
 * permanente. Por isso agora existem três redes de segurança: período de
 * atualização de 30 min, `onAppWidgetOptionsChanged` (disparado quando o
 * launcher posiciona/redimensiona) e `onRestored`.
 */
class PokeWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            if (id in enviando) continue // não apaga o feedback em curso
            renderWidget(context, appWidgetManager, id, PokeState.PRONTO)
        }
    }

    /**
     * Chamado pelo launcher logo depois de posicionar (e ao redimensionar) o
     * widget. É a segunda chance mais confiável de desenhar um widget que tem
     * tela de configuração — sem isso, um desenho perdido nunca era refeito.
     */
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        // Não sobrescreve o "enviando…"/"enviado!" se uma cutucada estiver em
        // curso: um reposicionamento no meio do envio apagaria justamente o
        // feedback que a pessoa está esperando.
        if (appWidgetId in enviando) return
        renderWidget(context, appWidgetManager, appWidgetId, PokeState.PRONTO)
    }

    override fun onRestored(context: Context, oldWidgetIds: IntArray, newWidgetIds: IntArray) {
        val manager = AppWidgetManager.getInstance(context)
        for (id in newWidgetIds) {
            if (id in enviando) continue // não apaga o feedback em curso
            renderWidget(context, manager, id, PokeState.PRONTO)
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
            if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return
            sendPoke(context, widgetId)
        }
    }

    /** Envia a cutucada em segundo plano, mostrando o andamento no widget. */
    private fun sendPoke(context: Context, widgetId: Int) {
        val appContext = context.applicationContext
        val manager = AppWidgetManager.getInstance(appContext)

        val from = PokeConfig.from(appContext, widgetId)
        if (from == null) {
            Toast.makeText(appContext, R.string.widget_poke_not_configured, Toast.LENGTH_LONG).show()
            renderWidget(appContext, manager, widgetId, PokeState.ERRO)
            return
        }
        val message = PokeConfig.message(appContext, widgetId)

        // Feedback imediato: quem tocou vê na hora que a cutucada está indo.
        enviando.add(widgetId)
        renderWidget(appContext, manager, widgetId, PokeState.ENVIANDO)

        // goAsync mantém o receiver vivo enquanto a thread faz o POST.
        val pendingResult = goAsync()
        val mainHandler = Handler(Looper.getMainLooper())
        Thread {
            var enviado = false
            val aviso: String = try {
                val body = JSONObject().apply {
                    put("from", from)
                    if (!message.isNullOrBlank()) put("message", message)
                }
                val (code, responseText) = WidgetCommon.postJson(URL_NUDGE, body.toString())
                if (code in 200..299) {
                    enviado = true
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
            }

            // O finish() do goAsync fica DEPOIS de mostrar o resultado: chamado
            // antes (como estava), o processo perdia prioridade e costumava ser
            // morto antes do aviso aparecer.
            mainHandler.post {
                Toast.makeText(appContext, aviso, Toast.LENGTH_LONG).show()
                renderWidget(
                    appContext,
                    AppWidgetManager.getInstance(appContext),
                    widgetId,
                    if (enviado) PokeState.ENVIADO else PokeState.ERRO
                )
                pendingResult.finish()
                // Volta ao normal depois de alguns segundos. Se o processo morrer
                // antes, o próximo toque (ou o update de 30 min) resolve.
                mainHandler.postDelayed({
                    enviando.remove(widgetId)
                    renderWidget(
                        appContext,
                        AppWidgetManager.getInstance(appContext),
                        widgetId,
                        PokeState.PRONTO
                    )
                }, VOLTA_AO_NORMAL_MS)
            }
        }.start()
    }

    companion object {
        const val ACTION_POKE = "com.mesinha.app.ACTION_POKE"

        private const val URL_NUDGE =
            "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/nudge"

        private const val VOLTA_AO_NORMAL_MS = 6000L

        /**
         * Widgets com cutucada em curso. Serve só para o redesenho automático
         * (reposicionamento do launcher) não apagar o feedback no meio do
         * envio. Em memória de propósito: se o processo morrer, o estado certo
         * é mesmo voltar ao normal.
         */
        private val enviando = java.util.Collections.newSetFromMap(
            java.util.concurrent.ConcurrentHashMap<Int, Boolean>()
        )

        /**
         * Redesenha o widget no estado pedido. Nunca deixa exceção escapar: este
         * método roda dentro de um BroadcastReceiver e de uma Activity, e uma
         * exceção aqui derrubaria o processo — junto com os broadcasts que
         * estivessem na fila para os outros widgets do app.
         */
        fun renderWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            state: PokeState = PokeState.PRONTO
        ) {
            try {
                val (emoji, label) = when (state) {
                    PokeState.PRONTO -> "💌" to R.string.widget_poke_label
                    PokeState.ENVIANDO -> "⏳" to R.string.widget_poke_sending
                    PokeState.ENVIADO -> "✅" to R.string.widget_poke_ok
                    PokeState.ERRO -> "⚠️" to R.string.widget_poke_error
                }
                val views = RemoteViews(context.packageName, R.layout.widget_poke).apply {
                    setTextViewText(R.id.tv_poke, emoji)
                    setTextViewText(R.id.tv_poke_label, context.getString(label))
                    setOnClickPendingIntent(R.id.widget_root, pokeIntent(context, appWidgetId))
                }
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {
                // Widget quebrado é melhor que app quebrado.
            }
        }

        private fun pokeIntent(context: Context, appWidgetId: Int): PendingIntent {
            val intent = Intent(context, PokeWidgetProvider::class.java).apply {
                action = ACTION_POKE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                // Sem isso, PendingIntents de widgets diferentes seriam "iguais"
                // (o extra não entra na comparação) e um sobrescreveria o outro.
                data = android.net.Uri.parse("mesinha://poke/$appWidgetId")
            }
            var flags = PendingIntent.FLAG_UPDATE_CURRENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags = flags or PendingIntent.FLAG_IMMUTABLE
            }
            return PendingIntent.getBroadcast(context, appWidgetId, intent, flags)
        }

        /** Manda o sistema redesenhar todos os widgets Cutucar. */
        fun requestUpdate(context: Context, appWidgetId: Int) {
            context.sendBroadcast(
                Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
                    component = ComponentName(context, PokeWidgetProvider::class.java)
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                }
            )
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
