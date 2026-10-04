package com.mesinha.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.UserManager
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Despertador — a parte que roda com o app fechado.
 *
 * - [WakeupStore]: cópia local da lista, pra tocar mesmo sem internet na hora
 *   H. Fica no armazenamento "protegido pelo aparelho" (direct boot): assim o
 *   despertador volta a ser agendado logo depois de um reinício, ANTES de a
 *   pessoa desbloquear o celular (reinício automático de madrugada, bateria
 *   que acabou e voltou na tomada...).
 * - [WakeupScheduler]: agenda SÓ o próximo toque deste aparelho com
 *   `setAlarmClock` (o único alarme que o Android garante na hora certa, até
 *   em Doze). Quando ele dispara, o [WakeupReceiver] toca e reagenda o próximo.
 * - [WakeupSync]: baixa a lista do servidor e reagenda. Chamado ao abrir o app,
 *   quando o PWA mexe na lista, no boot e quando chega o FCM `wakeup-sync`
 *   (que o servidor manda quando o OUTRO cria um despertador pra mim).
 * - [WakeupApi]: avisa o servidor que começou a tocar / que desligou. O que
 *   falhar por falta de internet fica numa fila, com retentativa agendada.
 */

/** As 6 mensagens pra desligar — iguais às de `src/app/utils/wakeups.ts` e do servidor. */
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
    /** Última edição (millis): um toque ANTES disso não vale (criado às 07:05 um "07:00"). */
    val updatedAt: Long = 0L,
) {
    fun isFor(profile: String) = target == "both" || target == profile

    /**
     * Próximo toque estritamente depois de [after] (millis), ou null.
     * Cada dia é calculado do zero a partir da data + hora (java.time): assim
     * uma virada de horário de verão num dia não "empurra" os dias seguintes.
     */
    fun nextAfter(afterArg: Long, zone: ZoneId = ZoneId.systemDefault()): Long? {
        if (!enabled) return null
        val after = maxOf(afterArg, updatedAt)
        if (days.isEmpty()) {
            val d = try { LocalDate.parse(date ?: return null) } catch (_: Exception) { return null }
            return d.atTime(hour, minute).atZone(zone).toInstant().toEpochMilli().takeIf { it > after }
        }
        val start = Instant.ofEpochMilli(after).atZone(zone).toLocalDate()
        for (i in 0..7) {
            val day = start.plusDays(i.toLong())
            // java.time: segunda = 1 … domingo = 7; no app, domingo = 0.
            val dow = day.dayOfWeek.value % 7
            if (dow !in days) continue
            val t = day.atTime(hour, minute).atZone(zone).toInstant().toEpochMilli()
            if (t > after) return t
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
                updatedAt = try {
                    Instant.parse(o.optString("updatedAt").ifEmpty { o.optString("createdAt") }).toEpochMilli()
                } catch (_: Exception) { 0L },
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
    private const val KEY_PROFILE = "profile"
    private const val KEY_ORIGINAL_VOLUME = "original_volume"

    @Volatile
    private var migrated = false

    /**
     * Prefs no armazenamento protegido pelo aparelho (legível antes do
     * primeiro desbloqueio). Na primeira vez com o celular desbloqueado, move
     * pra lá o que estava no armazenamento antigo.
     */
    @Synchronized
    private fun prefs(context: Context): android.content.SharedPreferences {
        val dp = context.createDeviceProtectedStorageContext()
        if (!migrated && isUnlocked(context)) {
            try { dp.moveSharedPreferencesFrom(context, PREFS) } catch (_: Exception) { }
            migrated = true
            // O perfil mora nas prefs do FCM (só legíveis desbloqueado): guarda uma cópia aqui.
            val fcmProfile = context.getSharedPreferences("fcm", Context.MODE_PRIVATE).getString("profile", null)
            if (fcmProfile != null) {
                dp.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_PROFILE, fcmProfile).apply()
            }
        }
        return dp.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    fun isUnlocked(context: Context): Boolean =
        (context.getSystemService(Context.USER_SERVICE) as? UserManager)?.isUserUnlocked ?: true

    /** Quem está logado neste aparelho (cópia do que a ponte `setProfile` grava). */
    fun profile(context: Context): String? = prefs(context).getString(KEY_PROFILE, null)

    fun setProfile(context: Context, profile: String) {
        prefs(context).edit().putString(KEY_PROFILE, profile).apply()
    }

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

    // Volume de alarme de antes do toque — guardado em disco pra voltar ao
    // normal mesmo que o processo morra no meio do toque.
    fun saveOriginalVolume(context: Context, v: Int) =
        prefs(context).edit().putInt(KEY_ORIGINAL_VOLUME, v)
            .putLong("${KEY_ORIGINAL_VOLUME}_at", System.currentTimeMillis()).commit()

    /** -1 se não houver (ou se for de um toque de horas atrás que ficou sem restaurar). */
    fun originalVolume(context: Context): Int {
        val p = prefs(context)
        val at = p.getLong("${KEY_ORIGINAL_VOLUME}_at", 0L)
        if (System.currentTimeMillis() - at > 2 * 60 * 60 * 1000L) return -1
        return p.getInt(KEY_ORIGINAL_VOLUME, -1)
    }

    fun clearOriginalVolume(context: Context) =
        prefs(context).edit().remove(KEY_ORIGINAL_VOLUME).remove("${KEY_ORIGINAL_VOLUME}_at").apply()

    // Toques já encerrados neste aparelho ("id|occurrence"): um START
    // reentregue depois de o processo morrer não pode voltar a tocar um
    // despertador que a pessoa já desligou.
    private const val KEY_HANDLED = "handled"

    @Synchronized
    fun markHandled(context: Context, keys: Collection<String>) {
        if (keys.isEmpty()) return
        val p = prefs(context)
        val atual = (p.getString(KEY_HANDLED, "") ?: "").split("\n").filter { it.isNotBlank() }
        val novo = (atual + keys).distinct().takeLast(50)
        p.edit().putString(KEY_HANDLED, novo.joinToString("\n")).commit()
    }

    fun isHandled(context: Context, key: String): Boolean =
        (prefs(context).getString(KEY_HANDLED, "") ?: "").split("\n").contains(key)

    // ── Fila de avisos pro servidor que falharam (sem internet) ──

    @Synchronized
    fun enqueue(context: Context, path: String, body: JSONObject) {
        val arr = try { JSONArray(prefs(context).getString(KEY_QUEUE, "[]")) } catch (_: Exception) { JSONArray() }
        arr.put(JSONObject().put("path", path).put("body", body))
        // Nunca deixa a fila crescer sem limite.
        while (arr.length() > 30) arr.remove(0)
        prefs(context).edit().putString(KEY_QUEUE, arr.toString()).apply()
    }

    /** Cópia da fila (os itens só saem dela depois de enviados — ver [removeFromQueue]). */
    @Synchronized
    fun peekQueue(context: Context): List<JSONObject> {
        val arr = try { JSONArray(prefs(context).getString(KEY_QUEUE, "[]")) } catch (_: Exception) { JSONArray() }
        return (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }
    }

    @Synchronized
    fun removeFromQueue(context: Context, item: JSONObject) {
        val alvo = item.toString()
        val arr = try { JSONArray(prefs(context).getString(KEY_QUEUE, "[]")) } catch (_: Exception) { JSONArray() }
        val novo = JSONArray()
        var removido = false
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (!removido && o.toString() == alvo) { removido = true; continue }
            novo.put(o)
        }
        prefs(context).edit().putString(KEY_QUEUE, novo.toString()).commit()
    }
}

object WakeupScheduler {
    const val ACTION_FIRE = "com.mesinha.app.ACTION_WAKEUP_FIRE"
    const val ACTION_RETRY_REPORTS = "com.mesinha.app.ACTION_WAKEUP_RETRY"
    const val EXTRA_IDS = "ids"
    const val EXTRA_TIME = "time"
    private const val REQUEST_CODE = 7100
    private const val RETRY_REQUEST_CODE = 7103

    fun occurrenceKey(time: Long): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US).format(time)

    fun isoUtc(time: Long): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date(time))

    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return am.canScheduleExactAlarms()
    }

    /**
     * Agenda o próximo toque deste aparelho (ou cancela, se não houver).
     *
     * [after] padrão olha 90s pra trás: se o app reagendar bem no segundo em
     * que o alarme está disparando (abriu o app às 07:00:00, chegou um FCM),
     * o toque das 07:00 não pode ser trocado pelo de amanhã antes de tocar.
     * Se ele já tocou, o serviço reconhece e ignora a repetição. O receiver
     * passa o horário que acabou de disparar, pra seguir pro próximo.
     */
    fun reschedule(context: Context, after: Long = System.currentTimeMillis() - 90_000L) {
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
            // setAlarmClock não exige a permissão de alarme exato: é exato,
            // fura o Doze, deixa subir o serviço em primeiro plano e mostra o
            // ícone de despertador na barra. Tocar no ícone abre o Mesinha.
            val show = PendingIntent.getActivity(
                context, REQUEST_CODE,
                Intent(context, MainActivity::class.java), flags
            )
            am.setAlarmClock(AlarmManager.AlarmClockInfo(nextTime, show), fire)
        } catch (e: SecurityException) {
            Log.w("Wakeup", "Sem permissão de alarme exato", e)
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTime, fire)
        }
    }

    /** Agenda uma nova tentativa de mandar a fila de avisos (sem internet agora). */
    fun scheduleReportRetry(context: Context, delayMs: Long = 5 * 60 * 1000L) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = PendingIntent.getBroadcast(
            context, RETRY_REQUEST_CODE,
            Intent(context, WakeupReceiver::class.java).setAction(ACTION_RETRY_REPORTS),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delayMs, pi)
    }
}

