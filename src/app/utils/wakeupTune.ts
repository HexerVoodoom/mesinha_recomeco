// Toque do Despertador — "Abertura de Anime" (procedural)
//
// Um loop de 8 compassos no espírito das aberturas de anime dos anos 90:
// progressão "royal road" (IV–V–iii–vi, a queridinha do J-pop), melodia de
// synth quadrado com vibrato, baixo pulando oitava em colcheias, acordes nos
// contratempos e bateria de caixa/chimbal. Tudo gerado na hora — sem arquivo
// de áudio e sem direitos autorais pra se preocupar.
//
// A MESMA partitura e o MESMO sintetizador existem em Kotlin
// (android/.../WakeupTune.kt), que é quem toca de verdade com o app fechado.
// Mexeu aqui, mexe lá também. Quando entrarem as músicas escolhidas, este
// arquivo vira só uma das opções.

export const TUNE_BPM = 152;

// Melodia: [nota MIDI, duração em colcheias]; 0 = pausa. 8 colcheias/compasso.
export const TUNE_MELODY: [number, number][] = [
  // G
  [74, 2], [76, 1], [78, 3], [76, 1], [74, 1],
  // A
  [76, 2], [73, 1], [69, 3], [71, 1], [73, 1],
  // F#m
  [74, 2], [73, 1], [74, 1], [78, 2], [81, 2],
  // Bm
  [78, 4], [76, 1], [74, 1], [76, 2],
  // G
  [74, 2], [76, 1], [78, 3], [79, 1], [78, 1],
  // A
  [76, 2], [78, 1], [81, 3], [79, 1], [78, 1],
  // Em
  [79, 2], [78, 1], [76, 2], [74, 1], [76, 2],
  // A (volta pro começo)
  [76, 3], [78, 1], [76, 1], [73, 1], [69, 2],
];

// Um acorde por compasso: [baixo MIDI, notas do acorde MIDI].
export const TUNE_CHORDS: [number, number[]][] = [
  [43, [55, 59, 62]], // G
  [45, [57, 61, 64]], // A
  [42, [54, 57, 61]], // F#m
  [47, [59, 62, 66]], // Bm
  [43, [55, 59, 62]], // G
  [45, [57, 61, 64]], // A
  [40, [52, 55, 59]], // Em
  [45, [57, 61, 64]], // A
];

const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Gerador pseudoaleatório fixo, pra bateria soar igual toda vez (e igual ao Kotlin). */
function makeNoise() {
  let s = 0x12345678;
  return () => {
    s ^= s << 13; s |= 0;
    s ^= s >>> 17;
    s ^= s << 5; s |= 0;
    return ((s >>> 0) / 0xffffffff) * 2 - 1;
  };
}

/**
 * Renderiza o loop inteiro em PCM mono (-1..1). O tamanho é exatamente 8
 * compassos, então dá pra repetir sem emenda.
 */
