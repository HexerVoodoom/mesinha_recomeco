package com.mesinha.app

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.InputFilter
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Configuração do widget Poke, aberta quando ele é adicionado à tela: escolhe
 * quem está cutucando (Amanda ou Mateus) e a mensagem enviada a cada toque —
 * uma das rápidas do app ou uma personalizada. A UI é montada em código para
 * não depender de mais recursos; segue as cores do Mesinha.
 *
 * Estende AppCompatActivity de propósito: o tema do app é
 * `Theme.AppCompat.DayNight.NoActionBar`, e uma `android.app.Activity` comum
 * com tema AppCompat quebra ao abrir. Como o Android abre esta tela no
 * momento em que o widget é arrastado pra tela inicial, essa quebra aparecia
 * como "não foi possível carregar o widget".
 */
class PokeConfigActivity : AppCompatActivity() {

    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)

        widgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        val pad = dp(20)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            setBackgroundColor(Color.parseColor("#F8F6F3"))
        }

        root.addView(title(getString(R.string.widget_poke_config_title)))
        root.addView(label(getString(R.string.widget_poke_config_who)))

        val whoGroup = RadioGroup(this).apply {
            orientation = RadioGroup.VERTICAL
            addView(radio("Amanda", 1))
            addView(radio("Mateus", 2))
        }
        root.addView(whoGroup)

        root.addView(label(getString(R.string.widget_poke_config_message)))

        val messageGroup = RadioGroup(this).apply {
            orientation = RadioGroup.VERTICAL
            QUICK_MESSAGES.forEachIndexed { index, msg ->
                addView(radio(msg, 10 + index))
            }
            addView(radio(getString(R.string.widget_poke_config_custom), 99))
            check(10)
        }
        root.addView(messageGroup)

        val customInput = EditText(this).apply {
            hint = getString(R.string.widget_poke_config_custom_hint)
            filters = arrayOf(InputFilter.LengthFilter(NUDGE_MAX_LEN))
            isEnabled = false
            setTextColor(Color.parseColor("#1A1A1A"))
        }
        root.addView(customInput)
        messageGroup.setOnCheckedChangeListener { _, checkedId ->
            customInput.isEnabled = checkedId == 99
        }

        val saveButton = Button(this).apply {
            text = getString(R.string.widget_poke_config_save)
            setBackgroundColor(Color.parseColor("#4D989B"))
            setTextColor(Color.WHITE)
            setOnClickListener {
                val from = when (whoGroup.checkedRadioButtonId) {
                    1 -> "Amanda"
                    2 -> "Mateus"
                    else -> null
                }
                if (from == null) {
                    (whoGroup.getChildAt(0) as RadioButton).requestFocus()
                    android.widget.Toast.makeText(
                        this@PokeConfigActivity,
                        R.string.widget_poke_config_pick_who,
                        android.widget.Toast.LENGTH_SHORT
                    ).show()
                    return@setOnClickListener
                }
                val message = when (val checked = messageGroup.checkedRadioButtonId) {
                    99 -> customInput.text.toString().trim()
                    in 10 until 10 + QUICK_MESSAGES.size -> QUICK_MESSAGES[checked - 10]
                    else -> null
                }
                PokeConfig.save(this@PokeConfigActivity, widgetId, from, message)

                // O resultado vem ANTES do desenho: é ele que faz o launcher
                // concluir a colocação e criar a view do widget. Desenhando
                // antes disso (como estava), em vários launchers o único
                // RemoteViews da vida do widget chegava cedo demais e se
                // perdia — e o widget ficava com "não foi possível carregar".
                setResult(
                    RESULT_OK,
                    Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                )
                PokeWidgetProvider.renderWidget(
                    this@PokeConfigActivity,
                    AppWidgetManager.getInstance(this@PokeConfigActivity),
                    widgetId
                )
                // E ainda pede um desenho pelo caminho normal do sistema, já
                // com o widget posicionado.
                PokeWidgetProvider.requestUpdate(this@PokeConfigActivity, widgetId)
                finish()
            }
        }
        root.addView(saveButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(20) })

        setContentView(ScrollView(this).apply { addView(root) })
    }

    private fun title(text: String) = TextView(this).apply {
        this.text = text
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
        setTextColor(Color.parseColor("#4D989B"))
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, dp(12))
    }

    private fun label(text: String) = TextView(this).apply {
        this.text = text
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        setTextColor(Color.parseColor("#1A1A1A"))
        setPadding(0, dp(14), 0, dp(4))
    }

    private fun radio(text: String, id: Int) = RadioButton(this).apply {
        this.text = text
        this.id = id
        setTextColor(Color.parseColor("#1A1A1A"))
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    companion object {
        // Mesmas mensagens rápidas do NudgeModal do app (src/app/components/NudgeModal.tsx).
        private val QUICK_MESSAGES = listOf(
            "tá pensando em você agora 💭",
            "saudade! 🥺",
            "te amo 💗",
            "bora marcar alguma coisa? 👀",
            "olha o Mural que tem coisa nova 🎁",
        )
        private const val NUDGE_MAX_LEN = 90
    }
}
