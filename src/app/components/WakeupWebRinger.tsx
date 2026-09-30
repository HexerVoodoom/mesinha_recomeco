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

const HANDLED_KEY = 'wakeupWebHandled'; // toques já desligados/perdidos neste navegador
const RINGING_KEY = 'wakeupWebRinging'; // o que está tocando agora (volta se recarregar a página)
const PENDING_KEY = 'wakeupWebPendingDismiss'; // "desliguei" que ainda não chegou no servidor
// Aba congelada/tela apagada pode pular o minuto exato: toca o que venceu há
// até 10 min (e que ninguém desligou), em vez de perder em silêncio.
const CATCH_UP_MS = 10 * 60 * 1000;
// Toque atrasado só depois de conferir a lista fresquinha (pode já ter sido
// desligado no celular).
const FRESH_LIST_MS = 20 * 1000;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* sem storage */ }
}

function markHandled(keys: string[]) {
  if (keys.length) writeJson(HANDLED_KEY, [...readJson<string[]>(HANDLED_KEY, []), ...keys].slice(-50));
}

interface PendingDismiss { id: string; occurrence: string; message: string; at: string; profile: Profile }

/** Manda os "desliguei" pendentes (sem internet na hora). */
let flushing = false;
let flushAgain = false;
async function flushPendingDismiss(profile: Profile) {
  if (flushing) { flushAgain = true; return; }
  flushing = true;
  try {
    do {
      flushAgain = false;
      const pending = readJson<PendingDismiss[]>(PENDING_KEY, []).filter(p => (p.profile ?? profile) === profile);
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
    } while (flushAgain);
  } finally {
    flushing = false;
  }
}

interface RingItem {
  wakeup: Wakeup;
  occurrence: string;
  startedAt: number;
}

/** O servidor já sabe que esse toque acabou (desligado em outro aparelho, perdido, apagado)? */
function isResolved(item: RingItem, list: Wakeup[], profile: Profile): boolean {
  const w = list.find(x => x.id === item.wakeup.id);
  if (!w || !w.enabled) return true;
  const st = w.ring?.[profile];
  return st?.occurrence === item.occurrence && (st.status === 'dismissed' || st.status === 'missed');
}

