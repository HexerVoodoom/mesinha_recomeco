import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { ListItem } from '../utils/api';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Profile = 'Amanda' | 'Mateus';

interface MoodPanelProps {
  items: ListItem[];
  userProfile: Profile;
  onCheckIn: (emoji: string, label: string, note: string, dateStr: string) => Promise<void>;
}

// Paleta de sabores — o dia da gente tem gosto, não humor. O `label` vira o
// título do item (aparece no push do parceiro) e o emoji vira o marcador no
// calendário de sabores.
const FLAVORS = [
  { emoji: '🍯', label: 'Doce' },
  { emoji: '🧂', label: 'Salgado' },
  { emoji: '🍋', label: 'Azedo' },
  { emoji: '☕', label: 'Amargo' },
  { emoji: '🌶️', label: 'Apimentado' },
  { emoji: '🍄', label: 'Umami' },
  { emoji: '🍫', label: 'Agridoce' },
  { emoji: '🫥', label: 'Sem gosto' },
];

// Sabores em que o parceiro provavelmente quer dar um alô — o painel sugere
// a cutucada em vez de deixar passar batido.
const NEEDS_CARE = new Set(['☕', '🍋', '🫥']);

/** Data local (fuso do aparelho) no formato YYYY-MM-DD. */
function localDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

/** Id determinístico: uma linha por pessoa por dia (o POST /items faz upsert). */
export function moodItemId(profile: Profile, dateStr: string): string {
  return `mood-${profile}-${dateStr}`;
}

/** "8 de setembro" — pra usar nos títulos do painel e do modal. */
function longDate(dateStr: string): string {
  return format(parseISO(dateStr), "d 'de' MMMM", { locale: ptBR });
}

