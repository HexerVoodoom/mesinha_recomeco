/**
 * Calendário de lançamento das features novas.
 *
 * Tudo já está no código, mas cada feature fica **invisível** até a data dela:
 * o ícone não aparece na grade, o card não renderiza, nada de "em breve" nem
 * cadeado. No dia que abre, o app mostra um aviso de novidade uma única vez.
 *
 * A ideia é que a cada 15 dias apareça uma surpresa nova em vez de tudo de
 * uma vez só.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PRA AJUSTAR: mude `LAUNCH_ANCHOR` (data da primeira leva) ou
 * `INTERVAL_DAYS`. A ordem da lista abaixo é a ordem de lançamento — o campo
 * `step` é o índice na fila (0 = já no ar no dia da âncora).
 * ─────────────────────────────────────────────────────────────────────────
 */

export type FeatureId =
  | 'nudge'
  | 'mood'
  | 'question'
  | 'roleta'
  | 'onthisday'
  | 'counter'
  | 'reactions'
  | 'capsule'
  | 'chore'
  | 'bucket'
  | 'gratitude'
  | 'cartas'
  | 'garden';

/** Data em que a primeira leva entra no ar (YYYY-MM-DD, fuso local). */
export const LAUNCH_ANCHOR = '2026-08-19';

/** Intervalo entre uma feature e a próxima. */
export const INTERVAL_DAYS = 15;

export interface ScheduledFeature {
  id: FeatureId;
  step: number;
  /** Nome como aparece no aviso de novidade. */
  name: string;
  emoji: string;
  /** Uma frase explicando o que é, no aviso. */
  blurb: string;
}

/**
 * Ordem pensada pra experiência, não pela ordem em que foram construídas:
 * começa pelo carinho instantâneo, passa pelos rituais, e o Jardim fica por
 * último de propósito — ele fica muito mais bonito depois de meses de
 * histórico acumulado pelas outras features.
 */
