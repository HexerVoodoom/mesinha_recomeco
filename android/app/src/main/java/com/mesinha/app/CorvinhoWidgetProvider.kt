package com.mesinha.app

import android.content.Context
import android.widget.RemoteViews

/**
 * Widget só do Corvinho (Mateus): um balão com um recadinho do Mateus para a
 * Amanda. O conteúdo muda 1x por dia (ver [Dialogues.MATEUS_TO_AMANDA]).
 */
class CorvinhoWidgetProvider : BaseWidgetProvider() {

    override val scheduleRequestCode = 4323

    override fun render(context: Context): RemoteViews {
        return RemoteViews(context.packageName, R.layout.widget_corvinho).apply {
            setTextViewText(R.id.tv_message, Dialogues.mateusToday())
        }
    }
}
