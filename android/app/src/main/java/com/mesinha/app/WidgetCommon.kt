package com.mesinha.app

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Helper simples compartilhado pelos widgets (sem herança, para evitar
 * qualquer efeito colateral na instância do AppWidgetProvider).
 */
object WidgetCommon {

    const val SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YmRtbWFxeG51dGJieGlxZW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDE2OTMsImV4cCI6MjA4ODA3NzY5M30.jLMAGrD0jOaId3Tjy1IKDPc4rtDqm4hx-Bv6Mzo0dDw"

    /** GET simples num endpoint do servidor do Mesinha (com a chave anon). */
    fun download(urlStr: String): String {
        val conn = (java.net.URL(urlStr).openConnection() as java.net.HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            requestMethod = "GET"
            setRequestProperty("apikey", SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
        }
        try {
            if (conn.responseCode != java.net.HttpURLConnection.HTTP_OK) {
                throw java.io.IOException("HTTP ${conn.responseCode}")
            }
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    /**
     * POST de JSON num endpoint do servidor do Mesinha. Devolve o corpo da
     * resposta (da stream de erro quando o HTTP não é 2xx, junto do código,
     * para o chamador poder mostrar a mensagem amigável do servidor).
     */
    fun postJson(urlStr: String, body: String): Pair<Int, String> {
        val conn = (java.net.URL(urlStr).openConnection() as java.net.HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            requestMethod = "POST"
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
        }
        try {
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            return code to text
        } finally {
            conn.disconnect()
        }
    }

    /** PendingIntent que abre o app Mesinha ao tocar no widget. */
    fun openAppIntent(context: Context): PendingIntent {
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        return PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java),
            flags
        )
    }
}
