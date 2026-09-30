import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Profile,
  type Wakeup,
  WAKEUP_DISMISS_MESSAGES,
  WAKEUP_MAX_RING_MS,
  occurrenceKey,
  wakeupApi,
} from '../utils/wakeups';
import { playWakeupTune, stopWakeupTune } from '../utils/wakeupTune';
import { WAKEUPS_CHANGED_EVENT } from './WakeupModal';

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

  const notes = ringing.wakeups.filter(w => w.note);

  return (
    <div
      className="fixed inset-0 z-[200] bg-[#F8F6F3] flex flex-col items-center justify-center px-6 py-8 overflow-y-auto font-['Quicksand',sans-serif]"
      style={{ maxWidth: 390, margin: '0 auto' }}
    >
      <div className="text-7xl font-bold text-[#2B2A28] animate-pulse">{ringing.occurrence.slice(11)}</div>
      <div className="text-2xl font-bold text-[#4D989B] mb-4">Hora de acordar! ⏰</div>
      {notes.map(w => (
        <p key={w.id} className="text-center text-base mb-2">
          {w.createdBy !== userProfile ? `Recadinho de ${w.createdBy}: ` : ''}“{w.note}”
        </p>
      ))}
      {soundBlocked && (
        <button onClick={retrySound} className="mb-3 text-sm underline text-[#4D989B]">
          🔇 O navegador bloqueou o som — toca aqui pra ouvir
        </button>
      )}
      <p className="text-sm text-muted-foreground text-center my-3">
        Pra desligar, escolhe um recadinho pr{partner === 'Amanda' ? 'a Amanda' : 'o Mateus'}:
      </p>
      <div className="w-full space-y-2">
        {WAKEUP_DISMISS_MESSAGES.map(msg => (
          <button
            key={msg}
            onClick={() => dismiss(msg)}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#4D989B] text-white font-bold text-base"
          >
            {msg}
          </button>
        ))}
      </div>
    </div>
  );
}
