package com.mesinha.app

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.tanh

/**
 * Toque do Despertador — "Abertura de Anime" (procedural).
 *
 * Loop de 8 compassos no espírito das aberturas de anime dos anos 90:
 * progressão "royal road" (IV–V–iii–vi), melodia de synth quadrado com
 * vibrato, baixo pulando oitava, acordes nos contratempos e bateria.
 * Gerado na hora, sem arquivo de áudio.
 *
 * É o MESMO sintetizador de `src/app/utils/wakeupTune.ts` (o PWA usa aquele
 * pra prévia). Mexeu num, mexe no outro.
 */
object WakeupTune {

    const val SAMPLE_RATE = 22050
    private const val BPM = 152.0

    // [nota MIDI, duração em colcheias]; 8 colcheias por compasso.
    private val MELODY = arrayOf(
        intArrayOf(74, 2), intArrayOf(76, 1), intArrayOf(78, 3), intArrayOf(76, 1), intArrayOf(74, 1), // G
        intArrayOf(76, 2), intArrayOf(73, 1), intArrayOf(69, 3), intArrayOf(71, 1), intArrayOf(73, 1), // A
        intArrayOf(74, 2), intArrayOf(73, 1), intArrayOf(74, 1), intArrayOf(78, 2), intArrayOf(81, 2), // F#m
        intArrayOf(78, 4), intArrayOf(76, 1), intArrayOf(74, 1), intArrayOf(76, 2),                    // Bm
        intArrayOf(74, 2), intArrayOf(76, 1), intArrayOf(78, 3), intArrayOf(79, 1), intArrayOf(78, 1), // G
        intArrayOf(76, 2), intArrayOf(78, 1), intArrayOf(81, 3), intArrayOf(79, 1), intArrayOf(78, 1), // A
        intArrayOf(79, 2), intArrayOf(78, 1), intArrayOf(76, 2), intArrayOf(74, 1), intArrayOf(76, 2), // Em
        intArrayOf(76, 3), intArrayOf(78, 1), intArrayOf(76, 1), intArrayOf(73, 1), intArrayOf(69, 2), // A
    )

    // Um acorde por compasso: baixo + notas do acorde.
    private val BASS = intArrayOf(43, 45, 42, 47, 43, 45, 40, 45)
    private val CHORDS = arrayOf(
        intArrayOf(55, 59, 62), intArrayOf(57, 61, 64), intArrayOf(54, 57, 61), intArrayOf(59, 62, 66),
        intArrayOf(55, 59, 62), intArrayOf(57, 61, 64), intArrayOf(52, 55, 59), intArrayOf(57, 61, 64),
    )

    private fun midiHz(n: Int): Double = 440.0 * 2.0.pow((n - 69) / 12.0)

    /** PCM 16-bit mono, exatamente 8 compassos (loop sem emenda). */
    val pcm: ShortArray by lazy { render(SAMPLE_RATE).let { f -> ShortArray(f.size) { (f[it] * 32767).roundToInt().toShort() } } }

    fun render(sampleRate: Int): FloatArray {
        val sr = sampleRate.toDouble()
        val eighth = 60.0 / BPM / 2.0
        val totalEighths = BASS.size * 8
        val len = (totalEighths * eighth * sr).roundToInt()
        val out = FloatArray(len)
        val eighthSamples = eighth * sr

        // Mesmo xorshift do TS, pra bateria soar igual.
        var seed = 0x12345678
        fun noise(): Double {
            seed = seed xor (seed shl 13)
            seed = seed xor (seed ushr 17)
            seed = seed xor (seed shl 5)
            return ((seed.toLong() and 0xffffffffL).toDouble() / 0xffffffffL.toDouble()) * 2 - 1
        }

        // Lead
        var pos = 0
        for (step in MELODY) {
            val note = step[0]
            val dur = step[1]
            val start = (pos * eighthSamples).roundToInt()
            val n = (dur * eighthSamples).roundToInt()
            pos += dur
            if (note == 0) continue
            val hz = midiHz(note)
            var phase = 0.0
            var i = 0
            while (i < n && start + i < len) {
                val t = i / sr
                val vib = if (t > 0.12) sin(2 * PI * 5.5 * t) * 0.006 else 0.0
                phase += hz * (1 + vib) / sr
                phase -= floor(phase)
                val pulse = if (phase < 0.25) 1.0 else -1.0
                val tri = 1 - 4 * abs(phase - 0.5)
                val attack = min(1.0, t / 0.01)
                val release = min(1.0, (n - i) / (sr * 0.03))
                val env = attack * release * (0.75 + 0.25 * exp(-t * 6))
                out[start + i] += ((pulse * 0.6 + tri * 0.4) * env * 0.26).toFloat()
                i++
            }
        }

        for (bar in BASS.indices) {
            for (k in 0 until 8) {
                val start = ((bar * 8 + k) * eighthSamples).roundToInt()
                val n = eighthSamples.roundToInt()

                // Baixo pulando oitava
                val bhz = midiHz(BASS[bar] + if (k % 2 == 1) 12 else 0)
                var bp = 0.5
                var i = 0
                while (i < n && start + i < len) {
                    bp += bhz / sr; bp -= floor(bp)
                    val env = exp(-i / sr * 7) * min(1.0, (n - i) / (sr * 0.01))
                    out[start + i] += ((2 * bp - 1) * env * 0.16).toFloat()
                    i++
                }

                // Acordes nos contratempos
                if (k % 2 == 1) {
                    for (cn in CHORDS[bar]) {
                        val hz = midiHz(cn)
                        var cp = 0.0
                        val m = min(n, (sr * 0.12).roundToInt())
                        var j = 0
                        while (j < m && start + j < len) {
                            cp += hz / sr; cp -= floor(cp)
                            val env = exp(-j / sr * 18)
                            out[start + j] += ((if (cp < 0.5) 1.0 else -1.0) * env * 0.045).toFloat()
                            j++
                        }
                    }
                }

                // Bateria
                val isKick = k == 0 || k == 4 || (bar % 2 == 1 && k == 5)
                val isSnare = k == 2 || k == 6
                val m = (sr * 0.18).roundToInt()
                var kp = 0.0
                var j = 0
                while (j < m && start + j < len) {
                    val t = j / sr
                    var s = 0.0
                    if (isKick) {
                        kp += (50 + 110 * exp(-t * 35)) / sr
                        s += sin(2 * PI * kp) * exp(-t * 14) * 0.5
                    }
                    val nz = noise()
                    if (isSnare) s += nz * exp(-t * 22) * 0.22
                    if (t < 0.04) s += nz * exp(-t * 90) * 0.06
                    out[start + j] += s.toFloat()
                    j++
                }
            }
        }

        for (i in out.indices) out[i] = tanh(out[i] * 1.6f)
        return out
    }
}