export function MoodPanel({ items, userProfile, onCheckIn }: MoodPanelProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const partnerName: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const todayStr = localDateStr(new Date());

  // Dia que o seletor está editando. Começa em hoje, mas tocar num dia vazio
  // do calendário joga o seletor pra aquele dia (registro retroativo).
  const [selectedDate, setSelectedDate] = useState(todayStr);
  // Registro aberto no modal de detalhe (mostra o texto que a pessoa escreveu).
  const [detail, setDetail] = useState<{ item: ListItem; who: string; date: string } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Mapa (pessoa + dia) -> item de sabor, para o calendário.
  const moodByKey = useMemo(() => {
    const map = new Map<string, ListItem>();
    for (const item of items) {
      if (item.category !== 'mood' || !item.eventDate) continue;
      map.set(`${item.createdBy}:${item.eventDate}`, item);
    }
    return map;
  }, [items]);

  const myToday = moodByKey.get(`${userProfile}:${todayStr}`);
  const partnerToday = moodByKey.get(`${partnerName}:${todayStr}`);
  const mySelected = moodByKey.get(`${userProfile}:${selectedDate}`);
  const isToday = selectedDate === todayStr;

  // Ao trocar o dia do seletor, o campo de texto acompanha o que já tinha sido
  // escrito naquele dia (ou fica vazio, se for registro novo).
  useEffect(() => {
    setNote(moodByKey.get(`${userProfile}:${selectedDate}`)?.comment || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, userProfile]);

  // Últimos 14 dias, do mais antigo pro mais recente.
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => localDateStr(subDays(today, 13 - i)));
  }, []);

  const handlePick = async (emoji: string, label: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onCheckIn(emoji, label, note.trim(), selectedDate);
      setNote('');
      setSelectedDate(todayStr);
    } finally {
      setSaving(false);
    }
  };

  /** Tocar num dia vazio do próprio calendário abre o seletor pra aquele dia. */
  const handlePickDay = (day: string) => {
    setSelectedDate(day);
    pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="px-6 pb-24">
      {/* Hoje: os dois lado a lado */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { name: userProfile, item: myToday, isMe: true },
          { name: partnerName, item: partnerToday, isMe: false },
        ].map(({ name, item, isMe }) => (
          <button
            key={name}
            type="button"
            onClick={() =>
              item
                ? setDetail({ item, who: isMe ? 'Você' : name, date: todayStr })
                : isMe && handlePickDay(todayStr)
            }
            className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] p-4 text-center transition-colors hover:bg-[#F1EDE9]"
          >
            <p className="font-['Quicksand',sans-serif] font-bold text-xs uppercase tracking-tight text-muted-foreground mb-2">
              {isMe ? 'Você' : name}
            </p>
            <div className="text-4xl mb-1 leading-none">
              {item?.moodEmoji || '·'}
            </div>
            <p className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28]">
              {item?.title || (isMe ? 'Que gosto tem seu dia?' : 'Ainda não marcou')}
            </p>
            {item?.comment && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"{item.comment}"</p>
            )}
          </button>
        ))}
      </div>

      {/* Sugestão de cuidado quando o dia do parceiro não tem um gosto bom */}
      {partnerToday?.moodEmoji && NEEDS_CARE.has(partnerToday.moodEmoji) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#4D989B]/10 border-l-4 border-[#4D989B] px-4 py-3 mb-5"
        >
          <p className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28]">
            O dia de {partnerName} tá com gosto{' '}
            <strong>{partnerToday.title.toLowerCase()}</strong>. Que tal mandar uma cutucada
            carinhosa? 💗
          </p>
        </motion.div>
      )}

      {/* Seletor de sabor — de hoje ou de um dia anterior (retroativo) */}
      <div ref={pickerRef}>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <p className="font-['Quicksand',sans-serif] font-bold text-sm text-[#2B2A28]">
            {isToday
              ? mySelected
                ? 'Mudou o gosto? Marca de novo'
                : 'Que gosto tem seu dia?'
              : `Que gosto teve ${longDate(selectedDate)}?`}
          </p>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="font-['Quicksand',sans-serif] text-xs text-[#4D989B] font-bold shrink-0"
            >
              voltar pra hoje
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {FLAVORS.map(flavor => {
            const isPicked = mySelected?.moodEmoji === flavor.emoji;
            return (
              <button
                key={flavor.emoji}
                onClick={() => handlePick(flavor.emoji, flavor.label)}
                disabled={saving}
                className={`rounded-2xl border-2 py-3 flex flex-col items-center gap-1 transition-colors disabled:opacity-50 ${
                  isPicked
                    ? 'border-[#4D989B] bg-[#4D989B]/10'
                    : 'border-[#E9E4DF] bg-white hover:bg-[#F8F6F4]'
                }`}
              >
                <span className="text-2xl leading-none">{flavor.emoji}</span>
                <span className="font-['Quicksand',sans-serif] text-[11px] text-[#2B2A28]">
                  {flavor.label}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value.substring(0, 120))}
          placeholder="Quer contar por quê? (opcional)"
          className="w-full px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm mb-6"
        />
      </div>

      {/* Calendário de sabores — 14 dias dos dois */}
      <p className="font-['Quicksand',sans-serif] font-bold text-sm text-[#2B2A28] mb-1">
        Últimos 14 dias
      </p>
      <p className="font-['Quicksand',sans-serif] text-xs text-muted-foreground mb-2">
        Toque num sabor pra ler o recadinho — ou num dia vazio seu pra registrar depois.
      </p>
      <div className="rounded-2xl border-2 border-[#E9E4DF] bg-white p-3 overflow-x-auto">
        <div className="min-w-max">
          {/* Cabeçalho com os dias */}
          <div className="flex gap-1 mb-1 pl-14">
            {days.map(day => (
              <div
                key={day}
                className={`w-8 text-center text-[10px] font-['Quicksand',sans-serif] ${
                  day === todayStr ? 'text-[#4D989B] font-bold' : 'text-muted-foreground'
                }`}
              >
                {format(parseISO(day), 'd', { locale: ptBR })}
              </div>
            ))}
          </div>

          {/* Uma linha por pessoa */}
          {[userProfile, partnerName].map(name => {
            const isMe = name === userProfile;
            return (
              <div key={name} className="flex gap-1 items-center mb-1">
                <div className="w-14 text-[11px] font-['Quicksand',sans-serif] font-bold text-[#2B2A28] truncate">
                  {name}
                </div>
                {days.map(day => {
                  const entry = moodByKey.get(`${name}:${day}`);
                  // Registro existente abre o detalhe; dia vazio seu abre o
                  // seletor naquela data (registro retroativo).
                  const clickable = !!entry || isMe;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!clickable}
                      onClick={() => {
                        if (entry) setDetail({ item: entry, who: isMe ? 'Você' : name, date: day });
                        else if (isMe) handlePickDay(day);
                      }}
                      title={
                        entry
                          ? `${entry.title}${entry.comment ? ` — ${entry.comment}` : ''}`
                          : isMe
                            ? 'Sem registro — toque pra marcar'
                            : 'Sem registro'
                      }
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors ${
                        entry ? 'bg-[#F8F6F4]' : 'bg-[#F8F6F4]/40'
                      } ${clickable ? 'hover:bg-[#EFE9E4]' : ''} ${
                        day === todayStr ? 'ring-2 ring-[#4D989B]/40' : ''
                      } ${
                        !entry && isMe && day === selectedDate ? 'ring-2 ring-[#4D989B]' : ''
                      }`}
                    >
                      {entry?.moodEmoji || (isMe ? <span className="text-[#C9C2BB] text-lg leading-none">+</span> : '')}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de detalhe do sabor registrado */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetail(null)}
              className="fixed inset-0 bg-black/40 z-[80]"
              style={{ maxWidth: 390, margin: '0 auto' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] bg-white rounded-2xl z-[90] shadow-xl"
              style={{
                maxWidth: 330,
                boxShadow: '0 10px 40px rgba(77, 152, 155, 0.15), 0 4px 12px rgba(77, 152, 155, 0.08)',
              }}
            >
              <div className="p-6 text-center">
                <button
                  onClick={() => setDetail(null)}
                  aria-label="Fechar"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[#8A847D] hover:bg-[#F8F6F4]"
                >
                  <X className="w-4 h-4" />
                </button>

                <p className="font-['Quicksand',sans-serif] text-xs uppercase tracking-tight text-muted-foreground mb-3">
                  {detail.who} · {longDate(detail.date)}
                </p>
                <div className="text-6xl mb-2 leading-none">{detail.item.moodEmoji || '💭'}</div>
                <h2 className="font-['Quicksand',sans-serif] text-xl font-semibold text-[#2B2A28] mb-3">
                  {detail.item.title}
                </h2>

                {detail.item.comment ? (
                  <p className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28] bg-[#F8F6F4] rounded-xl px-4 py-3 text-left whitespace-pre-wrap">
                    "{detail.item.comment}"
                  </p>
                ) : (
                  <p className="font-['Quicksand',sans-serif] text-sm text-[#8A847D]">
                    Sem recadinho nesse dia.
                  </p>
                )}

                {detail.who === 'Você' && (
                  <button
                    onClick={() => {
                      const day = detail.date;
                      setDetail(null);
                      handlePickDay(day);
                    }}
                    className="mt-4 font-['Quicksand',sans-serif] text-xs text-[#4D989B] font-bold"
                  >
                    trocar o sabor desse dia
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