object WakeupApi {
    /** Chamada bloqueante (rodar fora da thread principal). */
    fun request(method: String, path: String, body: JSONObject? = null): String? {
        return try {
            val conn = (URL("${Backend.BASE_URL}$path").openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 8000
                readTimeout = 8000
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

    /**
     * Envia um aviso de toque/desligamento (bloqueante). Se falhar, vai pra
     * fila e agenda uma retentativa. Devolve true se chegou no servidor.
     */
    fun reportNow(context: Context, path: String, body: JSONObject): Boolean {
        if (request("POST", path, body) != null) return true
        WakeupStore.enqueue(context, path, body)
        WakeupScheduler.scheduleReportRetry(context)
        return false
    }

    /**
     * Reenvia a fila. Cada item só sai da fila DEPOIS de enviado: se o
     * processo morrer no meio, nada se perde. Para no primeiro erro de rede
     * (e agenda outra tentativa) e manda no máximo 10 por vez, pra caber no
     * tempo que o Android dá a um receiver.
     */
    fun flushQueue(context: Context) {
        val fila = WakeupStore.peekQueue(context)
        for (item in fila.take(10)) {
            val path = item.optString("path")
            val body = item.optJSONObject("body")
            if (body == null) { WakeupStore.removeFromQueue(context, item); continue }
            if (request("POST", path, body) == null) {
                WakeupScheduler.scheduleReportRetry(context, 15 * 60 * 1000L)
                return
            }
            WakeupStore.removeFromQueue(context, item)
        }
        if (fila.size > 10) WakeupScheduler.scheduleReportRetry(context, 60 * 1000L)
    }
}

object WakeupSync {
    /**
     * Bloqueante: baixa a lista e reagenda (primeiro, que é o que importa pra
     * tocar) e depois reenvia a fila de avisos, se [flush].
     */
    fun syncNow(context: Context, flush: Boolean = true) {
        val profile = WakeupStore.profile(context)
        // `native=` avisa o servidor que este aparelho sabe receber o FCM de sincronização.
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
        // Recibo pro servidor: o painel mostra se chegou mesmo neste celular.
        try { WakeupDiagnostics.reportDevice(context) } catch (_: Exception) { }
        if (flush) WakeupApi.flushQueue(context)
    }

    fun syncAsync(context: Context) {
        val app = context.applicationContext
        // Reagenda já com a cópia local (instantâneo, sem rede) e depois sincroniza.
        WakeupScheduler.reschedule(app)
        Thread { syncNow(app) }.start()
    }
}
