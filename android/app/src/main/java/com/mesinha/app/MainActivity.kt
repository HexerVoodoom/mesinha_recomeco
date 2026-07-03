package com.mesinha.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * Tela principal do app. Carrega o PWA do Mesinha dentro de uma WebView.
 *
 * Uma WebView crua não abre o seletor de arquivos de <input type="file"> nem
 * concede microfone ao getUserMedia — é preciso um WebChromeClient implementando
 * onShowFileChooser e onPermissionRequest. Sem isso, o upload de mídia do Mural
 * "não faz nada" ao tocar e a gravação de áudio falha dentro do app instalado.
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

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true        // o app é React/JS
            settings.domStorageEnabled = true        // localStorage/IndexedDB do PWA
            settings.databaseEnabled = true
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = false
            webViewClient = WebViewClient()          // navega dentro da WebView

            webChromeClient = object : WebChromeClient() {
                // Abre o seletor de arquivos do sistema para <input type="file">
                // (upload de imagem/vídeo/áudio no Mural e nas listas).
                override fun onShowFileChooser(
                    view: WebView?,
                    callback: ValueCallback<Array<Uri>>?,
                    params: FileChooserParams?
                ): Boolean {
                    // Descarta um seletor anterior que nunca retornou.
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

                // Concede microfone ao getUserMedia (gravação de áudio no Mural),
                // pedindo a permissão do sistema quando ainda não foi dada.
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
            }
        }
        setContentView(webView)

        webView.loadUrl(MESINHA_URL)

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
}
