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
 * Só para quando a pessoa escolhe uma das 6 mensagens (que vai pro outro) ou
 * depois de [MAX_RING_MS] sem ninguém desligar (aí o servidor marca "missed").
 */
class WakeupRingService : Service() {

    companion object {
        const val ACTION_START = "com.mesinha.app.WAKEUP_START"
        const val ACTION_DISMISS = "com.mesinha.app.WAKEUP_DISMISS"
        const val ACTION_FINISHED = "com.mesinha.app.WAKEUP_FINISHED"
        const val EXTRA_IDS = "ids"
        const val EXTRA_OCCURRENCE = "occurrence"
        const val EXTRA_MESSAGE = "message"

        const val CHANNEL_ID = "mesinha_despertador"
        private const val NOTIFICATION_ID = 7101
        const val MAX_RING_MS = 30 * 60 * 1000L
        private const val VOLUME_GUARD_MS = 1500L
        private const val SERVER_POLL_MS = 30 * 1000L

        /** Despertadores tocando agora (a tela de desligar lê daqui). */
        @Volatile
        var ringingIds: List<String> = emptyList()
            private set

        fun ensureChannel(context: Context) {
            val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (mgr.getNotificationChannel(CHANNEL_ID) != null) return
            val channel = NotificationChannel(
                CHANNEL_ID, "Despertador", NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Despertador tocando (tela cheia)"
                // O som é tocado pelo próprio serviço, no canal de alarme.
                setSound(null, null)
                enableVibration(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            mgr.createNotificationChannel(channel)
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private val ids = linkedSetOf<String>()
    private var occurrence = ""
    private var track: AudioTrack? = null
    private var focusRequest: AudioFocusRequest? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var originalVolume = -1
    private var targetVolumeIndex = 0
    private var finished = false

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

    private val timeout = Runnable {
        val profile = WakeupStore.profile(this)
        if (profile != null) {
            for (id in ids) {
                WakeupApi.report(this, "/wakeups/$id/ring", JSONObject()
                    .put("profile", profile).put("occurrence", occurrence).put("status", "missed"))
            }
        }
        finish()
    }

    // Se desligaram em outro aparelho (ex.: PWA aberto no computador), para aqui também.
    private val serverPoll = object : Runnable {
        override fun run() {
            val profile = WakeupStore.profile(this@WakeupRingService)
            val snapshot = ids.toList()
            val occ = occurrence
            if (profile != null) Thread {
                val text = WakeupApi.request("GET", "/wakeups") ?: return@Thread
                try {
                    val arr = JSONObject(text).optJSONArray("wakeups") ?: return@Thread
                    val desligados = (0 until arr.length()).map { arr.getJSONObject(it) }.filter { w ->
                        val r = w.optJSONObject("ring")?.optJSONObject(profile)
                        w.optString("id") in snapshot && r?.optString("occurrence") == occ &&
                            r.optString("status") == "dismissed"
                    }
                    if (desligados.size == snapshot.size && snapshot.isNotEmpty()) handler.post { finish() }
                } catch (_: Exception) { }
            }.start()
            handler.postDelayed(this, SERVER_POLL_MS)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> start(intent)
            ACTION_DISMISS -> dismiss(intent.getStringExtra(EXTRA_MESSAGE).orEmpty())
            else -> if (ids.isEmpty()) stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun start(intent: Intent) {
        // Os ids ficam visíveis ANTES da notificação: a tela cheia pode abrir
        // na hora e, sem eles, ela acharia que nada está tocando e fecharia.
        val novos = intent.getStringExtra(EXTRA_IDS)?.split(",")?.filter { it.isNotBlank() }.orEmpty()
        occurrence = intent.getStringExtra(EXTRA_OCCURRENCE) ?: WakeupScheduler.occurrenceKey(System.currentTimeMillis())
        val jaTocando = ids.isNotEmpty()
        ids.addAll(novos)
        ringingIds = ids.toList()
        finished = false

        // startForeground logo em seguida (o Android dá 5s).
        ensureChannel(this)
        ServiceCompat.startForeground(
            this, NOTIFICATION_ID, buildNotification(),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0
        )

        val profile = WakeupStore.profile(this)
        if (profile != null) {
            for (id in novos) {
                WakeupApi.report(this, "/wakeups/$id/ring", JSONObject()
                    .put("profile", profile).put("occurrence", occurrence).put("status", "ringing"))
            }
        }

        // Volume: o maior entre os despertadores tocando, nunca abaixo de 20%.
        val mine = WakeupStore.mine(this).filter { it.id in ids }
        val percent = (mine.maxOfOrNull { it.volume } ?: 70).coerceAtLeast(WakeupStore.MIN_VOLUME)
        applyVolume(percent)

        if (!jaTocando) {
            acquireWakeLock()
            requestFocus()
            startSound()
            startVibration()
            handler.post(volumeGuard)
            handler.postDelayed(serverPoll, SERVER_POLL_MS)
        }
        handler.removeCallbacks(timeout)
        handler.postDelayed(timeout, MAX_RING_MS)

        // Tenta abrir a tela direto (funciona com a tela apagada/bloqueada via
        // full-screen intent; com o celular em uso vira notificação heads-up).
        try {
            startActivity(Intent(this, WakeupActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) { }
    }

    private fun dismiss(message: String) {
        val profile = WakeupStore.profile(this)
        if (profile != null && message.isNotBlank()) {
            for (id in ids) {
                WakeupApi.report(this, "/wakeups/$id/dismiss", JSONObject()
                    .put("profile", profile).put("occurrence", occurrence).put("message", message))
            }
        }
        finish()
    }

    private fun finish() {
        if (finished) return
        finished = true
        handler.removeCallbacksAndMessages(null)
        try { track?.stop() } catch (_: Exception) { }
        try { track?.release() } catch (_: Exception) { }
        track = null
        vibrator()?.cancel()
        focusRequest?.let { audio.abandonAudioFocusRequest(it) }
        if (originalVolume >= 0) {
            try { audio.setStreamVolume(AudioManager.STREAM_ALARM, originalVolume, 0) } catch (_: Exception) { }
        }
        wakeLock?.let { if (it.isHeld) it.release() }
        ids.clear()
        ringingIds = emptyList()
        sendBroadcast(Intent(ACTION_FINISHED).setPackage(packageName))
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        finish()
        super.onDestroy()
    }

    private fun applyVolume(percent: Int) {
        try {
            val max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            if (originalVolume < 0) originalVolume = audio.getStreamVolume(AudioManager.STREAM_ALARM)
            val minIndex = maxOf(1, ceil(max * WakeupStore.MIN_VOLUME / 100.0).toInt())
            targetVolumeIndex = maxOf(minIndex, ceil(max * percent / 100.0).toInt()).coerceAtMost(max)
            audio.setStreamVolume(AudioManager.STREAM_ALARM, targetVolumeIndex, 0)
        } catch (e: Exception) {
            Log.w("Wakeup", "Não deu pra ajustar o volume do alarme", e)
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
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "mesinha:despertador").apply {
            acquire(MAX_RING_MS + 60_000)
        }
    }

    private fun buildNotification(): Notification {
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val fullScreen = PendingIntent.getActivity(
            this, 7102,
            Intent(this, WakeupActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            flags
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("⏰ Despertador tocando!")
            .setContentText("Toca aqui e escolhe um recadinho pra desligar")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullScreen)
            .setFullScreenIntent(fullScreen, true)
            .build()
    }
}
