package com.mesinha.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging

/**
 * Tela principal do app. Carrega o PWA do Mesinha dentro de uma WebView e liga
 * as pontes nativas necessárias: seletor de arquivos, microfone, notificações
 * (FCM) e a "conversa" com o PWA para saber quem está logado.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        /** URL do PWA do Mesinha publicado (Cloudflare Pages). */
        const val MESINHA_URL = "https://mesinha-recomeco2.pages.dev/"
    }

    private lateinit var webView: WebView

    // Callback pendente do <input type="file"> aguardando o resultado do seletor.
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            filePathCallback?.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            )
            filePathCallback = null
        }

    // Pedido de permissão da página (getUserMedia) aguardando o diálogo do sistema.
    private var pendingWebPermission: PermissionRequest? = null

    private val micPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            pendingWebPermission?.let { request ->
                if (granted) request.grant(request.resources) else request.deny()
            }
            pendingWebPermission = null
        }

    private val notifPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* opcional */ }

    // Pedido de geolocalização da página (aba Mapa) aguardando o diálogo do sistema.
    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null

    private val locationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            pendingGeoOrigin?.let { origin -> pendingGeoCallback?.invoke(origin, granted, false) }
            pendingGeoOrigin = null
            pendingGeoCallback = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        NotificationHelper.ensureChannel(this)
        requestNotificationPermissionIfNeeded()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true        // o app é React/JS
            settings.domStorageEnabled = true        // localStorage/IndexedDB do PWA
            settings.databaseEnabled = true
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = false
            settings.setGeolocationEnabled(true) // navigator.geolocation na aba Mapa
            webViewClient = WebViewClient()          // navega dentro da WebView

            // Ponte JS↔nativo: o PWA informa quem está logado para registrarmos o
            // token FCM sob o perfil certo (Amanda/Mateus).
            addJavascriptInterface(NativeBridge(), "MesinhaNative")

            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView?,
                    callback: ValueCallback<Array<Uri>>?,
                    params: FileChooserParams?
                ): Boolean {
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = callback
                    return try {
                        fileChooserLauncher.launch(params!!.createIntent())
                        true
                    } catch (_: Exception) {
                        filePathCallback = null
                        false
                    }
                }

                override fun onPermissionRequest(request: PermissionRequest) {
                    val wantsMic =
                        request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                    if (!wantsMic) {
                        request.deny()
                        return
                    }
                    val hasMic = ContextCompat.checkSelfPermission(
                        this@MainActivity, Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED
                    if (hasMic) {
                        request.grant(request.resources)
                    } else {
                        pendingWebPermission?.deny()
                        pendingWebPermission = request
                        micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                }

                override fun onGeolocationPermissionsShowPrompt(
                    origin: String,
                    callback: GeolocationPermissions.Callback
                ) {
                    val hasFineLocation = ContextCompat.checkSelfPermission(
                        this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED
                    if (hasFineLocation) {
                        callback.invoke(origin, true, false)
                    } else {
                        pendingGeoOrigin = origin
                        pendingGeoCallback = callback
                        locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                    }
                }
            }

            // Sem isso, a WebView não sabe o que fazer com um link de download
            // (ex.: o APK mais recente em Configurações) — delega pro
            // DownloadManager do sistema, que baixa e notifica quando terminar
            // (tocar na notificação abre o instalador de pacotes).
            setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
                try {
                    val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
                    val request = DownloadManager.Request(Uri.parse(url)).apply {
                        addRequestHeader("User-Agent", userAgent)
                        setMimeType(mimeType)
                        setTitle(fileName)
                        setDescription("Baixando atualização do Mesinha...")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalFilesDir(this@MainActivity, Environment.DIRECTORY_DOWNLOADS, fileName)
                    }
                    (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
                    Toast.makeText(this@MainActivity, "Baixando... veja o progresso nas notificações", Toast.LENGTH_LONG).show()
                } catch (_: Exception) {
                    Toast.makeText(this@MainActivity, "Não foi possível iniciar o download", Toast.LENGTH_LONG).show()
                }
            }
        }
        setContentView(webView)

        webView.loadUrl(MESINHA_URL)

        // Autocura: ao abrir o app, força os widgets a re-renderizar (frase do dia
        // e coração do Calendário de Encontros) e buscar dados novos do servidor,
        // mesmo que o alarme diário tenha sido descartado pela otimização de bateria.
        refreshWidgets()

        // Botão "voltar" navega no histórico da WebView antes de sair do app.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun refreshWidgets() {
        val providers = listOf(
            MesinhaWidgetProvider::class.java,
            AlpaquinhaWidgetProvider::class.java,
            CorvinhoWidgetProvider::class.java,
            MeetupWidgetProvider::class.java
        )
        for (cls in providers) {
            sendBroadcast(
                android.content.Intent(this, cls).apply {
                    action = WidgetScheduler.ACTION_DAILY_UPDATE
                }
            )
        }
    }

    /** Exposto ao PWA como `window.MesinhaNative`. */
    inner class NativeBridge {
        @JavascriptInterface
        fun setProfile(profile: String) {
            if (profile != "Amanda" && profile != "Mateus") return
            val prefs = getSharedPreferences("fcm", MODE_PRIVATE)
            prefs.edit().putString("profile", profile).apply()
            // Pega o token atual e registra sob esse perfil.
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    prefs.edit().putString("token", token).apply()
                    FcmRegistrar.register(applicationContext, profile, token)
                }
            }
        }
    }
}
