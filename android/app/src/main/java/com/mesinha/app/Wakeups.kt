package com.mesinha.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Despertador — a parte que roda com o app fechado.
 *
 * - [WakeupStore]: cópia local da lista (SharedPreferences), pra tocar mesmo
 *   sem internet na hora H.
 * - [WakeupScheduler]: agenda SÓ o próximo toque deste aparelho com
 *   `setAlarmClock` (o único alarme que o Android garante na hora certa, até
 *   em Doze). Quando ele dispara, o [WakeupReceiver] toca e reagenda o próximo.
 * - [WakeupSync]: baixa a lista do servidor e reagenda. Chamado ao abrir o app,
 *   quando o PWA mexe na lista, no boot e quando chega o FCM `wakeup-sync`
 *   (que o servidor manda quando o OUTRO cria um despertador pra mim).
 * - [WakeupApi]: avisa o servidor que começou a tocar / que desligou. O que
 *   falhar por falta de internet fica numa fila e é reenviado no próximo sync.
 */

/** As 6 mensagens pra desligar — iguais às de `src/app/utils/wakeupMessages.ts`. */
object WakeupMessages {
    val LIST = listOf(
        "Bom dia, meu amor! ☀️",
        "Acordei! Já tô de pé 💪",
        "Acordei pensando em você 💕",
        "Valeu por me acordar 🥰",
        "Mais 5 minutinhos... 😴",
        "Bora que o dia é nosso! 🚀",
    )
}

data class Wakeup(
    val id: String,
    val createdBy: String,
    val target: String,
    val hour: Int,
    val minute: Int,
    val days: Set<Int>,
    val date: String?,
    val volume: Int,
    val note: String,
    val enabled: Boolean,
) {
    fun isFor(profile: String) = target == "both" || target == profile

    /** Próximo toque estritamente depois de [after] (millis), ou null. */
    fun nextAfter(after: Long): Long? {
        if (!enabled) return null
        val cal = Calendar.getInstance()
        if (days.isEmpty()) {
            val d = date?.split("-")?.mapNotNull { it.toIntOrNull() } ?: return null
            if (d.size != 3) return null
            cal.clear()
            cal.set(d[0], d[1] - 1, d[2], hour, minute, 0)
            return cal.timeInMillis.takeIf { it > after }
        }
        cal.timeInMillis = after
        cal.set(Calendar.HOUR_OF_DAY, hour)
        cal.set(Calendar.MINUTE, minute)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        for (i in 0..7) {
            // Calendar: domingo = 1; no app, domingo = 0.
            val dow = cal.get(Calendar.DAY_OF_WEEK) - 1
            if (dow in days && cal.timeInMillis > after) return cal.timeInMillis
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        return null
    }

    companion object {
        fun fromJson(o: JSONObject): Wakeup? {
            val time = o.optString("time")
            val parts = time.split(":")
            if (parts.size != 2) return null
            val days = mutableSetOf<Int>()
            o.optJSONArray("days")?.let { arr -> for (i in 0 until arr.length()) days += arr.optInt(i) }
            return Wakeup(
                id = o.optString("id").ifEmpty { return null },
                createdBy = o.optString("createdBy"),
                target = o.optString("target"),
                hour = parts[0].toIntOrNull() ?: return null,
                minute = parts[1].toIntOrNull() ?: return null,
                days = days,
                date = o.optString("date").takeIf { it.isNotEmpty() && it != "null" },
                volume = o.optInt("volume", 70).coerceIn(WakeupStore.MIN_VOLUME, 100),
                note = o.optString("note"),
                enabled = o.optBoolean("enabled", true),
            )
        }
    }
}

object WakeupStore {
    /** Volume mínimo do despertador (%): nunca deixa tocar mudo. */
    const val MIN_VOLUME = 20

    private const val PREFS = "wakeups"
    private const val KEY_LIST = "list"
    private const val KEY_QUEUE = "report_queue"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Quem está logado neste aparelho (gravado pela ponte `setProfile`). */
    fun profile(context: Context): String? =
        context.getSharedPreferences("fcm", Context.MODE_PRIVATE).getString("profile", null)

    fun saveRaw(context: Context, json: String) {
        prefs(context).edit().putString(KEY_LIST, json).apply()
    }

    fun all(context: Context): List<Wakeup> {
        val raw = prefs(context).getString(KEY_LIST, null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).mapNotNull { Wakeup.fromJson(arr.getJSONObject(it)) }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun mine(context: Context): List<Wakeup> {
        val profile = profile(context) ?: return emptyList()
        return all(context).filter { it.isFor(profile) }
    }

    // ── Fila de avisos pro servidor que falharam (sem internet) ──

    @Synchronized
    fun enqueue(context: Context, path: String, body: JSONObject) {
        val arr = try { JSONArray(prefs(context).getString(KEY_QUEUE, "[]")) } catch (_: Exception) { JSONArray() }
        arr.put(JSONObject().put("path", path).put("body", body))
        // Nunca deixa a fila crescer sem limite.
        while (arr.length() > 30) arr.remove(0)
        prefs(context).edit().putString(KEY_QUEUE, arr.toString()).apply()
    }

    @Synchronized
    fun drainQueue(context: Context): JSONArray {
        val raw = prefs(context).getString(KEY_QUEUE, "[]")
        prefs(context).edit().putString(KEY_QUEUE, "[]").apply()
        return try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
    }
}

object WakeupScheduler {
    const val ACTION_FIRE = "com.mesinha.app.ACTION_WAKEUP_FIRE"
    const val EXTRA_IDS = "ids"
    const val EXTRA_TIME = "time"
    private const val REQUEST_CODE = 7100

    fun occurrenceKey(time: Long): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US).format(time)

    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return am.canScheduleExactAlarms()
    }

    /**
     * Agenda o próximo toque deste aparelho (ou cancela, se não houver).
     * [after] serve pro receiver não reagendar o toque que acabou de disparar.
     */
    fun reschedule(context: Context, after: Long = System.currentTimeMillis()) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val mine = WakeupStore.mine(context)
        val next = mine.mapNotNull { w -> w.nextAfter(after)?.let { it to w } }
        val nextTime = next.minOfOrNull { it.first }

        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        if (nextTime == null) {
            val existing = PendingIntent.getBroadcast(
                context, REQUEST_CODE,
                Intent(context, WakeupReceiver::class.java).setAction(ACTION_FIRE),
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            existing?.let { am.cancel(it); it.cancel() }
            return
        }
        val ids = next.filter { it.first == nextTime }.joinToString(",") { it.second.id }
        val fire = PendingIntent.getBroadcast(
            context, REQUEST_CODE,
            Intent(context, WakeupReceiver::class.java)
                .setAction(ACTION_FIRE)
                .putExtra(EXTRA_IDS, ids)
                .putExtra(EXTRA_TIME, nextTime),
            flags
        )

        try {
            if (canScheduleExact(context)) {
                // setAlarmClock: exato, fura o Doze e mostra o ícone de
                // despertador na barra de status (o sistema trata como alarme
                // de verdade). Tocar no ícone abre o Mesinha.
                val show = PendingIntent.getActivity(
                    context, REQUEST_CODE,
                    Intent(context, MainActivity::class.java), flags
                )
                am.setAlarmClock(AlarmManager.AlarmClockInfo(nextTime, show), fire)
            } else {
                // Sem a permissão "Alarmes e lembretes": melhor esforço. Pode
                // atrasar alguns minutos em Doze — o app avisa a pessoa pra
                // liberar a permissão.
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTime, fire)
            }
        } catch (e: SecurityException) {
            Log.w("Wakeup", "Sem permissão de alarme exato", e)
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTime, fire)
        }
    }
}

