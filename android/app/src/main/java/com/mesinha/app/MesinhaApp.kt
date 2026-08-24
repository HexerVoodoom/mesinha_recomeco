package com.mesinha.app

import android.app.Application

/**
 * Cria o canal de notificação assim que o processo sobe — inclusive quando
 * quem acorda o app é o Firebase, e não a MainActivity.
 *
 * No Android 8+ uma notificação enviada para um canal INEXISTENTE é
 * simplesmente descartada pelo sistema, sem erro nenhum: o servidor registra
 * "[FCM] enviado" e nada aparece no aparelho. Como o canal só era criado no
 * `onCreate` da MainActivity, qualquer processo iniciado sem passar por ela
 * (app instalado e ainda não aberto, dados limpos, processo acordado só pelo
 * FCM) ficava exatamente nesse buraco.
 */
class MesinhaApp : Application() {
    override fun onCreate() {
        super.onCreate()
        NotificationHelper.ensureChannel(this)
    }
}
