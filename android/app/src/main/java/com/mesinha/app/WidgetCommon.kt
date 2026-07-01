package com.mesinha.app

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Helper simples compartilhado pelos widgets (sem herança, para evitar
 * qualquer efeito colateral na instância do AppWidgetProvider).
 */
object WidgetCommon {

    /** PendingIntent que abre o app Mesinha ao tocar no widget. */
    fun openAppIntent(context: Context): PendingIntent {
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        return PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java),
            flags
        )
    }
}