object WakeupApi {
    /** Chamada bloqueante (rodar fora da thread principal). */
    fun request(method: String, path: String, body: JSONObject? = null): String? {
        return try {
            val conn = (URL("${Backend.BASE_URL}$path").openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 10000
                readTimeout = 10000
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("apikey", Backend.ANON_KEY)
                setRequestProperty("Authorization", "Bearer ${Backend.ANON_KEY}")
                if (body != null) doOutput = true
            }
            if (body != null) conn.outputStream.use { it.write(body.toString().toByteArray()) }
            val code = conn.responseCode
            val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use { it.readText() }
            conn.disconnect()
            // 4xx (ex.: despertador apagado) não adianta repetir.
            if (code in 200..299) text ?: "" else if (code in 400..499) "" else null
        } catch (_: Exception) {
            null
        }
    }

    /** Envia (ou enfileira, se sem internet) um aviso de toque/desligamento. */
    fun report(context: Context, path: String, body: JSONObject) {
        Thread {
            if (request("POST", path, body) == null) WakeupStore.enqueue(context, path, body)
        }.start()
    }

    fun flushQueue(context: Context) {
        val queue = WakeupStore.drainQueue(context)
        for (i in 0 until queue.length()) {
            val item = queue.optJSONObject(i) ?: continue
            val path = item.optString("path")
            val body = item.optJSONObject("body") ?: continue
            if (request("POST", path, body) == null) WakeupStore.enqueue(context, path, body)
        }
    }
}

object WakeupSync {
    /** Bloqueante: reenvia a fila, baixa a lista e reagenda. */
    fun syncNow(context: Context) {
        WakeupApi.flushQueue(context)
        // `native=` avisa o servidor que este aparelho sabe receber o FCM de sincronização.
        val profile = WakeupStore.profile(context)
        val text = WakeupApi.request("GET", if (profile != null) "/wakeups?native=$profile" else "/wakeups")
        if (!text.isNullOrEmpty()) {
            try {
                val arr = JSONObject(text).optJSONArray("wakeups")
                if (arr != null) WakeupStore.saveRaw(context, arr.toString())
            } catch (_: Exception) {
                // resposta estranha: mantém a cópia local
            }
        }
        WakeupScheduler.reschedule(context)
    }

    fun syncAsync(context: Context) {
        val app = context.applicationContext
        // Reagenda já com a cópia local (instantâneo, sem rede) e depois sincroniza.
        WakeupScheduler.reschedule(app)
        Thread { syncNow(app) }.start()
    }
}
