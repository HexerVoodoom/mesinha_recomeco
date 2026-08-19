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

    /** Nomes dos meses em português, usados nos widgets de calendário. */
    val MONTH_NAMES = arrayOf(
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    )

    /** Iniciais dos dias da semana, começando no domingo. */
    val WEEKDAY_INITIALS = arrayOf("D", "S", "T", "Q", "Q", "S", "S")

    /**
     * "Agora" no fuso de Brasília — assim o widget vira o dia junto com o app.
     * Usa o fuso nomeado (e não "GMT-03:00" fixo) pra continuar certo se o
     * horário de verão voltar algum dia.
     */
    fun brazilCalendar(): java.util.Calendar =
        java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("America/Sao_Paulo"))

    /** Mês atual em Brasília no formato "YYYY-MM". */
    fun currentMonthStr(): String = monthStrOf(brazilCalendar())

    /** Mês de um Calendar no formato "YYYY-MM". */
    fun monthStrOf(calendar: java.util.Calendar): String = String.format(
        java.util.Locale.US,
        "%04d-%02d",
        calendar.get(java.util.Calendar.YEAR),
        calendar.get(java.util.Calendar.MONTH) + 1
    )

    /** Data de um Calendar no formato "YYYY-MM-DD". */
    fun dateStrOf(calendar: java.util.Calendar): String = String.format(
        java.util.Locale.US,
        "%s-%02d",
        monthStrOf(calendar),
        calendar.get(java.util.Calendar.DAY_OF_MONTH)
    )

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
     *
     * Os timeouts são curtos de propósito: quem chama isto é um
     * BroadcastReceiver segurando um `goAsync()`, e o sistema mata o receiver
     * por volta de 10s. Como connect e read são cobrados em sequência, o pior
     * caso aqui é 3 + 4 = 7s — que ainda deixa margem pro Toast e pro
     * redesenho do widget acontecerem antes do prazo.
     */
    fun postJson(
        urlStr: String,
        body: String,
        connectTimeoutMs: Int = 3000,
        readTimeoutMs: Int = 4000
    ): Pair<Int, String> {
        val conn = (java.net.URL(urlStr).openConnection() as java.net.HttpURLConnection).apply {
            connectTimeout = connectTimeoutMs
            readTimeout = readTimeoutMs
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
