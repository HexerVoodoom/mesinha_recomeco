package com.mesinha.app

import android.content.Context
import android.widget.RemoteViews

/**
 * Widget só da Alpaquinha (Amanda): um balão com um recadinho da Amanda para o
 * Mateus. O conteúdo muda 1x por dia (ver [Dialogues.AMANDA_TO_MATEUS]).
 */
class AlpaquinhaWidgetProvider : BaseWidgetProvider() {

    override val scheduleRequestCode = 4322

    override fun render(context: Context): RemoteViews {
        return RemoteViews(context.packageName, R.layout.widget_alpaquinha).apply {
            setTextViewText(R.id.tv_message, Dialogues.amandaToday())
        }
    }
}
