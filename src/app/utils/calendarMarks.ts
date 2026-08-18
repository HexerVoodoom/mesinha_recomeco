/**
 * Marcações discretas do Calendário de Encontros.
 *
 * Nada aqui cria evento nem ocupa dia: são só *dicas visuais* pra gente bater
 * o olho e já saber como está o dia. Por isso tudo é desenhado bem apagadinho
 * no calendário — a informação completa só aparece quando o dia é aberto.
 *
 * São quatro tipos de marcação:
 *  1. Aulas da Amanda  — dia fica desbotado + risquinho embaixo do número;
 *  2. Feriado nacional — estrelinha discreta no canto;
 *  3. Dia 19           — coração rosado e a célula pintada de vermelho claro
 *                        (o nosso dia do mês é o único que não é discreto);
 *  4. Datas especiais  — cruz dourada (1ª Comunhão e Crisma).
 */

/* ────────────────────────────── Aulas da Amanda ────────────────────────── */

export interface ClassDay {
  /** Códigos das disciplinas do dia, na ordem em que acontecem. */
  codes: string[];
  /** Horário da primeira aula (HH:mm). */
  start: string;
  /** Horário em que a última aula termina (HH:mm). */
  end: string;
}

/**
 * Aulas que acontecem toda semana, indexadas por dia da semana (0 = domingo).
 *
 * Seg 18:05–22:00 · FEE0387   |   Ter 18:05–22:00 · FEE0390
 */
export const WEEKLY_SCHEDULE: Record<number, ClassDay> = {
  1: { codes: ['FEE0387'], start: '18:05', end: '22:00' },
  2: { codes: ['FEE0390'], start: '18:05', end: '22:00' },
};

/**
 * FEE0388 é quinzenal e ainda troca de dia: numa semana cai na **sexta**, na
 * seguinte na **quarta**, e assim por diante. Nunca nos dois dias da mesma
 * semana — por isso não dá pra deixar fixo na grade acima.
 */
export const ALTERNATING_CLASS: ClassDay = { codes: ['FEE0388'], start: '18:05', end: '21:15' };

/**
 * Domingo da semana de referência: nela a FEE0388 é na **sexta** (quarta
 * livre). A semana seguinte inverte, e daí em diante alterna sempre.
 *
 * Semana de 16–22/08/2026: quarta (dia 19) livre, aula na sexta (dia 21).
 *
 * PRA AJUSTAR: se a alternância sair do compasso (feriadão, semana de prova),
 * é só mudar esse domingo pra um em que você tem certeza de que a aula é na
 * sexta — todo o resto do calendário se realinha sozinho.
 */
const ALTERNATING_ANCHOR = new Date(2026, 7, 16);

/** Dia da semana em que a FEE0388 cai: 5 (sexta) ou 3 (quarta). */
function alternatingWeekdayFor(date: Date): number {
  const sunday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  // Arredonda porque o horário de verão pode encurtar/esticar um dia.
  const weeks = Math.round((sunday.getTime() - ALTERNATING_ANCHOR.getTime()) / (7 * 86400000));
  // `% 2` de número negativo dá negativo em JS, daí o `+ 2`.
  return ((weeks % 2) + 2) % 2 === 0 ? 5 : 3;
}

/**
 * Período letivo. Fora dele a Amanda não tem aula e o calendário não marca
 * nada. Deixe `null` pra valer o ano inteiro (é como está agora) ou coloque
 * `{ from: '2026-08-03', to: '2026-12-19' }` quando souber as datas do
 * semestre — o formato é o mesmo `yyyy-MM-dd` usado no resto do app.
 */
export const CLASS_TERM: { from: string; to: string } | null = null;

/** Aulas do dia, ou `null` se for um dia livre (ou fora do período letivo). */
export function classDayFor(date: Date): ClassDay | null {
  if (CLASS_TERM) {
    const iso = toISODate(date);
    if (iso < CLASS_TERM.from || iso > CLASS_TERM.to) return null;
  }
  // Em feriado não tem aula, mesmo caindo num dia da grade.
  if (nationalHolidayFor(date)) return null;
  const weekday = date.getDay();
  if (weekday === alternatingWeekdayFor(date)) return ALTERNATING_CLASS;
  return WEEKLY_SCHEDULE[weekday] ?? null;
}

/* ──────────────────────────── Feriados nacionais ───────────────────────── */

/** Feriados de data fixa, no formato `MM-dd`. */
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Confraternização Universal',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '09-07': 'Independência do Brasil',
  '10-12': 'Nossa Senhora Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '11-20': 'Consciência Negra',
  '12-25': 'Natal',
};

/**
 * Feriados que andam junto com a Páscoa, em dias de diferença. Carnaval e
 * Corpus Christi são ponto facultativo no papel, mas na prática todo mundo
 * folga — então entram na lista também.
 */
const EASTER_OFFSETS: { offset: number; name: string }[] = [
  { offset: -48, name: 'Carnaval' },
  { offset: -47, name: 'Carnaval' },
  { offset: -2, name: 'Sexta-feira Santa' },
  { offset: 0, name: 'Páscoa' },
  { offset: 60, name: 'Corpus Christi' },
];

/** Domingo de Páscoa do ano (algoritmo de Meeus/Jones/Butcher). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Cache por ano dos feriados móveis, indexados por `yyyy-MM-dd`. */
const movableCache = new Map<number, Map<string, string>>();

function movableHolidays(year: number): Map<string, string> {
  const cached = movableCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const map = new Map<string, string>();
  for (const { offset, name } of EASTER_OFFSETS) {
    const date = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + offset);
    map.set(toISODate(date), name);
  }
  movableCache.set(year, map);
  return map;
}

/** Nome do feriado nacional, ou `null` se for um dia comum. */
export function nationalHolidayFor(date: Date): string | null {
  const monthDay = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return FIXED_HOLIDAYS[monthDay] ?? movableHolidays(date.getFullYear()).get(toISODate(date)) ?? null;
}

/* ─────────────────────── Dia 19 e datas com cruz dourada ───────────────── */

/** O nosso dia do mês. */
export const HEART_DAY = 19;

/** Datas de igreja, marcadas com a cruz dourada. */
export const GOLDEN_CROSS_DATES: Record<string, string> = {
  '2026-11-08': '1ª Comunhão',
  '2026-11-18': 'Crisma',
};

/* ──────────────────────────────── Agregador ────────────────────────────── */

export interface DayMarks {
  /** Aulas da Amanda nesse dia, se houver. */
  classes: ClassDay | null;
  /** Nome do feriado nacional, se for feriado. */
  holiday: string | null;
  /** `true` no dia 19 de qualquer mês. */
  heart: boolean;
  /** Nome da celebração, nas datas de cruz dourada. */
  goldenCross: string | null;
}

/** Junta todas as marcações de um dia numa coisa só. */
export function marksFor(date: Date): DayMarks {
  return {
    classes: classDayFor(date),
    holiday: nationalHolidayFor(date),
    heart: date.getDate() === HEART_DAY,
    goldenCross: GOLDEN_CROSS_DATES[toISODate(date)] ?? null,
  };
}

/* ─────────────────────────────── Utilidades ────────────────────────────── */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
