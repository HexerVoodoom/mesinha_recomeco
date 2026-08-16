import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ListItem } from '../utils/api';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Profile = 'Amanda' | 'Mateus';

interface MoodPanelProps {
  items: ListItem[];
  userProfile: Profile;
  onCheckIn: (emoji: string, label: string, note: string) => Promise<void>;
}

// Paleta de humores. O `label` vira o título do item (aparece no push do
// parceiro), o emoji vira o marcador no calendário de status.
const MOODS = [
  { emoji: '😄', label: 'Ótimo' },
  { emoji: '🙂', label: 'Bem' },
  { emoji: '😐', label: 'Neutro' },
  { emoji: '😴', label: 'Cansado' },
  { emoji: '😟', label: 'Ansioso' },
  { emoji: '😢', label: 'Pra baixo' },
  { emoji: '😠', label: 'Irritado' },
  { emoji: '🥰', label: 'Apaixonado' },
];

// Humores em que o parceiro provavelmente quer dar um alô — o painel sugere
// a cutucada em vez de deixar passar batido.
const NEEDS_CARE = new Set(['😟', '😢', '😠']);

/** Data local (fuso do aparelho) no formato YYYY-MM-DD. */
function localDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

/** Id determinístico: uma linha por pessoa por dia (o POST /items faz upsert). */
export function moodItemId(profile: Profile, dateStr: string): string {
  return `mood-${profile}-${dateStr}`;
}

export function MoodPanel({ items, userProfile, onCheckIn }: MoodPanelProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const partnerName: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const todayStr = localDateStr(new Date());

  // Mapa (pessoa + dia) -> item de humor, para o calendário de status.
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

  // Últimos 14 dias, do mais antigo pro mais recente.
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => localDateStr(subDays(today, 13 - i)));
  }, []);

  const handlePick = async (emoji: string, label: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onCheckIn(emoji, label, note.trim());
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 pb-24">
      {/* Hoje: os dois lado a lado */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { name: userProfile, item: myToday, isMe: true },
          { name: partnerName, item: partnerToday, isMe: false },
        ].map(({ name, item, isMe }) => (
          <div
            key={name}
            className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] p-4 text-center"
          >
            <p className="font-['Quicksand',sans-serif] font-bold text-xs uppercase tracking-tight text-muted-foreground mb-2">
              {isMe ? 'Você' : name}
            </p>
            <div className="text-4xl mb-1 leading-none">
              {item?.moodEmoji || '·'}
            </div>
            <p className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28]">
              {item?.title || (isMe ? 'Como você tá?' : 'Ainda não marcou')}
            </p>
            {item?.comment && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"{item.comment}"</p>
            )}
          </div>
        ))}
      </div>

      {/* Sugestão de cuidado quando o parceiro não está bem */}
      {partnerToday?.moodEmoji && NEEDS_CARE.has(partnerToday.moodEmoji) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#4D989B]/10 border-l-4 border-[#4D989B] px-4 py-3 mb-5"
        >
          <p className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28]">
            {partnerName} marcou <strong>{partnerToday.title.toLowerCase()}</strong> hoje. Que tal
            mandar uma cutucada carinhosa? 💗
          </p>
        </motion.div>
      )}

      {/* Seletor de humor */}
      <p className="font-['Quicksand',sans-serif] font-bold text-sm text-[#2B2A28] mb-2">
        {myToday ? 'Mudou o humor? Marca de novo' : 'Como você tá hoje?'}
      </p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {MOODS.map(mood => {
          const isPicked = myToday?.moodEmoji === mood.emoji;
          return (
            <button
              key={mood.emoji}
              onClick={() => handlePick(mood.emoji, mood.label)}
              disabled={saving}
              className={`rounded-2xl border-2 py-3 flex flex-col items-center gap-1 transition-colors disabled:opacity-50 ${
                isPicked
                  ? 'border-[#4D989B] bg-[#4D989B]/10'
                  : 'border-[#E9E4DF] bg-white hover:bg-[#F8F6F4]'
              }`}
            >
              <span className="text-2xl leading-none">{mood.emoji}</span>
              <span className="font-['Quicksand',sans-serif] text-[11px] text-[#2B2A28]">
                {mood.label}
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

      {/* Calendário de status — 14 dias dos dois */}
      <p className="font-['Quicksand',sans-serif] font-bold text-sm text-[#2B2A28] mb-2">
        Últimos 14 dias
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
          {[userProfile, partnerName].map(name => (
            <div key={name} className="flex gap-1 items-center mb-1">
              <div className="w-14 text-[11px] font-['Quicksand',sans-serif] font-bold text-[#2B2A28] truncate">
                {name}
              </div>
              {days.map(day => {
                const entry = moodByKey.get(`${name}:${day}`);
                return (
                  <div
                    key={day}
                    title={entry ? `${entry.title}${entry.comment ? ` — ${entry.comment}` : ''}` : 'Sem registro'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                      entry ? 'bg-[#F8F6F4]' : 'bg-[#F8F6F4]/40'
                    } ${day === todayStr ? 'ring-2 ring-[#4D989B]/40' : ''}`}
                  >
                    {entry?.moodEmoji || ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
