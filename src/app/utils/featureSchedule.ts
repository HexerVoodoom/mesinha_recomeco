/**
 * Calendário de lançamento das features novas.
 *
 * Tudo já está no código, mas cada feature fica **invisível** até a data dela:
 * o ícone não aparece na grade, o card não renderiza, nada de "em breve" nem
 * cadeado. No dia que abre, o app mostra um aviso de novidade uma única vez.
 *
 * São **duas surpresas por mês**: uma sempre no dia 19 e outra no dia 4. Esse
 * par é o que dá o espaçamento mais parelho mantendo o 19 fixo — 15 dias do 4
 * pro 19, e 13 a 16 do 19 pro 4 do mês seguinte (em meses de 30 dias fica
 * 15/15 exato).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PRA AJUSTAR: mude `FIRST_RELEASE` (mês/ano da estreia) ou os dias em
 * `MAIN_DAY` / `MID_DAY`. A ordem da lista abaixo é a ordem de lançamento —
 * o campo `step` é o índice na fila (0 = a estreia).
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

/** Dia fixo do mês da primeira surpresa (o que você pediu pra nunca mudar). */
export const MAIN_DAY = 19;

/** Dia da segunda surpresa do mês — escolhido pelo espaçamento mais parelho. */
export const MID_DAY = 4;

/** Mês/ano da estreia. A estreia acontece no MAIN_DAY desse mês. */
export const FIRST_RELEASE = { year: 2026, month: 8 }; // agosto/2026

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

/** Data local (fuso do aparelho) em YYYY-MM-DD. */
function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE');
}

/** Data (YYYY-MM-DD) em que a feature passa a aparecer. */
export function unlockDateFor(feature: ScheduledFeature): string {
  // Duas por mês, alternando: step par cai no dia 19, step ímpar no dia 4 do
  // mês seguinte ao 19 anterior.
  //
  //   step 0 -> 19/ago    step 1 -> 04/set    step 2 -> 19/set
  //   step 3 -> 04/out    step 4 -> 19/out    ...
  //
  // Construído com (ano, mês, dia) direto: é aritmética de calendário, então
  // não sofre com horário de verão (somar N*24h à meia-noite local cairia às
  // 23h do dia anterior ao cruzar o fim de um DST, adiantando a feature).
  const monthOffset = Math.ceil(feature.step / 2);
  const day = feature.step % 2 === 0 ? MAIN_DAY : MID_DAY;
  const unlock = new Date(
    FIRST_RELEASE.year,
    FIRST_RELEASE.month - 1 + monthOffset,
    day,
  );
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
