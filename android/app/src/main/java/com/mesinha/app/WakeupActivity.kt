package com.mesinha.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Tela do despertador tocando — aparece por cima da tela de bloqueio.
 *
 * Não tem botão de "desligar" nem de "soneca": pra desligar, a pessoa escolhe
 * um dos 6 recadinhos, que vai de push pro outro. Voltar e as teclas de
 * volume não fazem nada enquanto toca.
 */
class WakeupActivity : AppCompatActivity() {

    private val serviceReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                WakeupRingService.ACTION_FINISHED -> finish()
                // Entrou (ou saiu) um despertador enquanto a tela está aberta.
                WakeupRingService.ACTION_CHANGED -> render()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { /* só desliga escolhendo um recadinho */ }
        })

        ContextCompat.registerReceiver(
            this, serviceReceiver,
            IntentFilter().apply {
                addAction(WakeupRingService.ACTION_FINISHED)
                addAction(WakeupRingService.ACTION_CHANGED)
            },
            ContextCompat.RECEIVER_NOT_EXPORTED
        )

        startFromFallback(intent)
        render()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        startFromFallback(intent)
        render()
    }

    /**
     * Aberta pela notificação de reserva (o Android não deixou o receiver
     * subir o serviço): agora, com a tela em primeiro plano, pode — sobe o
     * serviço e a música começa.
     */
    private fun startFromFallback(intent: Intent?) {
        val ids = intent?.getStringExtra(WakeupRingService.EXTRA_IDS) ?: return
        val occurrence = intent.getStringExtra(WakeupRingService.EXTRA_OCCURRENCE) ?: return
        intent.removeExtra(WakeupRingService.EXTRA_IDS)
        try {
            ContextCompat.startForegroundService(
                this,
                Intent(this, WakeupRingService::class.java)
                    .setAction(WakeupRingService.ACTION_START)
                    .putExtra(WakeupRingService.EXTRA_IDS, ids)
                    .putExtra(WakeupRingService.EXTRA_OCCURRENCE, occurrence)
            )
            waitingService = true
        } catch (_: Exception) { }
    }

    private var waitingService = false

    private fun render() {
        setContentView(buildUi())
    }

    override fun onResume() {
        super.onResume()
        // Abriu pela notificação depois que já parou de tocar: nada a fazer aqui.
        if (WakeupRingService.ringingIds.isEmpty() && !waitingService) finish()
    }

    override fun onDestroy() {
        try { unregisterReceiver(serviceReceiver) } catch (_: Exception) { }
        super.onDestroy()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ||
            keyCode == KeyEvent.KEYCODE_VOLUME_UP ||
            keyCode == KeyEvent.KEYCODE_VOLUME_MUTE
        ) return true
        return super.onKeyDown(keyCode, event)
    }

    private fun dp(v: Int) = TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics
    ).toInt()

    private fun buildUi(): View {
        val me = WakeupStore.profile(this) ?: "Amanda"
        val partner = if (me == "Amanda") "Mateus" else "Amanda"
        val bold = ResourcesCompat.getFont(this, R.font.quicksand_bold) ?: Typeface.DEFAULT_BOLD
        // Mesmos tokens de cor dos cards da Mesinha (PWA).
        val teal = Color.parseColor("#4D989B")
        val ink = Color.parseColor("#2B2A28")
        val muted = Color.parseColor("#8A847D")
        val beige = Color.parseColor("#E9E4DF")
        val cream = Color.parseColor("#F8F6F3")

        fun face(profile: String) = if (profile == "Mateus") R.drawable.corvinho else R.drawable.alpaquinha
        fun bubbleColor(profile: String) = Color.parseColor(if (profile == "Mateus") "#1A1A1A" else "#8B4513")
        fun card(fill: Int = Color.WHITE, stroke: Int = beige) = GradientDrawable().apply {
            cornerRadius = dp(16).toFloat()
            setColor(fill)
            setStroke(dp(2), stroke)
        }
        fun label(text: String, color: Int = teal) = TextView(this).apply {
            this.text = text.uppercase(Locale("pt", "BR"))
            typeface = bold
            setTextColor(color)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            letterSpacing = -0.01f
        }

        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(36), dp(24), dp(32))
        }

        // Selinho igual ao da grade de categorias.
        col.addView(TextView(this).apply {
            text = "🔔 DESPERTADOR"
            typeface = bold
            setTextColor(ink)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(dp(16), dp(4), dp(16), dp(4))
            background = GradientDrawable().apply { cornerRadius = dp(99).toFloat(); setColor(beige) }
        })

        val clock = TextView(this).apply {
            text = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
            typeface = bold
            setTextColor(ink)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 72f)
            gravity = Gravity.CENTER
            setPadding(0, dp(16), 0, 0)
        }
        col.addView(clock)
        // Pulsinho no relógio, igual à tela do navegador.
        android.animation.ObjectAnimator.ofPropertyValuesHolder(
            clock,
            android.animation.PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.04f, 1f),
            android.animation.PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.04f, 1f)
        ).apply { duration = 800; repeatCount = android.animation.ValueAnimator.INFINITE; start() }

        col.addView(TextView(this).apply {
            text = "Hora de acordar!"
            typeface = bold
            setTextColor(teal)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(20))
        })

        // Card com quem criou o despertador "falando" o recadinho no balão.
        val ringing = WakeupStore.all(this).filter { it.id in WakeupRingService.ringingIds }
        val withNote = ringing.firstOrNull { it.note.isNotBlank() }
        val speaker = (withNote ?: ringing.firstOrNull())?.createdBy?.takeIf { it == "Amanda" || it == "Mateus" } ?: partner
        val fala = withNote?.note ?: if (speaker == me) "Hora de levantar! ⏰" else "Acorda, amor! ☀️"

        col.addView(LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            background = card()
            setPadding(dp(14), dp(14), dp(14), dp(14))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            )
            val bicho = ImageView(this@WakeupActivity).apply {
                setImageResource(face(speaker))
                layoutParams = LinearLayout.LayoutParams(dp(64), dp(64)).apply { marginEnd = dp(12) }
            }
            addView(bicho)
            // Chacoalhando, como despertador de desenho.
            android.animation.ObjectAnimator.ofFloat(bicho, View.ROTATION, -8f, 8f).apply {
                duration = 175; repeatMode = android.animation.ValueAnimator.REVERSE
                repeatCount = android.animation.ValueAnimator.INFINITE; start()
            }
            addView(LinearLayout(this@WakeupActivity).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                addView(label(
                    if (speaker == me) "Você deixou anotado"
                    else "${if (speaker == "Mateus") "Corvinho" else "Alpaquinha"} ($speaker) diz",
                    muted
                ))
                addView(TextView(this@WakeupActivity).apply {
                    text = fala
                    typeface = bold
                    setTextColor(Color.WHITE)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                    setPadding(dp(12), dp(8), dp(12), dp(8))
                    // Balão com a "pontinha" no canto de cima, igual aos widgets.
                    background = GradientDrawable().apply {
                        val r = dp(16).toFloat(); val t = dp(4).toFloat()
                        cornerRadii = floatArrayOf(t, t, r, r, r, r, r, r)
                        setColor(bubbleColor(speaker))
                    }
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { topMargin = dp(4) }
                })
            })
        })

        // "Pra desligar, manda um recadinho pro Mateus" com a carinha de quem recebe.
        col.addView(LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(24), 0, dp(12))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            )
            addView(ImageView(this@WakeupActivity).apply {
                setImageResource(face(partner))
                layoutParams = LinearLayout.LayoutParams(dp(32), dp(32)).apply { marginEnd = dp(8) }
            })
            addView(label("Pra desligar, manda um recadinho ${if (partner == "Amanda") "pra Amanda" else "pro Mateus"}"))
        })

        // Os 6 recadinhos em grade 2x3 de cards brancos (fica verde ao tocar).
        WakeupMessages.LIST.chunked(2).forEach { par ->
            col.addView(LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = dp(8) }
                par.forEachIndexed { i, msg ->
                    addView(TextView(this@WakeupActivity).apply {
                        text = msg
                        typeface = bold
                        setTextColor(ink)
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                        gravity = Gravity.CENTER
                        minHeight = dp(76)
                        setPadding(dp(10), dp(14), dp(10), dp(14))
                        isClickable = true
                        background = android.graphics.drawable.StateListDrawable().apply {
                            addState(intArrayOf(android.R.attr.state_pressed), card(Color.parseColor("#D6F2EF"), teal))
                            addState(intArrayOf(), card())
                        }
                        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                            if (i == 0) marginEnd = dp(4) else marginStart = dp(4)
                        }
                        setOnClickListener { dismissWith(msg) }
                    })
                }
            })
        }

        return ScrollView(this).apply {
            setBackgroundColor(cream)
            isFillViewport = true
            addView(col)
            // targetSdk 36 desenha por baixo das barras do sistema: afasta o
            // conteúdo da barra de status e dos botões de navegação.
            ViewCompat.setOnApplyWindowInsetsListener(this) { v, insets ->
                val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                insets
            }
        }
    }

    private fun dismissWith(message: String) {
        startService(
            Intent(this, WakeupRingService::class.java)
                .setAction(WakeupRingService.ACTION_DISMISS)
                .putExtra(WakeupRingService.EXTRA_MESSAGE, message)
        )
        finish()
    }
}