export function WakeupWebRinger({ userProfile }: { userProfile: Profile }) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const listRef = useRef<Wakeup[]>([]);
  const listAtRef = useRef(0);
  const versionRef = useRef<number>(-1);
  const [ringing, setRingingState] = useState<RingItem[]>([]);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const ringingRef = useRef<RingItem[]>([]);

  const setRinging = useCallback((items: RingItem[]) => {
    ringingRef.current = items;
    setRingingState(items);
    writeJson(RINGING_KEY, items);
    if (!items.length) {
      stopWakeupTune();
      setSoundBlocked(false);
    }
  }, []);

  const startSound = useCallback((items: RingItem[]) => {
    const volume = Math.max(...items.map(r => r.wakeup.volume));
    playWakeupTune(volume, true).then(ok => { if (ok !== null) setSoundBlocked(!ok); });
  }, []);

  /** Tira da tela o que já acabou em outro lugar. */
  const reconcile = useCallback(() => {
    const left = ringingRef.current.filter(r => !isResolved(r, listRef.current, userProfile));
    if (left.length !== ringingRef.current.length) {
      markHandled(ringingRef.current.filter(r => !left.includes(r)).map(r => `${r.wakeup.id}|${r.occurrence}`));
      setRinging(left);
    }
  }, [setRinging, userProfile]);

  /** Baixa a lista; devolve true se conseguiu. */
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      listRef.current = await wakeupApi.list();
      listAtRef.current = Date.now();
      reconcile();
      return true;
    } catch (_) {
      return false; // mantém a lista anterior
    }
  }, [reconcile]);

  // Pergunta só o carimbo de versão (barato); o carimbo só é "gasto" quando
  // a lista veio mesmo — um soluço de rede não faz perder a mudança.
  const refreshIfChanged = useCallback(async () => {
    try {
      const v = await wakeupApi.version();
      if (v !== versionRef.current && (await refresh())) versionRef.current = v;
    } catch (_) { /* sem internet: fica com a lista que tem */ }
  }, [refresh]);

  // Recarregou a página no meio do toque: volta a tocar o que ainda vale.
  useEffect(() => {
    const now = Date.now();
    const handled = new Set(readJson<string[]>(HANDLED_KEY, []));
    const saved = readJson<RingItem[]>(RINGING_KEY, []).filter(r =>
      r?.wakeup?.id && now - r.startedAt < WAKEUP_MAX_RING_MS && !handled.has(`${r.wakeup.id}|${r.occurrence}`) &&
      (r.wakeup.target === 'both' || r.wakeup.target === userProfile)
    );
    if (saved.length) {
      setRinging(saved);
      startSound(saved);
    } else {
      writeJson(RINGING_KEY, []);
    }
  }, [setRinging, startSound, userProfile]);

  // Lista: ao abrir, a cada 20s (só o carimbo) e quando o painel mexe nela.
  useEffect(() => {
    refresh();
    flushPendingDismiss(userProfile);
    const t = window.setInterval(() => {
      refreshIfChanged();
      flushPendingDismiss(userProfile);
    }, FRESH_LIST_MS);
    const onChanged = () => { refresh(); };
    window.addEventListener(WAKEUPS_CHANGED_EVENT, onChanged);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(WAKEUPS_CHANGED_EVENT, onChanged);
    };
  }, [refresh, refreshIfChanged, userProfile]);

  // Saiu da tela no meio do toque (voltar do navegador, troca de rota):
  // o som não pode continuar sem ter como desligar.
  useEffect(() => () => stopWakeupTune(), []);

  // Relógio: confere a cada 5s se algum despertador meu venceu; e dá como
  // perdido o que tocou 30 min sem ninguém desligar.
  useEffect(() => {
    const check = () => {
      const now = new Date();

      const vencidos = ringingRef.current.filter(r => now.getTime() - r.startedAt >= WAKEUP_MAX_RING_MS);
      if (vencidos.length) {
        vencidos.forEach(r => wakeupApi.ring(r.wakeup.id, userProfile, r.occurrence, 'missed').catch(() => {}));
        markHandled(vencidos.map(r => `${r.wakeup.id}|${r.occurrence}`));
        setRinging(ringingRef.current.filter(r => !vencidos.includes(r)));
      }

      const handled = new Set(readJson<string[]>(HANDLED_KEY, []));
      const tocando = new Set(ringingRef.current.map(r => r.wakeup.id));
      const due: RingItem[] = [];
      for (const w of listRef.current) {
        if (!w.enabled || !(w.target === 'both' || w.target === userProfile) || tocando.has(w.id)) continue;
        const at = nextOccurrence(w, new Date(now.getTime() - CATCH_UP_MS));
        if (!at || at > now) continue;
        // Criado/editado depois desse horário (ex.: às 07:05 um "07:00 todo
        // dia"): vale a partir do próximo, não toca agora.
        const since = Date.parse(w.updatedAt || w.createdAt || '');
        if (Number.isFinite(since) && at.getTime() < since) continue;
        const occ = occurrenceKey(at);
        if (handled.has(`${w.id}|${occ}`)) continue;
        const item = { wakeup: w, occurrence: occ, startedAt: at.getTime() };
        if (isResolved(item, listRef.current, userProfile)) continue;
        due.push(item);
      }
      if (!due.length) return;

      // Toque atrasado com lista velha: confere primeiro (pode já ter sido
      // desligado no celular) e decide na próxima volta.
      const atrasado = due.some(r => now.getTime() - r.startedAt > 60 * 1000);
      if (atrasado && now.getTime() - listAtRef.current > FRESH_LIST_MS) {
        refresh();
        return;
      }

      const all = [...ringingRef.current, ...due];
      setRinging(all);
      startSound(all);
      due.forEach(r => wakeupApi.ring(r.wakeup.id, userProfile, r.occurrence, 'ringing').catch(() => {}));
    };
    check();
    const t = window.setInterval(check, 5000);
    return () => window.clearInterval(t);
  }, [userProfile, startSound, setRinging, refresh]);

  if (!ringing.length) return null;

  const dismiss = (message: string) => {
    const at = new Date().toISOString();
    // Grava antes de mandar: se cair a internet agora, o recado sai depois.
    writeJson(PENDING_KEY, [
      ...readJson<PendingDismiss[]>(PENDING_KEY, []),
      ...ringing.map(r => ({ id: r.wakeup.id, occurrence: r.occurrence, message, at, profile: userProfile })),
    ]);
    markHandled(ringing.map(r => `${r.wakeup.id}|${r.occurrence}`));
    setRinging([]);
    // O painel (se estiver aberto) atualiza o status já, sem esperar o próximo ciclo.
    flushPendingDismiss(userProfile).then(() => window.dispatchEvent(new Event(WAKEUPS_CHANGED_EVENT)));
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
