// Despertador — tipos, textos e ponte com o app Android.
//
// Quem toca de verdade com o app fechado é o app nativo (AlarmManager +
// serviço em primeiro plano). Aqui ficam as coisas que o PWA precisa para
// criar/listar e mostrar o status ("ainda tocando" / "desligou com tal
// recadinho").

import { fetchAPI } from './api';

export type Profile = 'Amanda' | 'Mateus';
export type WakeupTarget = Profile | 'both';

export interface WakeupRing {
  occurrence: string; // "YYYY-MM-DDTHH:MM" local do toque
  status: 'ringing' | 'dismissed' | 'missed';
  startedAt: string;
  endedAt?: string;
  message?: string;
}

export interface Wakeup {
  id: string;
  createdBy: Profile;
  target: WakeupTarget;
  time: string; // HH:MM
  days: number[]; // 0 = domingo … 6 = sábado; vazio = uma vez só
  date: string | null; // YYYY-MM-DD quando é "uma vez"
  volume: number; // 20–100
  note: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  ring: Partial<Record<Profile, WakeupRing>>;
}

/** Recibo que o app Android manda depois de cada sincronização. */
export interface WakeupDevice {
  profile: Profile;
  ids: string[]; // despertadores que esse celular tem agendados (com próximo toque)
  nextAt: string | null;
  perms: Partial<WakeupPermissions>;
  appVersion: string;
  model: string;
  at: string;
}

export type WakeupInput = Pick<Wakeup, 'target' | 'time' | 'days' | 'date' | 'volume' | 'note' | 'enabled'>;

/** Volume mínimo: o despertador nunca fica mudo. */
export const WAKEUP_MIN_VOLUME = 20;
export const WAKEUP_NOTE_MAX = 80;

/** As 6 mensagens pra desligar — iguais às do app nativo (Wakeups.kt). */
export const WAKEUP_DISMISS_MESSAGES = [
  'Bom dia, meu amor! ☀️',
  'Acordei! Já tô de pé 💪',
  'Acordei pensando em você 💕',
  'Valeu por me acordar 🥰',
  'Mais 5 minutinhos... 😴',
  'Bora que o dia é nosso! 🚀',
];

/** Depois disso tocando sem resposta, o celular desiste (igual ao nativo). */
export const WAKEUP_MAX_RING_MS = 30 * 60 * 1000;

