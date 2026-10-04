package com.mesinha.app

import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import org.json.JSONArray
import org.json.JSONObject

/**
 * Despertador — o que pode impedir de tocar com o app fechado, e o "recibo"
 * que o celular manda pro servidor dizendo o que tem agendado.
 *
 * Por que existe: o despertador pode estar certinho no servidor e mesmo assim
 * não tocar — app desatualizado, FCM que não chegou, fabricante que não deixa
 * o app acordar sozinho (Xiaomi, OPPO, vivo, Huawei...). Sem um recibo, quem
 * criou o despertador não tem como saber. Com ele, o painel mostra
 * "agendado no celular" ou "ainda não chegou no celular", e o que falta liberar.
 */
object WakeupDiagnostics {

    /** As permissões/ajustes que o painel mostra como "falta liberar". */
    fun permissions(context: Context): JSONObject {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val fullScreen = if (Build.VERSION.SDK_INT >= 34) nm.canUseFullScreenIntent() else true
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val out = JSONObject()
            .put("exact", WakeupScheduler.canScheduleExact(context))
            .put("fullScreen", fullScreen)
            .put("notifications", nm.areNotificationsEnabled() && WakeupRingService.channelEnabled(context))
            .put("battery", pm.isIgnoringBatteryOptimizations(context.packageName))
        // Só aparece nas marcas que têm essa trava (nas outras, nem existe a tela).
        OemAutostart.granted(context)?.let { out.put("autostart", it) }
        return out
    }

    /**
     * Manda pro servidor o que este celular tem agendado (bloqueante, rodar
     * fora da thread principal). Falhou? Tudo bem: vai de novo no próximo sync.
     */
    fun reportDevice(context: Context) {
        val profile = WakeupStore.profile(context) ?: return
        val now = System.currentTimeMillis()
        val proximos = WakeupStore.mine(context)
            .mapNotNull { w -> w.nextAfter(now)?.let { w.id to it } }
        val versao = try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        } catch (_: Exception) { null }
        val body = JSONObject()
            .put("profile", profile)
            .put("ids", JSONArray(proximos.map { it.first }))
            .put("nextAt", proximos.minOfOrNull { it.second }?.let { WakeupScheduler.isoUtc(it) } ?: JSONObject.NULL)
            .put("perms", permissions(context))
            .put("appVersion", versao ?: "")
            .put("model", "${Build.MANUFACTURER} ${Build.MODEL}".take(60))
            .put("sdk", Build.VERSION.SDK_INT)
        WakeupApi.request("POST", "/wakeups/device", body)
    }
}

/**
 * "Início automático" das fabricantes que, além da otimização de bateria do
 * Android, impedem um app fechado de ser acordado (pelo alarme, pelo FCM, pelo
 * boot). Sem liberar isso, o AlarmManager até dispara, mas o sistema não deixa
 * a Mesinha subir — e o despertador não toca.
 */
object OemAutostart {
    private const val PREFS = "oem_autostart"
    private const val KEY_OPENED = "opened"

    // Telas conhecidas, da mais nova pra mais antiga de cada marca.
    private val TELAS: Map<String, List<ComponentName>> = mapOf(
        "xiaomi" to listOf(
            ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
        ),
        "oppo" to listOf(
            ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
            ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
            ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
        ),
        "vivo" to listOf(
            ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
            ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
        ),
        "huawei" to listOf(
            ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
            ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
        ),
        "asus" to listOf(
            ComponentName("com.asus.mobilemanager", "com.asus.mobilemanager.entry.FunctionActivity"),
        ),
    )

    private fun marca(): String? {
        val m = Build.MANUFACTURER.lowercase()
        return when {
            m in listOf("xiaomi", "redmi", "poco") -> "xiaomi"
            m in listOf("oppo", "realme", "oneplus") -> "oppo"
            m in listOf("vivo", "iqoo") -> "vivo"
            m in listOf("huawei", "honor") -> "huawei"
            m == "asus" -> "asus"
            else -> null
        }
    }

    /**
     * null = esta marca não tem essa trava. Na Xiaomi dá pra ler o estado de
     * verdade (op 10008 do MIUI); nas outras não há API, então vale "a pessoa
     * já abriu a tela e liberou".
     */
    fun granted(context: Context): Boolean? {
        val marca = marca() ?: return null
        if (marca == "xiaomi") {
            try {
                // A versão com o número da op não é API pública: vai por reflexão.
                val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                val metodo = AppOpsManager::class.java.getMethod(
                    "checkOpNoThrow", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType, String::class.java
                )
                val modo = metodo.invoke(ops, 10008, android.os.Process.myUid(), context.packageName) as Int
                return modo == AppOpsManager.MODE_ALLOWED
            } catch (_: Exception) {
                // MIUI sem essa op (HyperOS novo, por ex.): cai no "já abriu".
            }
        }
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_OPENED, false)
    }

    /** Abre a tela de início automático da marca (ou os detalhes do app, se não achar). */
    fun open(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_OPENED, true).apply()
        for (tela in TELAS[marca()].orEmpty()) {
            try {
                context.startActivity(Intent().setComponent(tela).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                return
            } catch (_: Exception) {
                // Essa versão da ROM não tem essa tela: tenta a próxima.
            }
        }
        try {
            context.startActivity(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        } catch (_: Exception) { }
    }
}