export const FEATURE_SCHEDULE: ScheduledFeature[] = [
  {
    id: 'nudge',
    step: 0,
    name: 'Cutucada',
    emoji: '💌',
    blurb: 'Um toque manda uma notificação carinhosa na hora pro outro, sem precisar de motivo.',
  },
  {
    id: 'mood',
    step: 1,
    name: 'Humor do Dia',
    emoji: '🌤️',
    blurb: 'Marque como você tá hoje e veja o do outro, com um calendário dos últimos 14 dias.',
  },
  {
    id: 'question',
    step: 2,
    name: 'Pergunta do Dia',
    emoji: '💭',
    blurb: 'Uma pergunta por dia. Ninguém vê a resposta do outro até os dois responderem.',
  },
  {
    id: 'roleta',
    step: 3,
    name: 'Roleta de Encontro',
    emoji: '🎲',
    blurb: 'Não sabe o que fazer hoje? A roleta sorteia um programa das listas de vocês.',
  },
  {
    id: 'onthisday',
    step: 4,
    name: 'Neste dia',
    emoji: '📆',
    blurb: 'O Mural agora relembra os posts desta mesma data em anos anteriores.',
  },
  {
    id: 'counter',
    step: 5,
    name: 'Juntos há...',
    emoji: '💗',
    blurb: 'Um contador de quantos dias vocês estão juntos, logo no topo do app.',
  },
  {
    id: 'reactions',
    step: 6,
    name: 'Reações no Mural',
    emoji: '😂',
    blurb: 'O coração virou um seletor: dá pra reagir com 😂 😍 🥺 🔥 👏 também.',
  },
  {
    id: 'capsule',
    step: 7,
    name: 'Cápsula do Tempo',
    emoji: '🕰️',
    blurb: 'Escreva uma carta que só pode ser aberta na data que você escolher. Nem você consegue espiar antes.',
  },
  {
    id: 'chore',
    step: 8,
    name: 'Tarefas',
    emoji: '🧹',
    blurb: 'Tarefas de casa que revezam sozinhas: ao concluir, a vez passa pro outro.',
  },
  {
    id: 'bucket',
    step: 9,
    name: 'Sonhos',
    emoji: '✨',
    blurb: 'A lista de tudo que vocês querem realizar juntos, com barra de progresso.',
  },
  {
    id: 'gratitude',
    step: 10,
    name: 'Gratidão',
    emoji: '🫶',
    blurb: 'Um lugar pra guardar os agradecimentos do dia a dia.',
  },
  {
    id: 'cartas',
    step: 11,
    name: 'Jogos',
    emoji: '🃏',
    blurb: 'Verdade, Desafio e "O que você prefere" — e dá pra escrever as próprias cartas.',
  },
  {
    id: 'garden',
    step: 12,
    name: 'Nosso Jardim',
    emoji: '🌱',
    blurb: 'Um jardim que cresce com tudo que vocês fazem aqui, com sequência de dias e retrospectiva.',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Data local (fuso do aparelho) em YYYY-MM-DD. */
function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE');
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Data (YYYY-MM-DD) em que a feature passa a aparecer. */
export function unlockDateFor(feature: ScheduledFeature): string {
  const anchor = parseLocalDate(LAUNCH_ANCHOR);
  const unlock = new Date(anchor.getTime() + feature.step * INTERVAL_DAYS * DAY_MS);
  return unlock.toLocaleDateString('sv-SE');
}

const BY_ID = new Map(FEATURE_SCHEDULE.map(f => [f.id, f]));

/**
 * A feature já está no ar? Comparação por string YYYY-MM-DD, que é segura
 * lexicograficamente e não sofre com fuso nem horário de verão.
 *
 * Uma feature que não está no calendário é considerada liberada — assim nada
 * que já existia no app depende deste arquivo pra aparecer.
 */
export function isFeatureUnlocked(id: FeatureId, today = todayStr()): boolean {
  const feature = BY_ID.get(id);
  if (!feature) return true;
  return today >= unlockDateFor(feature);
}

/** Todas as que já estão no ar, na ordem de lançamento. */
export function unlockedFeatures(today = todayStr()): ScheduledFeature[] {
  return FEATURE_SCHEDULE.filter(f => today >= unlockDateFor(f));
}

const SEEN_KEY = 'seenFeatureAnnouncements';

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * A próxima novidade a anunciar: a mais antiga já liberada que ainda não foi
 * mostrada. Devolve null quando não há nada novo.
 */
export function pendingAnnouncement(today = todayStr()): ScheduledFeature | null {
  const seen = readSeen();
  return unlockedFeatures(today).find(f => !seen.has(f.id)) || null;
}

/** Marca a novidade como já anunciada (não aparece de novo). */
export function markAnnouncementSeen(id: FeatureId): void {
  try {
    const seen = readSeen();
    seen.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // Sem localStorage o aviso reaparece — chato, mas não quebra nada.
  }
}

/**
 * Marca TODAS as features já liberadas como vistas, sem mostrar aviso. Roda
 * uma vez por aparelho na primeira abertura depois da atualização, pra que
 * quem instala o app hoje não receba uma fila de avisos retroativos — só as
 * que abrirem daqui pra frente é que viram surpresa.
 */
const BACKFILL_KEY = 'featureAnnouncementsBackfilled';

export function backfillAnnouncementsOnFirstRun(today = todayStr()): void {
  try {
    if (localStorage.getItem(BACKFILL_KEY)) return;
    const alreadyOut = unlockedFeatures(today);
    // A primeira leva (step 0) continua sendo anunciada: é a boas-vindas.
    const toSilence = alreadyOut.filter(f => f.step > 0).map(f => f.id);
    if (toSilence.length > 0) {
      const seen = readSeen();
      toSilence.forEach(id => seen.add(id));
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    }
    localStorage.setItem(BACKFILL_KEY, '1');
  } catch {
    // Ignora: sem localStorage o app funciona, só repete avisos.
  }
}
