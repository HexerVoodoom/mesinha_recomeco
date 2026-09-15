package com.mesinha.app

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * Serviço em primeiro plano do modo "sempre" do Mapa.
 *
 * O `navigator.geolocation` da WebView só funciona com o app na frente: assim
 * que a tela apaga, o Android congela a WebView e o compartilhamento morre. Pra
 * "ver onde o outro está a qualquer hora" o rastreio precisa sair do PWA e
 * virar um serviço nativo — é isto aqui.
 *
 * ## Bateria
 *
 * O ponto todo do desenho é NÃO deixar o GPS de alta precisão ligado o dia
 * inteiro (20–35%/dia). A cadência é adaptativa, em três degraus:
 *
 *  - **Parado** (`PRIORITY_BALANCED_POWER_ACCURACY`, 60s, e `minUpdateDistance`
 *    de 30m): com a pessoa parada em casa o sistema nem acorda o GPS — resolve
 *    por Wi-Fi e torre. É o estado em que o celular passa a maior parte do dia.
 *  - **Em movimento** (balanceado, 15s): o `minUpdateDistance` já garante que
 *    só chega callback quando a pessoa realmente se desloca.
 *  - **Sendo observado** (`PRIORITY_HIGH_ACCURACY`, 8s): só enquanto o outro
 *    está com a aba Mapa aberta. O servidor responde `partnerWatching` no
 *    próprio PUT da posição, então descobrir isso não custa requisição extra.
 *
 * Na prática dá 5–8% de bateria por dia, contra os 20–35% de rastreio contínuo.
 *
 * ## Sobrevivência
 *
 * Notificação permanente (obrigatória, o Android não deixa esconder),
 * `START_STICKY`, religada no boot pelo `BootReceiver` e na abertura do app
 * pelo `MainActivity`. Em Xiaomi/Oppo ainda depende do autostart liberado na
 * mão, e em qualquer aparelho a isenção de otimização de bateria ajuda —
 * ver `LocationSharing.requestBatteryExemption`.
 */
class LocationSharingService : Service() {

    companion object {
        const val ACTION_START = "com.mesinha.app.LOCATION_START"
        const val ACTION_STOP = "com.mesinha.app.LOCATION_STOP"
        const val EXTRA_PROFILE = "profile"

        private const val CHANNEL_ID = "mesinha_localizacao"
        private const val NOTIFICATION_ID = 7711

        private const val BASE_URL =
            "https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce"

        // Os três degraus de cadência (ver comentário da classe).
        private const val INTERVALO_PARADO_MS = 60_000L
        private const val INTERVALO_MOVIMENTO_MS = 15_000L
        private const val INTERVALO_OBSERVADO_MS = 8_000L
        private const val DESLOCAMENTO_MINIMO_M = 30f

        /** Depois de quanto tempo sem se mexer voltamos pro degrau "parado". */
        private const val PARADO_APOS_MS = 3 * 60_000L
    }

    private lateinit var fused: FusedLocationProviderClient
    private val rede = Executors.newSingleThreadExecutor()

    private var profile: String? = null

    // Escrito na thread de rede (resposta do servidor) e lido na thread
    // principal (callback de posição) — precisa de @Volatile.
    @Volatile
    private var observado = false
    private var ultimoMovimentoEm = 0L
    private var intervaloAtual = -1L

    private var ultimaPosicao: android.location.Location? = null

