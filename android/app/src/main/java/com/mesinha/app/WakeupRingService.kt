package com.mesinha.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import org.json.JSONObject
import kotlin.math.ceil

/**
 * Toca o despertador. Serviço em primeiro plano porque é o único jeito de
 * tocar com o app fechado e a tela apagada.
 *
 * "Sobrescreve tudo":
 * - toca no canal de ALARME (`USAGE_ALARM`), que o Android deixa tocar mesmo no
 *   silencioso/vibrar e que o Não Perturbe libera por padrão;
 * - força o volume de alarme para o volume escolhido (mínimo 20%) e fica de
 *   olho: se alguém abaixar, ele sobe de novo — nunca fica no zero;
 * - pede o foco de áudio (pausa música/vídeo que estiver tocando);
 * - abre a [WakeupActivity] por cima da tela de bloqueio (full-screen intent).
 *
 * Cada despertador tocando guarda o SEU toque (`occurrence`) e o seu prazo: um
 * das 07:00 e outro das 07:10 tocando juntos não se misturam. Cada um para
 * quando a pessoa escolhe um recadinho, quando é desligado em outro aparelho
 * ou depois de [MAX_RING_MS] sem ninguém desligar (aí o servidor marca "missed").
 */
class WakeupRingService : Service() {

    companion object {
        const val ACTION_START = "com.mesinha.app.WAKEUP_START"
        const val ACTION_DISMISS = "com.mesinha.app.WAKEUP_DISMISS"
        const val ACTION_FINISHED = "com.mesinha.app.WAKEUP_FINISHED"
        const val ACTION_CHANGED = "com.mesinha.app.WAKEUP_CHANGED"
        const val EXTRA_IDS = "ids"
        const val EXTRA_OCCURRENCE = "occurrence"
        const val EXTRA_MESSAGE = "message"

        const val CHANNEL_ID = "mesinha_despertador"
        private const val FALLBACK_CHANNEL_ID = "mesinha_despertador_som"
        private const val NOTIFICATION_ID = 7101
        const val FALLBACK_NOTIFICATION_ID = 7104
        const val MAX_RING_MS = 30 * 60 * 1000L
        private const val VOLUME_GUARD_MS = 1500L
        private const val SERVER_POLL_MS = 30 * 1000L

        /** Despertadores tocando agora (a tela de desligar lê daqui). */
        @Volatile
        var ringingIds: List<String> = emptyList()
            private set

        fun ensureChannel(context: Context) {
            val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
                mgr.createNotificationChannel(NotificationChannel(
                    CHANNEL_ID, "Despertador", NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Despertador tocando (tela cheia)"
                    // O som é tocado pelo próprio serviço, no canal de alarme.
                    setSound(null, null)
                    enableVibration(false)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setBypassDnd(true)
                })
            }
            if (mgr.getNotificationChannel(FALLBACK_CHANNEL_ID) == null) {
                // Plano B (o Android não deixou subir o serviço): a própria
                // notificação toca o som de alarme do sistema, em loop.
                mgr.createNotificationChannel(NotificationChannel(
                    FALLBACK_CHANNEL_ID, "Despertador (reserva)", NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Usado só se o despertador não conseguir abrir sozinho"
                    setSound(
                        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
                    )
                    enableVibration(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setBypassDnd(true)
                })
            }
        }

        /** O canal do despertador está ligado? (a pessoa pode ter bloqueado só ele) */
        fun channelEnabled(context: Context): Boolean {
            val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val ch = mgr.getNotificationChannel(CHANNEL_ID) ?: return true
            return ch.importance != NotificationManager.IMPORTANCE_NONE
        }

        private fun activityIntent(context: Context, ids: List<String>, occurrence: String) =
            Intent(context, WakeupActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra(EXTRA_IDS, ids.joinToString(","))
                .putExtra(EXTRA_OCCURRENCE, occurrence)

        /** Plano B do [WakeupReceiver]: notificação de alarme que abre a tela do despertador. */
        fun postFallbackNotification(context: Context, ids: List<String>, occurrence: String) {
            ensureChannel(context)
            val pi = PendingIntent.getActivity(
                context, 7105, activityIntent(context, ids, occurrence),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val n = NotificationCompat.Builder(context, FALLBACK_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(android.graphics.Color.parseColor("#4D989B"))
                .setContentTitle("⏰ Hora de acordar!")
                .setContentText("Toca aqui e escolhe um recadinho pra desligar")
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setContentIntent(pi)
                .setFullScreenIntent(pi, true)
                .build()
            n.flags = n.flags or Notification.FLAG_INSISTENT // som em loop até abrir
            try {
                NotificationManagerCompat.from(context).notify(FALLBACK_NOTIFICATION_ID, n)
            } catch (_: SecurityException) { }
        }
    }

    private data class Ringing(val occurrence: String, val startedAt: Long)

    private val handler = Handler(Looper.getMainLooper())
    private val ringing = linkedMapOf<String, Ringing>()
    private var track: AudioTrack? = null
    private var focusRequest: AudioFocusRequest? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var targetVolumeIndex = 0
    private var playing = false
    private var lastStartId = 0
    private var lastVersion: Long = -1

    private val audio by lazy { getSystemService(Context.AUDIO_SERVICE) as AudioManager }

    private val volumeGuard = object : Runnable {
        override fun run() {
            try {
                if (audio.getStreamVolume(AudioManager.STREAM_ALARM) < targetVolumeIndex) {
                    audio.setStreamVolume(AudioManager.STREAM_ALARM, targetVolumeIndex, 0)
                }
            } catch (_: Exception) { }
            // Se outra coisa parou o áudio (ex.: foco roubado), volta a tocar.
            track?.let { if (it.playState != AudioTrack.PLAYSTATE_PLAYING) try { it.play() } catch (_: Exception) { } }
            handler.postDelayed(this, VOLUME_GUARD_MS)
        }
    }

    // Prazo de cada despertador: quem passou de 30 min vira "missed".
    private val timeoutCheck = object : Runnable {
        override fun run() {
            val now = System.currentTimeMillis()
            val vencidos = ringing.filter { now - it.value.startedAt >= MAX_RING_MS }
            if (vencidos.isNotEmpty()) {
                val profile = WakeupStore.profile(this@WakeupRingService)
                vencidos.keys.forEach { ringing.remove(it) }
                WakeupStore.markHandled(this@WakeupRingService, vencidos.map { (id, r) -> "$id|${r.occurrence}" })
                report(vencidos.map { (id, r) ->
                    "/wakeups/$id/ring" to JSONObject().put("profile", profile)
                        .put("occurrence", r.occurrence).put("status", "missed")
                        .put("at", WakeupScheduler.isoUtc(now))
                }.takeIf { profile != null }.orEmpty())
                afterRemoval()
            }
            if (ringing.isNotEmpty()) handler.postDelayed(this, 30_000L)
        }
    }

    // Se desligaram em outro aparelho (ex.: PWA aberto no computador) ou
    // apagaram o despertador, para aqui também. Pergunta só o carimbo de
    // versão (barato) e baixa a lista quando ele muda.
    private val serverPoll = object : Runnable {
        override fun run() {
            val profile = WakeupStore.profile(this@WakeupRingService)
            val snapshot = ringing.toMap()
            if (profile != null && snapshot.isNotEmpty()) Thread {
                val v = WakeupApi.request("GET", "/wakeups/version")
                    ?.let { try { JSONObject(it).optLong("version", -1) } catch (_: Exception) { -1L } } ?: -1L
                if (v == -1L || v == lastVersion) return@Thread
                lastVersion = v
                val text = WakeupApi.request("GET", "/wakeups") ?: return@Thread
                try {
                    val arr = JSONObject(text).optJSONArray("wakeups") ?: return@Thread
                    val byId = (0 until arr.length()).map { arr.getJSONObject(it) }.associateBy { it.optString("id") }
                    val parar = snapshot.filter { (id, r) ->
                        val w = byId[id] ?: return@filter true // apagado
                        if (!w.optBoolean("enabled", true)) return@filter true
                        val ring = w.optJSONObject("ring")?.optJSONObject(profile)
                        ring?.optString("occurrence") == r.occurrence && ring.optString("status") == "dismissed"
                    }.keys
                    if (parar.isNotEmpty()) handler.post {
                        WakeupStore.markHandled(this@WakeupRingService, parar.mapNotNull { id -> snapshot[id]?.let { "$id|${it.occurrence}" } })
                        parar.forEach { ringing.remove(it) }
                        afterRemoval()
                    }
                } catch (_: Exception) { }
            }.start()
            handler.postDelayed(this, SERVER_POLL_MS)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        lastStartId = startId
        when (intent?.action) {
            ACTION_START -> start(intent)
            ACTION_DISMISS -> dismiss(intent.getStringExtra(EXTRA_MESSAGE).orEmpty())
            else -> if (ringing.isEmpty()) stopSelfResult(startId)
        }
        // Se o sistema matar o processo no meio do toque, ele recria o serviço
        // e reentrega o START — o despertador volta a tocar em vez de sumir.
        return START_REDELIVER_INTENT
    }

    private fun start(intent: Intent) {
        val novos = intent.getStringExtra(EXTRA_IDS)?.split(",")?.filter { it.isNotBlank() }.orEmpty()
        val occurrence = intent.getStringExtra(EXTRA_OCCURRENCE) ?: WakeupScheduler.occurrenceKey(System.currentTimeMillis())
        val now = System.currentTimeMillis()

        // START reentregue depois de o processo morrer, de um toque que já
        // venceu ou que a pessoa já desligou: nada a fazer.
        val occurrenceTime = try {
            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm", java.util.Locale.US).parse(occurrence)?.time ?: now
        } catch (_: Exception) { now }
        val validos = novos.filter { it !in ringing && !WakeupStore.isHandled(this, "$it|$occurrence") }
            .takeIf { now - occurrenceTime <= MAX_RING_MS }.orEmpty()

        // Os ids ficam visíveis ANTES da notificação: a tela cheia pode abrir
        // na hora e, sem eles, ela acharia que nada está tocando e fecharia.
        // O prazo de 30 min conta do horário do toque (vale também pro START
        // reentregue depois de o processo morrer no meio).
        val startedAt = if (occurrenceTime in (now - MAX_RING_MS)..now) occurrenceTime else now
        validos.forEach { ringing[it] = Ringing(occurrence, startedAt) }
        ringingIds = ringing.keys.toList()

        // startForeground SEMPRE, mesmo que não haja nada pra tocar (START
        // repetido, reentregue ou de um toque já desligado): quem chamou
        // startForegroundService exige isso em 5s, senão o Android derruba o app.
        ensureChannel(this)
        ServiceCompat.startForeground(
            this, NOTIFICATION_ID, buildNotification(),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0
        )
        if (ringing.isEmpty()) {
            stopPlayback()
            return
        }
        if (validos.isEmpty()) return // já estava tocando esses
        NotificationManagerCompat.from(this).cancel(FALLBACK_NOTIFICATION_ID)

        val profile = WakeupStore.profile(this)
        if (profile != null) {
            report(validos.map { id ->
                "/wakeups/$id/ring" to JSONObject().put("profile", profile)
                    .put("occurrence", occurrence).put("status", "ringing")
                    .put("at", WakeupScheduler.isoUtc(now))
            })
        }

        // Volume: o maior entre os despertadores tocando, nunca abaixo de 20%.
        val mine = WakeupStore.mine(this).filter { it.id in ringing }
        val percent = (mine.maxOfOrNull { it.volume } ?: 70).coerceAtLeast(WakeupStore.MIN_VOLUME)
        applyVolume(percent)

        // Segura a CPU pelo tempo do toque mais novo (renova a cada despertador).
        acquireWakeLock()
        if (!playing) {
            playing = true
            requestFocus()
            startSound()
            startVibration()
            handler.post(volumeGuard)
            handler.postDelayed(serverPoll, SERVER_POLL_MS)
            handler.postDelayed(timeoutCheck, 30_000L)
        }

        // Tela aberta: redesenha com os despertadores novos.
        sendBroadcast(Intent(ACTION_CHANGED).setPackage(packageName))
    }

    private fun dismiss(message: String) {
        val profile = WakeupStore.profile(this)
        val snapshot = ringing.toMap()
        ringing.clear()
        WakeupStore.markHandled(this, snapshot.map { (id, r) -> "$id|${r.occurrence}" })
        val at = WakeupScheduler.isoUtc(System.currentTimeMillis())
        if (profile != null && message.isNotBlank()) {
            report(snapshot.map { (id, r) ->
                "/wakeups/$id/dismiss" to JSONObject().put("profile", profile)
                    .put("occurrence", r.occurrence).put("message", message).put("at", at)
            })
        }
        afterRemoval()
    }

    /** Depois de tirar despertadores da lista: se não sobrou nenhum, para tudo. */
    private fun afterRemoval() {
        ringingIds = ringing.keys.toList()
        if (ringing.isNotEmpty()) {
            sendBroadcast(Intent(ACTION_CHANGED).setPackage(packageName))
            return
        }
        stopPlayback()
    }

    // Avisos pro servidor: o serviço só se encerra depois de eles saírem (ou
    // irem pra fila), senão o processo pode congelar com o aviso no meio.
    private var pendingReports = 0

    private fun report(items: List<Pair<String, JSONObject>>) {
        if (items.isEmpty()) return
        pendingReports++
        val app = applicationContext
        Thread {
            try {
                for ((path, body) in items) WakeupApi.reportNow(app, path, body)
            } finally {
                handler.post {
                    pendingReports--
                    maybeStopSelf()
                }
            }
        }.start()
    }

    private fun maybeStopSelf() {
        if (!playing && ringing.isEmpty() && pendingReports == 0) stopSelfResult(lastStartId)
    }

    private fun stopPlayback() {
        if (playing) {
            playing = false
            handler.removeCallbacks(volumeGuard)
            handler.removeCallbacks(serverPoll)
            handler.removeCallbacks(timeoutCheck)
            try { track?.stop() } catch (_: Exception) { }
            try { track?.release() } catch (_: Exception) { }
            track = null
            vibrator()?.cancel()
            focusRequest?.let { audio.abandonAudioFocusRequest(it) }
        }
        restoreVolume()
        wakeLock?.let { if (it.isHeld) it.release() }
        ringingIds = emptyList()
        sendBroadcast(Intent(ACTION_FINISHED).setPackage(packageName))
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        maybeStopSelf()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        if (playing) {
            playing = false
            try { track?.release() } catch (_: Exception) { }
            vibrator()?.cancel()
            restoreVolume()
            wakeLock?.let { if (it.isHeld) it.release() }
        }
        ringingIds = emptyList()
        super.onDestroy()
    }

    private fun applyVolume(percent: Int) {
        try {
            val max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            // Guarda o volume de antes só no primeiro toque (se o processo
            // morreu no meio, o que está salvo ainda é o original de verdade).
            if (WakeupStore.originalVolume(this) < 0) {
                WakeupStore.saveOriginalVolume(this, audio.getStreamVolume(AudioManager.STREAM_ALARM))
            }
            val minIndex = maxOf(1, ceil(max * WakeupStore.MIN_VOLUME / 100.0).toInt())
            targetVolumeIndex = maxOf(minIndex, ceil(max * percent / 100.0).toInt()).coerceAtMost(max)
            audio.setStreamVolume(AudioManager.STREAM_ALARM, targetVolumeIndex, 0)
        } catch (e: Exception) {
            Log.w("Wakeup", "Não deu pra ajustar o volume do alarme", e)
        }
    }

    private fun restoreVolume() {
        val original = WakeupStore.originalVolume(this)
        if (original >= 0) {
            try { audio.setStreamVolume(AudioManager.STREAM_ALARM, original, 0) } catch (_: Exception) { }
            WakeupStore.clearOriginalVolume(this)
        }
    }

    private fun alarmAttributes() = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build()

    private fun startSound() {
        try {
            val pcm = WakeupTune.pcm
            val t = AudioTrack.Builder()
                .setAudioAttributes(alarmAttributes())
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(WakeupTune.SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setTransferMode(AudioTrack.MODE_STATIC)
                .setBufferSizeInBytes(pcm.size * 2)
                .build()
            t.write(pcm, 0, pcm.size)
            t.setLoopPoints(0, pcm.size, -1)
            t.play()
            track = t
        } catch (e: Exception) {
            Log.e("Wakeup", "Falha ao tocar o toque", e)
        }
    }

    private fun requestFocus() {
        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(alarmAttributes())
            .build()
        focusRequest = req
        try { audio.requestAudioFocus(req) } catch (_: Exception) { }
    }

    private fun vibrator(): Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

    private fun startVibration() {
        try {
            @Suppress("DEPRECATION")
            vibrator()?.vibrate(
                VibrationEffect.createWaveform(longArrayOf(0, 700, 500, 700, 1200), 0),
                alarmAttributes()
            )
        } catch (_: Exception) { }
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "mesinha:despertador")
        }
        // acquire com prazo renova o prazo a cada despertador novo.
        wakeLock?.acquire(MAX_RING_MS + 2 * 60_000)
    }

    private fun buildNotification(): Notification {
        val fullScreen = PendingIntent.getActivity(
            this, 7102,
            Intent(this, WakeupActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("⏰ Despertador tocando!")
            .setContentText("Toca aqui e escolhe um recadinho pra desligar")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setColor(android.graphics.Color.parseColor("#4D989B"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullScreen)
            .setFullScreenIntent(fullScreen, true)
            .build()
    }
}
