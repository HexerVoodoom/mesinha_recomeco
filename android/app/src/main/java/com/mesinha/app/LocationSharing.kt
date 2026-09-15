package com.mesinha.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat

/**
 * Estado do modo "sempre" do Mapa: quem está compartilhando, se está ligado, e
 * as manhas de sistema pra isso continuar de pé (permissão de background e
 * isenção de otimização de bateria).
 *
 * O estado mora em SharedPreferences porque precisa sobreviver ao processo: é
 * o que o `BootReceiver` lê depois de um reboot e o que o `MainActivity`
 * consulta pra religar o serviço se alguma fabricante o tiver matado.
 */
object LocationSharing {

    private const val PREFS = "localizacao"
    private const val KEY_ENABLED = "sempre_ligado"
    private const val KEY_PROFILE = "perfil"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)

    fun setEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
    }

    fun profile(context: Context): String? = prefs(context).getString(KEY_PROFILE, null)

    fun setProfile(context: Context, profile: String) {
        prefs(context).edit().putString(KEY_PROFILE, profile).apply()
    }

    fun hasForegroundLocation(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /**
     * "Permitir o tempo todo". Só existe como permissão separada no Android 10+;
     * antes disso, a permissão normal já cobria o background.
     */
    fun hasBackgroundLocation(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return hasForegroundLocation(context)
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_BACKGROUND_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun start(context: Context, profile: String) {
        setEnabled(context, true)
        setProfile(context, profile)
        val intent = Intent(context, LocationSharingService::class.java).apply {
            action = LocationSharingService.ACTION_START
            putExtra(LocationSharingService.EXTRA_PROFILE, profile)
        }
        ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
        setEnabled(context, false)
        context.startService(
            Intent(context, LocationSharingService::class.java)
                .setAction(LocationSharingService.ACTION_STOP)
        )
    }

    /**
     * Religa o serviço se ele deveria estar rodando. Chamado no boot e toda vez
     * que o app abre — é a autocura contra as fabricantes que matam serviços
     * (Xiaomi, Oppo, alguns Samsung) sem avisar ninguém.
     */
    fun restartIfEnabled(context: Context) {
        if (!isEnabled(context)) return
        val profile = profile(context) ?: return
        if (!hasForegroundLocation(context)) {
            setEnabled(context, false)
            return
        }
        start(context, profile)
    }

    /**
     * Sem isenção da otimização de bateria, o Doze e as camadas das fabricantes
     * derrubam o serviço depois de algumas horas de tela apagada — e a
     * localização "sempre" vira "às vezes". Abre o diálogo do sistema; se o
     * aparelho não tiver essa tela, não faz nada (é melhor esforço).
     */
    fun requestBatteryExemption(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
        if (pm.isIgnoringBatteryOptimizations(context.packageName)) return
        try {
            @Suppress("BatteryLife") // uso legítimo: rastreio contínuo pedido pela pessoa
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            // Algumas ROMs não expõem essa tela; segue sem a isenção.
        }
    }
}