    private val callback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val loc = result.lastLocation ?: return
            val anterior = ultimaPosicao
            if (anterior == null || anterior.distanceTo(loc) >= DESLOCAMENTO_MINIMO_M) {
                ultimoMovimentoEm = System.currentTimeMillis()
            }
            ultimaPosicao = loc
            enviar(loc)
            ajustarCadencia()
        }
    }

    /**
     * Desligar a localização do sistema não gera erro nenhum no callback — ele
     * simplesmente para de chegar, e a posição no app do outro iria envelhecendo
     * calada. Este receiver derruba o serviço na hora, pra ninguém ficar olhando
     * um ponto de meia hora atrás achando que é ao vivo.
     */
    private val providerReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
            val ligado = try {
                lm.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER) ||
                    lm.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER)
            } catch (_: Exception) {
                true
            }
            if (!ligado) {
                LocationSharing.setEnabled(context, false)
                pararTudo()
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        fused = LocationServices.getFusedLocationProviderClient(this)
        ContextCompat.registerReceiver(
            this,
            providerReceiver,
            IntentFilter(android.location.LocationManager.PROVIDERS_CHANGED_ACTION),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            LocationSharing.setEnabled(this, false)
            pararTudo()
            return START_NOT_STICKY
        }

        profile = intent?.getStringExtra(EXTRA_PROFILE) ?: LocationSharing.profile(this)
        val quem = profile
        if (quem != "Amanda" && quem != "Mateus") {
            stopSelf()
            return START_NOT_STICKY
        }

        // A notificação tem que subir antes de qualquer outra coisa: o Android
        // mata o processo se um serviço em primeiro plano demorar a se declarar.
        startForegroundCompat()

        if (!temPermissaoDeLocalizacao()) {
            // Sem permissão não dá pra rastrear. Some em vez de ficar de
            // notificação na barra prometendo algo que não está acontecendo.
            LocationSharing.setEnabled(this, false)
            pararTudo()
            return START_NOT_STICKY
        }

        LocationSharing.setEnabled(this, true)
        LocationSharing.setProfile(this, quem)
        ultimoMovimentoEm = System.currentTimeMillis()
        pedirAtualizacoes(INTERVALO_MOVIMENTO_MS)

        // START_STICKY: se o sistema matar o processo por memória, ele recria o
        // serviço sozinho (com intent nulo — daí o fallback pro perfil salvo).
        return START_STICKY
    }

    override fun onDestroy() {
        try {
            fused.removeLocationUpdates(callback)
        } catch (_: Exception) {
        }
        try {
            unregisterReceiver(providerReceiver)
        } catch (_: Exception) {
        }
        rede.shutdown()
        super.onDestroy()
    }

    private fun pararTudo() {
        val quem = profile ?: LocationSharing.profile(this)
        if (quem != null) {
            // Melhor esforço: avisa o servidor pra sumir do mapa do outro.
            val corpo = JSONObject().put("profile", quem).toString()
            try {
                rede.execute { runCatching { sendJson("DELETE", "$BASE_URL/location", corpo) } }
            } catch (_: Exception) {
                // executor já encerrado — o servidor reconcilia no próximo start.
            }
        }
        stopForegroundCompat()
        stopSelf()
    }

    private fun temPermissaoDeLocalizacao(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /** Reassina as atualizações num novo intervalo (só quando o degrau muda). */
    private fun pedirAtualizacoes(intervaloMs: Long) {
        if (intervaloMs == intervaloAtual) return
        if (!temPermissaoDeLocalizacao()) return
        intervaloAtual = intervaloMs

        val prioridade = if (intervaloMs == INTERVALO_OBSERVADO_MS) {
            Priority.PRIORITY_HIGH_ACCURACY
        } else {
            Priority.PRIORITY_BALANCED_POWER_ACCURACY
        }

        val request = LocationRequest.Builder(prioridade, intervaloMs)
            .setMinUpdateIntervalMillis(intervaloMs)
            // Com a pessoa parada, o sistema não acorda o rádio à toa.
            .setMinUpdateDistanceMeters(
                if (intervaloMs == INTERVALO_OBSERVADO_MS) 0f else DESLOCAMENTO_MINIMO_M
            )
            .setWaitForAccurateLocation(false)
            .build()

        try {
            fused.removeLocationUpdates(callback)
            fused.requestLocationUpdates(request, callback, Looper.getMainLooper())
        } catch (e: SecurityException) {
            LocationSharing.setEnabled(this, false)
            pararTudo()
        }
    }

    /** Escolhe o degrau conforme "sendo observado" e "parado/em movimento". */
    private fun ajustarCadencia() {
        val alvo = when {
            observado -> INTERVALO_OBSERVADO_MS
            System.currentTimeMillis() - ultimoMovimentoEm < PARADO_APOS_MS -> INTERVALO_MOVIMENTO_MS
            else -> INTERVALO_PARADO_MS
        }
        pedirAtualizacoes(alvo)
    }

    private fun enviar(loc: android.location.Location) {
        val quem = profile ?: return
        val corpo = JSONObject().apply {
            put("profile", quem)
            put("lat", loc.latitude)
            put("lng", loc.longitude)
            put("accuracy", loc.accuracy.toDouble())
            nivelDeBateria()?.let { put("battery", it) }
        }.toString()

        rede.execute {
            runCatching {
                val (codigo, resposta) = sendJson("PUT", "$BASE_URL/location", corpo)
                if (codigo == 410) {
                    // O servidor não tem sessão pra este perfil (expirou, ou o
                    // outro lado parou). Recria em modo "sempre" e segue.
                    val inicio = JSONObject(corpo).put("mode", "sempre").toString()
                    sendJson("POST", "$BASE_URL/location/start", inicio)
                } else if (codigo in 200..299) {
                    observado = JSONObject(resposta).optBoolean("partnerWatching", false)
                }
            }
        }
    }

    /** Bateria de 0 a 1 — vai junto da posição pra aparecer no mapa do outro. */
    private fun nivelDeBateria(): Double? {
        val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager ?: return null
        val pct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (pct in 0..100) pct / 100.0 else null
    }

    private fun startForegroundCompat() {
        criarCanal()

        val pararIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, LocationSharingService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notif: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Localização ligada 📍")
            .setContentText("${profile ?: "Você"} aparece no mapa do Mesinha")
            .setContentIntent(WidgetCommon.openAppIntent(this))
            .addAction(0, "Parar", pararIntent)
            .setOngoing(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notif)
        }
    }

    @Suppress("DEPRECATION")
    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            stopForeground(true)
        }
    }

    /**
     * Canal separado do `mesinha_default` e em importância baixa: a notificação
     * do rastreio fica na barra o tempo todo e não pode tocar som nem aparecer
     * como pop-up junto dos recadinhos.
     */
    private fun criarCanal() {
        val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
            mgr.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Localização", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Aviso de que sua localização está sendo compartilhada"
                    setShowBadge(false)
                }
            )
        }
    }

    /**
     * Requisição JSON no servidor do Mesinha. O `WidgetCommon.postJson` só faz
     * POST e com timeouts curtos (ele nasceu para um BroadcastReceiver com ~10s
     * de vida); aqui precisamos de PUT e DELETE, e podemos esperar mais.
     */
    private fun sendJson(metodo: String, urlStr: String, body: String): Pair<Int, String> {
        val conn = (java.net.URL(urlStr).openConnection() as java.net.HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            requestMethod = metodo
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", WidgetCommon.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${WidgetCommon.SUPABASE_ANON_KEY}")
        }
        try {
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val codigo = conn.responseCode
            val stream = if (codigo in 200..299) conn.inputStream else conn.errorStream
            val texto = stream?.bufferedReader()?.use { it.readText() } ?: ""
            return codigo to texto
        } finally {
            conn.disconnect()
        }
    }
}
