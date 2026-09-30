import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  type Profile,
  type Wakeup,
  CHARACTER,
  WAKEUPS_CHANGED_EVENT,
  WAKEUP_DISMISS_MESSAGES,
  toPrep,
  WAKEUP_MAX_RING_MS,
  nextOccurrence,
  occurrenceKey,
  wakeupApi,
} from '../utils/wakeups';
import { playWakeupTune, stopWakeupTune } from '../utils/wakeupTune';
import { CharacterFace, SpeechBubble } from './WakeupPanel';

// Despertador no NAVEGADOR (fora do app Android). Só toca com o Mesinha
// aberto — o navegador não deixa nada tocar com a aba fechada. No app
// Android quem toca é o serviço nativo, e este componente nem é montado.

const HANDLED_KEY = 'wakeupWebHandled';
const PENDING_KEY = 'wakeupWebPendingDismiss';
// Aba congelada/tela apagada pode pular o minuto exato: toca o que venceu há
// até 10 min (e que ninguém desligou), em vez de perder em silêncio.
const CATCH_UP_MS = 10 * 60 * 1000;

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch (_) { return fallback; }
}

function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* sem storage */ }
}

function markHandled(keys: string[]) {
  writeJson(HANDLED_KEY, [...readJson<string[]>(HANDLED_KEY, []), ...keys].slice(-50));
}

interface PendingDismiss { id: string; occurrence: string; message: string; at: string }

/** Manda os "desliguei" que ficaram pendentes (sem internet na hora). */
let flushing = false;
async function flushPendingDismiss(profile: Profile) {
  if (flushing) return;
  flushing = true;
  try {
    const pending = readJson<PendingDismiss[]>(PENDING_KEY, []);
    const done = new Set<string>();
    for (const p of pending) {
      const key = `${p.id}|${p.occurrence}`;
      try {
        await wakeupApi.dismiss(p.id, profile, p.occurrence, p.message, p.at);
        done.add(key);
      } catch (e) {
        // Recusa definitiva do servidor (apagado, não é seu...): não adianta repetir.
        const msg = e instanceof Error ? e.message : '';
        if (/não encontrado|não é seu|inválid|Escolhe um/i.test(msg)) done.add(key);
      }
    }
    // Relê antes de gravar: pode ter entrado um recado novo enquanto isso.
    writeJson(PENDING_KEY, readJson<PendingDismiss[]>(PENDING_KEY, []).filter(p => !done.has(`${p.id}|${p.occurrence}`)));
  } finally {
    flushing = false;
  }
}

interface RingItem {
  wakeup: Wakeup;
  occurrence: string;
  startedAt: number;
}