export const wakeupApi = {
  list: async (): Promise<Wakeup[]> => {
    const res = await fetchAPI(`/wakeups?_t=${Date.now()}`, {}, 1);
    return Array.isArray(res?.wakeups) ? res.wakeups : [];
  },
  /** Lista + o recibo de cada celular (o que ele tem agendado). */
  listWithDevices: async (): Promise<{ wakeups: Wakeup[]; devices: Partial<Record<Profile, WakeupDevice>> }> => {
    const res = await fetchAPI(`/wakeups?_t=${Date.now()}`, {}, 1);
    return {
      wakeups: Array.isArray(res?.wakeups) ? res.wakeups : [],
      devices: res?.devices && typeof res.devices === 'object' ? res.devices : {},
    };
  },
  /** Carimbo que muda a cada alteração — leitura barata, pra saber se vale rebaixar a lista. */
  version: async (): Promise<number> => {
    const res = await fetchAPI(`/wakeups/version?_t=${Date.now()}`, {}, 0);
    return Number(res?.version) || 0;
  },
  // Sem retentativa automática: se a resposta demorar, repetir criaria dois despertadores.
  create: async (createdBy: Profile, input: WakeupInput): Promise<Wakeup> => {
    const res = await fetchAPI('/wakeups', { method: 'POST', body: JSON.stringify({ createdBy, ...input }) }, 0);
    return res.wakeup;
  },
  update: async (id: string, input: Partial<WakeupInput>, editedBy?: Profile): Promise<Wakeup> => {
    const res = await fetchAPI(`/wakeups/${id}`, { method: 'PUT', body: JSON.stringify({ ...input, editedBy }) });
    return res.wakeup;
  },
  remove: async (id: string): Promise<void> => {
    await fetchAPI(`/wakeups/${id}`, { method: 'DELETE' });
  },
  ring: async (id: string, profile: Profile, occurrence: string, status: 'ringing' | 'missed') => {
    await fetchAPI(`/wakeups/${id}/ring`, {
      method: 'POST',
      body: JSON.stringify({ profile, occurrence, status, at: new Date().toISOString() }),
    }, 0);
  },
  dismiss: async (id: string, profile: Profile, occurrence: string, message: string, at: string) => {
    await fetchAPI(`/wakeups/${id}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ profile, occurrence, message, at }),
    }, 0);
  },
};

/**
 * Um "uma vez" que já passou continua `enabled` no servidor, mas não vai mais
 * tocar: pra tela, ele está desligado (e ligar de novo vale pra próxima vez).
 */
export function isEffectivelyOn(w: Pick<Wakeup, 'time' | 'days' | 'date' | 'enabled'>): boolean {
  return w.enabled && nextOccurrence(w) !== null;
}

// ── Ponte com o app Android (window.MesinhaNative) ──────────────────────────

export interface WakeupPermissions {
  exact: boolean;
  fullScreen: boolean;
  notifications: boolean;
  battery: boolean;
  /** Só nas marcas com "início automático" (Xiaomi, OPPO, vivo, Huawei...). */
  autostart?: boolean;
}

interface WakeupBridge {
  wakeupsChanged?: () => void;
  wakeupPermissions?: () => string;
  openWakeupSettings?: (kind: string) => void;
}

function bridge(): WakeupBridge | null {
  const b = (window as unknown as { MesinhaNative?: WakeupBridge }).MesinhaNative;
  return b && typeof b.wakeupsChanged === 'function' ? b : null;
}

/** true dentro do app Android, mesmo numa versão antiga (sem despertador). */
export function isInsideAndroidApp(): boolean {
  return !!(window as unknown as { MesinhaNative?: unknown }).MesinhaNative;
}

/** true dentro do app Android com suporte a despertador (toca com o app fechado). */
export function hasNativeWakeups(): boolean {
  return bridge() !== null;
}

/** Avisa o app nativo pra rebaixar a lista e reagendar o próximo toque. */
export function notifyNativeWakeupsChanged() {
  try { bridge()?.wakeupsChanged?.(); } catch (_) { /* sem ponte */ }
}

export function nativeWakeupPermissions(): WakeupPermissions | null {
  try {
    const raw = bridge()?.wakeupPermissions?.();
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function openNativeWakeupSettings(kind: keyof WakeupPermissions) {
  try { bridge()?.openWakeupSettings?.(kind); } catch (_) { /* sem ponte */ }
}

// ── Datas / textos ──────────────────────────────────────────────────────────

export const DAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const pad = (n: number) => String(n).padStart(2, '0');

export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function occurrenceKey(d: Date): string {
  return `${localDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Próximo toque estritamente depois de `after` (mesma regra do Wakeups.kt). */
export function nextOccurrence(w: Pick<Wakeup, 'time' | 'days' | 'date' | 'enabled'>, after = new Date()): Date | null {
  if (!w.enabled) return null;
  const [h, m] = w.time.split(':').map(Number);
  if (!w.days.length) {
    if (!w.date) return null;
    const [y, mo, d] = w.date.split('-').map(Number);
    const at = new Date(y, mo - 1, d, h, m, 0, 0);
    return at > after ? at : null;
  }
  // Cada dia é montado do zero (data + hora): num dia de virada de horário de
  // verão, somar dias a um Date "empurrava" a hora dos dias seguintes.
  for (let i = 0; i <= 7; i++) {
    const c = new Date(after.getFullYear(), after.getMonth(), after.getDate() + i, h, m, 0, 0);
    if (w.days.includes(c.getDay()) && c > after) return c;
  }
  return null;
}

/** Data do "uma vez": hoje se o horário ainda não passou, senão amanhã. */
export function oneShotDateFor(time: string, now = new Date()): string {
  const [h, m] = time.split(':').map(Number);
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  return localDateStr(at);
}

export function describeDays(w: Pick<Wakeup, 'days' | 'date'>): string {
  if (!w.days.length) {
    if (!w.date) return 'uma vez';
    const [, m, d] = w.date.split('-');
    const today = localDateStr(new Date());
    const tomorrow = localDateStr(new Date(Date.now() + 86400000));
    if (w.date === today) return 'hoje';
    if (w.date === tomorrow) return 'amanhã';
    return `dia ${d}/${m}`;
  }
  if (w.days.length === 7) return 'todo dia';
  const key = [...w.days].sort().join(',');
  if (key === '1,2,3,4,5') return 'seg a sex';
  if (key === '0,6') return 'fim de semana';
  return [...w.days].sort().map(d => DAY_SHORT[d]).join(', ');
}

export function describeNext(at: Date | null, now = new Date()): string {
  if (!at) return 'sem próximo toque';
  const hhmm = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const today = localDateStr(now);
  const tomorrow = localDateStr(new Date(now.getTime() + 86400000));
  const day = localDateStr(at);
  if (day === today) return `hoje às ${hhmm}`;
  if (day === tomorrow) return `amanhã às ${hhmm}`;
  return `${DAY_SHORT[at.getDay()]} ${pad(at.getDate())}/${pad(at.getMonth() + 1)} às ${hhmm}`;
}

export function targetsOf(w: Pick<Wakeup, 'target'>): Profile[] {
  return w.target === 'both' ? ['Amanda', 'Mateus'] : [w.target];
}

/** Evento que avisa o tocador do navegador (WakeupWebRinger) que a lista mudou. */
export const WAKEUPS_CHANGED_EVENT = 'mesinha-wakeups-changed';

// ── Elenco: Corvinho = Mateus, Alpaquinha = Amanda (igual aos widgets) ──────

export const CHARACTER = {
  Mateus: { name: 'Corvinho', img: '/characters/corvinho.png', bubble: '#1A1A1A' },
  Amanda: { name: 'Alpaquinha', img: '/characters/alpaquinha.png', bubble: '#8B4513' },
} as const;

/** "pro Mateus" / "pra Amanda". */
export function toPrep(p: Profile): string {
  return p === 'Amanda' ? 'pra Amanda' : 'pro Mateus';
}
