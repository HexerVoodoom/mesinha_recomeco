package com.mesinha.app

import android.content.Context
import android.widget.RemoteViews

/**
 * Widget duplo (2x4): Corvinho à esquerda, Alpaquinha à direita e dois balões
 * de fala no centro. O conteúdo muda 1x por dia (ver [Dialogues.POOL]).
 */
class MesinhaWidgetProvider : BaseWidgetProvider() {

    override val scheduleRequestCode = 4321

    override fun render(context: Context): RemoteViews {
        val dialogue = Dialogues.today()
        return RemoteViews(context.packageName, R.layout.widget_dialogue).apply {
            setTextViewText(R.id.tv_corvinho, dialogue.corvinho)
            setTextViewText(R.id.tv_alpaquinha, dialogue.alpaquinha)
        }
    }
}