export function WakeupWebRinger({ userProfile }: { userProfile: Profile }) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const listRef = useRef<Wakeup[]>([]);
  const versionRef = useRef<number>(-1);
  const [ringing, setRinging] = useState<RingItem[]>([]);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const ringingRef = useRef<RingItem[]>([]);
  ringingRef.current = ringing;

  const refresh = useCallback(async () => {
    try { listRef.current = await wakeupApi.list(); } catch (_) { /* mantém a lista anterior */ }
  }, []);

  // Pergunta só o carimbo de versão (barato) e rebaixa a lista quando muda.
  const refreshIfChanged = useCallback(async () => {
    try {
      const v = await wakeupApi.version();
      if (v !== versionRef.current) {
        versionRef.current = v;
        await refresh();
      }
    } catch (_) { /* sem internet: fica com a lista que tem */ }
  }, [refresh]);

  const startSound = useCallback((items: RingItem[]) => {
    const volume = Math.max(...items.map(r => r.wakeup.volume));
    playWakeupTune(volume, true).then(ok => setSoundBlocked(!ok));
  }, []);

  // Tira despertadores da tela; quando não sobra nenhum, para o som.
  const removeRinging = useCallback((ids: Set<string>) => {
    const left = ringingRef.current.filter(r => !ids.has(r.wakeup.id));
    ringingRef.current = left;
    setRinging(left);
    if (!left.length) {
      stopWakeupTune();
      setSoundBlocked(false);
    }
  }, []);

  // Lista: ao abrir, a cada 30s (só o carimbo) e quando o painel mexe nela.
  useEffect(() => {
    refresh();
    flushPendingDismiss(userProfile);
    const t = window.setInterval(() => {
      refreshIfChanged();
      flushPendingDismiss(userProfile);
    }, 30 * 1000);
    window.addEventListener(WAKEUPS_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(WAKEUPS_CHANGED_EVENT, refresh);
    };
  }, [refresh, refreshIfChanged, userProfile]);

  // Saiu da tela no meio do toque (voltar do navegador, troca de rota):
  // o som não pode continuar sem ter como desligar.
  useEffect(() => () => stopWakeupTune(), []);

  // Relógio: confere a cada 5s se algum despertador meu venceu.
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const handled = new Set(readJson<string[]>(HANDLED_KEY, []));
      const tocando = new Set(ringingRef.current.map(r => r.wakeup.id));
      const due: RingItem[] = [];
      for (const w of listRef.current) {
        if (!w.enabled || !(w.target === 'both' || w.target === userProfile) || tocando.has(w.id)) continue;
        const at = nextOccurrence(w, new Date(now.getTime() - CATCH_UP_MS));
        if (!at || at > now) continue;
        const occ = occurrenceKey(at);
        if (handled.has(`${w.id}|${occ}`)) continue;
        // Já resolvido em outro aparelho (ex.: celular) neste mesmo toque.
        const r = w.ring?.[userProfile];
        if (r?.occurrence === occ && (r.status === 'dismissed' || r.status === 'missed')) continue;
        due.push({ wakeup: w, occurrence: occ, startedAt: at.getTime() });
      }
      if (!due.length) return;
      markHandled(due.map(r => `${r.wakeup.id}|${r.occurrence}`));
      const all = [...ringingRef.current, ...due];
      ringingRef.current = all;
      setRinging(all);
      startSound(all);
      due.forEach(r => wakeupApi.ring(r.wakeup.id, userProfile, r.occurrence, 'ringing').catch(() => {}));
    };
    check();
    const t = window.setInterval(check, 5000);
    return () => window.clearInterval(t);
  }, [userProfile, startSound]);

  // Enquanto toca: cada despertador desiste depois de 30 min, e para se
  // desligarem em outro aparelho.
  const ringingKey = ringing.map(r => `${r.wakeup.id}|${r.occurrence}`).join(',');
  useEffect(() => {
    if (!ringing.length) return;
    const tick = window.setInterval(async () => {
      const now = Date.now();
      const vencidos = ringingRef.current.filter(r => now - r.startedAt >= WAKEUP_MAX_RING_MS);
      vencidos.forEach(r => wakeupApi.ring(r.wakeup.id, userProfile, r.occurrence, 'missed').catch(() => {}));
      if (vencidos.length) removeRinging(new Set(vencidos.map(r => r.wakeup.id)));

      try {
        const v = await wakeupApi.version();
        if (v === versionRef.current) return;
        versionRef.current = v;
        const list = await wakeupApi.list();
        listRef.current = list;
        const byId = new Map(list.map(w => [w.id, w]));
        const resolvidos = ringingRef.current.filter(r => {
          const w = byId.get(r.wakeup.id);
          if (!w || !w.enabled) return true; // apagado/desligado no meio do toque
          const st = w.ring?.[userProfile];
          return st?.occurrence === r.occurrence && st.status === 'dismissed';
        });
        if (resolvidos.length) removeRinging(new Set(resolvidos.map(r => r.wakeup.id)));
      } catch (_) { /* sem internet: continua tocando */ }
    }, 20000);
    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringingKey, userProfile, removeRinging]);

  if (!ringing.length) return null;

  const dismiss = (message: string) => {
    const at = new Date().toISOString();
    const pending = readJson<PendingDismiss[]>(PENDING_KEY, []);
    // Grava antes de mandar: se cair a internet agora, o recado sai depois.
    writeJson(PENDING_KEY, [
      ...pending,
      ...ringing.map(r => ({ id: r.wakeup.id, occurrence: r.occurrence, message, at })),
    ]);
    removeRinging(new Set(ringing.map(r => r.wakeup.id)));
    flushPendingDismiss(userProfile);
  };

  const retrySound = () => startSound(ringing);
  const wakeups = ringing.map(r => r.wakeup);
  const shownTime = ringing[ringing.length - 1].occurrence.slice(11);

  // Quem "fala" na tela: quem criou o despertador (o recadinho é dele).
  const speaker: Profile = wakeups.find(w => w.note)?.createdBy ?? wakeups[0].createdBy;
  const bubble = wakeups.find(w => w.note)?.note
    ?? (speaker === userProfile ? 'Hora de levantar! ⏰' : 'Acorda, amor! ☀️');

  return (
    <div className="fixed inset-0 z-[200] bg-[#F8F6F3] overflow-y-auto font-['Quicksand',sans-serif]">
      <div className="mx-auto flex min-h-full flex-col items-center px-6 py-8" style={{ maxWidth: 390 }}>
        {/* Selinho igual ao da grade de categorias */}
        <div className="bg-[#E9E4DF] rounded-full px-4 py-1 mb-5">
          <span className="font-bold text-xs text-[#2B2A28] uppercase tracking-tight">🔔 Despertador</span>
        </div>

        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="text-7xl font-bold text-[#2B2A28] tracking-tight leading-none"
        >
          {shownTime}
        </motion.div>
        <p className="font-bold text-lg text-[#4D989B] mt-1 mb-6">Hora de acordar!</p>

        <div className="w-full rounded-2xl border-2 border-[#E9E4DF] bg-white p-4 flex items-start gap-3 mb-2">
          <motion.div animate={{ rotate: [-8, 8, -8] }} transition={{ repeat: Infinity, duration: 0.35 }} className="shrink-0">
            <CharacterFace profile={speaker} className="w-16 h-16" />
          </motion.div>
          <div className="pt-1">
            <p className="text-[11px] font-bold uppercase tracking-tight text-[#8A847D] mb-1">
              {speaker === userProfile ? 'Você deixou anotado' : `${CHARACTER[speaker].name} (${speaker}) diz`}
            </p>
            <SpeechBubble profile={speaker}>{bubble}</SpeechBubble>
          </div>
        </div>

        {soundBlocked && (
          <button onClick={retrySound} className="mt-2 text-xs font-bold text-[#4D989B] bg-[#4D989B]/10 px-3 py-1.5 rounded-full">
            🔇 O navegador segurou o som — toca aqui pra ouvir
          </button>
        )}

        <div className="w-full mt-5 flex items-center gap-2 mb-3">
          <CharacterFace profile={partner} className="w-8 h-8" />
          <p className="font-bold text-xs uppercase tracking-tight text-[#4D989B]">
            Pra desligar, manda um recadinho {toPrep(partner)}
          </p>
        </div>
        <div className="w-full grid grid-cols-2 gap-2">
          {WAKEUP_DISMISS_MESSAGES.map(msg => (
            <button
              key={msg}
              onClick={() => dismiss(msg)}
              className="rounded-2xl border-2 border-[#E9E4DF] bg-white px-3 py-4 text-sm font-bold text-[#2B2A28] leading-snug active:bg-[#81D8D0]/30 active:border-[#4D989B] transition-colors"
            >
              {msg}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