export function renderWakeupTune(sampleRate: number): Float32Array {
  const eighth = 60 / TUNE_BPM / 2;
  const totalEighths = TUNE_CHORDS.length * 8;
  const len = Math.round(totalEighths * eighth * sampleRate);
  const out = new Float32Array(len);
  const noise = makeNoise();
  const eighthSamples = eighth * sampleRate;

  // Lead: onda quadrada (pulso 25%) com vibrato atrasado e envelope de "sopro".
  let pos = 0;
  for (const [note, dur] of TUNE_MELODY) {
    const start = Math.round(pos * eighthSamples);
    const n = Math.round(dur * eighthSamples);
    pos += dur;
    if (note === 0) continue;
    const hz = midiHz(note);
    let phase = 0;
    for (let i = 0; i < n && start + i < len; i++) {
      const t = i / sampleRate;
      const vib = t > 0.12 ? Math.sin(2 * Math.PI * 5.5 * t) * 0.006 : 0;
      phase += (hz * (1 + vib)) / sampleRate;
      phase -= Math.floor(phase);
      const pulse = phase < 0.25 ? 1 : -1;
      const tri = 1 - 4 * Math.abs(phase - 0.5);
      const attack = Math.min(1, t / 0.01);
      const release = Math.min(1, (n - i) / (sampleRate * 0.03));
      const env = attack * release * (0.75 + 0.25 * Math.exp(-t * 6));
      out[start + i] += (pulse * 0.6 + tri * 0.4) * env * 0.26;
    }
  }

  for (let bar = 0; bar < TUNE_CHORDS.length; bar++) {
    const [bass, chord] = TUNE_CHORDS[bar];
    for (let k = 0; k < 8; k++) {
      const start = Math.round((bar * 8 + k) * eighthSamples);
      const n = Math.round(eighthSamples);

      // Baixo pulando oitava (tônica / oitava acima), serra suave.
      const bhz = midiHz(bass + (k % 2 === 1 ? 12 : 0));
      let bp = 0.5; // começa no zero da serra (sem estalo na emenda do loop)
      for (let i = 0; i < n && start + i < len; i++) {
        bp += bhz / sampleRate; bp -= Math.floor(bp);
        const env = Math.exp(-i / sampleRate * 7) * Math.min(1, (n - i) / (sampleRate * 0.01));
        out[start + i] += (2 * bp - 1) * env * 0.16;
      }

      // Acordes nos contratempos (colcheias ímpares), "stab" curtinho.
      if (k % 2 === 1) {
        for (const cn of chord) {
          const hz = midiHz(cn);
          let cp = 0;
          const m = Math.min(n, Math.round(sampleRate * 0.12));
          for (let i = 0; i < m && start + i < len; i++) {
            cp += hz / sampleRate; cp -= Math.floor(cp);
            const env = Math.exp(-i / sampleRate * 18);
            out[start + i] += (cp < 0.5 ? 1 : -1) * env * 0.045;
          }
        }
      }

      // Bateria: bumbo nos tempos 1 e 3, caixa no 2 e 4, chimbal em toda colcheia.
      const isKick = k === 0 || k === 4 || (bar % 2 === 1 && k === 5);
      const isSnare = k === 2 || k === 6;
      const m = Math.round(sampleRate * 0.18);
      let kp = 0;
      for (let i = 0; i < m && start + i < len; i++) {
        const t = i / sampleRate;
        let s = 0;
        if (isKick) {
          kp += (50 + 110 * Math.exp(-t * 35)) / sampleRate;
          s += Math.sin(2 * Math.PI * kp) * Math.exp(-t * 14) * 0.5;
        }
        const nz = noise();
        if (isSnare) s += nz * Math.exp(-t * 22) * 0.22;
        if (t < 0.04) s += nz * Math.exp(-t * 90) * 0.06; // chimbal
        out[start + i] += s;
      }
    }
  }

  // Saturação suave pra nunca estourar.
  for (let i = 0; i < len; i++) out[i] = Math.tanh(out[i] * 1.6);
  return out;
}

// ── Tocador no navegador (prévia e toque com o app aberto no navegador) ─────

let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let cached: AudioBuffer | null = null;
// Cada play/stop ganha um número: um play que ainda estava esperando o
// navegador liberar o áudio não pode começar a tocar depois de um stop.
let generation = 0;

/** Toca o loop (ou só uma vez) no volume dado (20–100). Devolve false se o navegador bloquear. */
export async function playWakeupTune(volumePercent: number, loop = true): Promise<boolean> {
  try {
    stopWakeupTune();
    const mine = generation;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return false;
    ctx = ctx || new Ctor();
    if (ctx.state !== 'running') {
      // Sem um toque recente na tela, o resume() fica pendurado pra sempre
      // (regra de autoplay): espera no máximo 700ms e desiste.
      await Promise.race([
        ctx.resume().catch(() => undefined),
        new Promise(resolve => setTimeout(resolve, 700)),
      ]);
    }
    if (mine !== generation) return false; // alguém mandou parar enquanto isso
    if (ctx.state !== 'running') return false;
    if (!cached || cached.sampleRate !== ctx.sampleRate) {
      const pcm = renderWakeupTune(ctx.sampleRate);
      cached = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
      cached.getChannelData(0).set(pcm);
    }
    const gain = ctx.createGain();
    gain.gain.value = Math.max(20, Math.min(100, volumePercent)) / 100;
    gain.connect(ctx.destination);
    source = ctx.createBufferSource();
    source.buffer = cached;
    source.loop = loop;
    source.connect(gain);
    source.start();
    return true;
  } catch (_) {
    return false;
  }
}

export function stopWakeupTune() {
  generation++;
  try { source?.stop(); } catch (_) { /* já parou */ }
  source = null;
}
