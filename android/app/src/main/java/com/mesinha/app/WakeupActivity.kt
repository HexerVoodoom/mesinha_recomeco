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
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
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

    private val finishedReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) = finish()
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
            this, finishedReceiver, IntentFilter(WakeupRingService.ACTION_FINISHED),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )

        setContentView(buildUi())
    }

    override fun onResume() {
        super.onResume()
        // Abriu pela notificação depois que já parou de tocar: nada a fazer aqui.
        if (WakeupRingService.ringingIds.isEmpty()) finish()
    }

    override fun onDestroy() {
        try { unregisterReceiver(finishedReceiver) } catch (_: Exception) { }
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
        val quicksand = ResourcesCompat.getFont(this, R.font.quicksand) ?: Typeface.DEFAULT
        val bold = ResourcesCompat.getFont(this, R.font.quicksand_bold) ?: Typeface.DEFAULT_BOLD
        val teal = ContextCompat.getColor(this, R.color.mesinha_teal_dark)
        val ink = Color.parseColor("#2B2A28")

        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(40), dp(24), dp(32))
        }

        // O bichinho de quem vai receber o recado: Corvinho = Mateus, Alpaquinha = Amanda.
        col.addView(ImageView(this).apply {
            setImageResource(if (partner == "Mateus") R.drawable.corvinho else R.drawable.alpaquinha)
            adjustViewBounds = true
            layoutParams = LinearLayout.LayoutParams(dp(110), dp(110))
        })

        col.addView(TextView(this).apply {
            text = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
            typeface = bold
            setTextColor(ink)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 64f)
            gravity = Gravity.CENTER
        })
        col.addView(TextView(this).apply {
            text = "Hora de acordar! ⏰"
            typeface = bold
            setTextColor(teal)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(12))
        })

        // Recadinhos de quem criou o despertador.
        val ringing = WakeupStore.all(this).filter { it.id in WakeupRingService.ringingIds }
        for (w in ringing.filter { it.note.isNotBlank() }) {
            col.addView(TextView(this).apply {
                text = if (w.createdBy != me) "Recadinho de ${w.createdBy}: “${w.note}”" else "“${w.note}”"
                typeface = quicksand
                setTextColor(ink)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, dp(8))
            })
        }

        col.addView(TextView(this).apply {
            text = "Pra desligar, escolhe um recadinho ${if (partner == "Amanda") "pra Amanda" else "pro Mateus"}:"
            typeface = quicksand
            setTextColor(Color.parseColor("#6B6660"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            gravity = Gravity.CENTER
            setPadding(0, dp(12), 0, dp(12))
        })

        for (msg in WakeupMessages.LIST) {
            col.addView(Button(this).apply {
                text = msg
                isAllCaps = false
                typeface = bold
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
                background = GradientDrawable().apply {
                    cornerRadius = dp(18).toFloat()
                    setColor(teal)
                }
                setPadding(dp(16), dp(14), dp(16), dp(14))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = dp(10) }
                setOnClickListener { dismissWith(msg) }
            })
        }

        return ScrollView(this).apply {
            setBackgroundColor(ContextCompat.getColor(this@WakeupActivity, R.color.mesinha_cream))
            isFillViewport = true
            addView(col)
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
