package com.mesinha.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * Tela principal do app. Carrega o PWA do Mesinha dentro de uma WebView, de modo
 * que o app instalado oferece a mesma experiência do site — e o widget de tela
 * inicial complementa com a "conversa do dia".
 */
class MainActivity : AppCompatActivity() {

    companion object {
        /**
         * URL do PWA do Mesinha publicado (Cloudflare Pages).
         */
        const val MESINHA_URL = "https://mesinha-recomeco2.pages.dev/"
    }

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true        // o app é React/JS
            settings.domStorageEnabled = true        // localStorage/IndexedDB do PWA
            settings.databaseEnabled = true
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            webViewClient = WebViewClient()          // navega dentro da WebView
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
