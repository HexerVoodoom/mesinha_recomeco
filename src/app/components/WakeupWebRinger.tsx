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
  occurrenceKey,
  wakeupApi,
} from '../utils/wakeups';
import { playWakeupTune, stopWakeupTune } from '../utils/wakeupTune';
import { CharacterFace, SpeechBubble } from './WakeupPanel';

// Despertador no NAVEGADOR (fora do app Android). Só toca com o Mesinha
// aberto — o navegador não deixa nada tocar com a aba fechada. No app
// Android quem toca é o serviço nativo, e este componente nem é montado.

const HANDLED_KEY = 'wakeupWebHandled';

function loadHandled(): string[] {
  try { return JSON.parse(localStorage.getItem(HANDLED_KEY) || '[]'); } catch (_) { return []; }
}

function markHandled(keys: string[]) {
  try {
    const all = [...loadHandled(), ...keys].slice(-50);
    localStorage.setItem(HANDLED_KEY, JSON.stringify(all));
  } catch (_) { /* sem storage */ }
}

interface Ringing {
  wakeups: Wakeup[];
  occurrence: string;
  startedAt: number;
}

export function WakeupWebRinger({ userProfile }: { userProfile: Profile }) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const listRef = useRef<Wakeup[]>([]);
  const [ringing, setRinging] = useState<Ringing | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const ringingRef = useRef<Ringing | null>(null);
  ringingRef.current = ringing;

  const refresh = useCallback(async () => {
    try { listRef.current = await wakeupApi.list(); } catch (_) { /* mantém a lista anterior */ }
  }, []);

  const stop = useCallback(() => {
    stopWakeupTune();
    setRinging(null);
    setSoundBlocked(false);
  }, []);

  // Lista: ao abrir, a cada 2 min e quando o modal do despertador mexe nela.
  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 2 * 60 * 1000);
    window.addEventListener(WAKEUPS_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(WAKEUPS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  // Relógio: confere a cada 5s se algum despertador meu é deste minuto.
  useEffect(() => {
    const check = () => {
      if (ringingRef.current) return;
      const now = new Date();
      const occ = occurrenceKey(now);
      const hhmm = occ.slice(11);
      const today = occ.slice(0, 10);
      const handled = new Set(loadHandled());
      const due = listRef.current.filter(w =>
        w.enabled &&
        (w.target === 'both' || w.target === userProfile) &&
        w.time === hhmm &&
        (w.days.length ? w.days.includes(now.getDay()) : w.date === today) &&
        !handled.has(`${w.id}|${occ}`) &&
        // Já desligado em outro aparelho (ex.: celular) neste mesmo toque.
        !(w.ring?.[userProfile]?.occurrence === occ && w.ring?.[userProfile]?.status === 'dismissed')
      );
      if (!due.length) return;
      markHandled(due.map(w => `${w.id}|${occ}`));
      setRinging({ wakeups: due, occurrence: occ, startedAt: Date.now() });
      const volume = Math.max(...due.map(w => w.volume));
      playWakeupTune(volume, true).then(ok => setSoundBlocked(!ok));
      due.forEach(w => wakeupApi.ring(w.id, userProfile, occ, 'ringing').catch(() => {}));
    };
    check();
    const t = window.setInterval(check, 5000);
    return () => window.clearInterval(t);
  }, [userProfile]);

  // Enquanto toca: desiste depois de 30 min e para se desligarem em outro aparelho.
  useEffect(() => {
    if (!ringing) return;
    const timeout = window.setTimeout(() => {
      ringing.wakeups.forEach(w => wakeupApi.ring(w.id, userProfile, ringing.occurrence, 'missed').catch(() => {}));
      stop();
    }, Math.max(0, WAKEUP_MAX_RING_MS - (Date.now() - ringing.startedAt)));
    const poll = window.setInterval(async () => {
      try {
        const list = await wakeupApi.list();
        const ids = new Set(ringing.wakeups.map(w => w.id));
        const done = list.filter(w => ids.has(w.id) &&
          w.ring?.[userProfile]?.occurrence === ringing.occurrence &&
          w.ring?.[userProfile]?.status === 'dismissed');
        if (done.length === ids.size) stop();
      } catch (_) { /* sem internet: continua tocando */ }
    }, 20000);
    return () => { window.clearTimeout(timeout); window.clearInterval(poll); };
  }, [ringing, userProfile, stop]);

  if (!ringing) return null;

  const dismiss = (message: string) => {
    ringing.wakeups.forEach(w =>
      wakeupApi.dismiss(w.id, userProfile, ringing.occurrence, message).catch(() => {})
    );
    stop();
  };

  const retrySound = () => {
    const volume = Math.max(...ringing.wakeups.map(w => w.volume));
    playWakeupTune(volume, true).then(ok => setSoundBlocked(!ok));
  };

  // Quem "fala" na tela: quem criou o despertador (o recadinho é dele).
  const speaker: Profile = ringing.wakeups.find(w => w.note)?.createdBy ?? ringing.wakeups[0].createdBy;
  const bubble = ringing.wakeups.find(w => w.note)?.note
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
          {ringing.occurrence.slice(11)}
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
