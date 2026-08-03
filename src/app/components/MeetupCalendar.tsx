import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  Check,
  Clock,
  Sunrise,
  Sun,
  Moon,
  Gamepad2,
  Footprints,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ListItem, MeetupPeriod, MeetupType } from '../utils/api';

type Profile = 'Amanda' | 'Mateus';
type ViewMode = 'month' | 'week';

interface MeetupCalendarProps {
  items: ListItem[];
  userProfile: Profile;
  onProposeDay: (dateStr: string, period: MeetupPeriod, type: MeetupType, comment: string) => void;
  onConfirmDay: (item: ListItem) => void;
  onCancelDay: (item: ListItem) => void;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type DayState = 'none' | 'mine-pending' | 'partner-pending' | 'confirmed';

const PERIOD_OPTIONS: { id: MeetupPeriod; label: string; icon: LucideIcon }[] = [
  { id: 'manha', label: 'Manhã', icon: Sunrise },
  { id: 'tarde', label: 'Tarde', icon: Sun },
  { id: 'noite', label: 'Noite', icon: Moon },
];

// "Coração" = ficar juntos em casa; "Video game" = jogar juntos, cada um na
// sua casa; "Pegadas" = sair (encontro fora de casa).
const TYPE_OPTIONS: { id: MeetupType; label: string; icon: LucideIcon }[] = [
  { id: 'coracao', label: 'Juntos em casa', icon: Heart },
  { id: 'videogame', label: 'Video game (cada um em casa)', icon: Gamepad2 },
  { id: 'pegadas', label: 'Sair', icon: Footprints },
];

function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function periodOf(id?: MeetupPeriod | null) {
  return PERIOD_OPTIONS.find(p => p.id === id);
}

function typeOf(id?: MeetupType | null) {
  return TYPE_OPTIONS.find(t => t.id === id);
}

/**
 * Calendário compartilhado de encontros: cada um toca num dia livre para
 * propor um encontro (escolhendo período e tipo), o parceiro recebe uma
 * notificação; tocando de novo no dia proposto, confirma o encontro. Suporta
 * visão por mês e por semana.
 */
export function MeetupCalendar({ items, userProfile, onProposeDay, onConfirmDay, onCancelDay }: MeetupCalendarProps) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const today = startOfDay(new Date());

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState<Date>(today);
  const [selectedDay, setSelectedDay] = useState<{ dateStr: string; item?: ListItem } | null>(null);

  // Modal de proposta: dia livre tocado, aguardando escolha de período + tipo.
  const [proposeDate, setProposeDate] = useState<string | null>(null);
  const [draftPeriod, setDraftPeriod] = useState<MeetupPeriod | null>(null);
  const [draftType, setDraftType] = useState<MeetupType | null>(null);
  const [draftComment, setDraftComment] = useState('');

  const meetupsByDate = useMemo(() => {
    const map = new Map<string, ListItem>();
    for (const item of items) {
      if (item.category === 'meetup' && item.eventDate) {
        map.set(item.eventDate, item);
      }
    }
    return map;
  }, [items]);

  const days = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn: 0 });
      const end = endOfWeek(cursor, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewMode, cursor]);

  const goPrev = () => setCursor(prev => (viewMode === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1)));
  const goNext = () => setCursor(prev => (viewMode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1)));
  const goToday = () => setCursor(today);

  const headerLabel = viewMode === 'week'
    ? `${format(startOfWeek(cursor, { weekStartsOn: 0 }), 'd MMM', { locale: ptBR })} - ${format(endOfWeek(cursor, { weekStartsOn: 0 }), 'd MMM', { locale: ptBR })}`
    : format(cursor, 'MMMM yyyy', { locale: ptBR });

  const handleDayTap = (date: Date) => {
    if (isBefore(date, today)) return; // não mexe em dias passados
    const dateStr = toDateStr(date);
    const item = meetupsByDate.get(dateStr);
    if (!item) {
      setDraftPeriod(null);
      setDraftType(null);
      setDraftComment('');
      setProposeDate(dateStr);
      return;
    }
    setSelectedDay({ dateStr, item });
  };

  const closeSheet = () => setSelectedDay(null);
  const closeProposeSheet = () => {
    setProposeDate(null);
    setDraftPeriod(null);
    setDraftType(null);
    setDraftComment('');
  };

  const handleSubmitPropose = () => {
    if (!proposeDate || !draftPeriod || !draftType) return;
    onProposeDay(proposeDate, draftPeriod, draftType, draftComment.trim());
    closeProposeSheet();
  };

  const dayState = (item: ListItem | undefined): DayState => {
    if (!item) return 'none';
    if (item.status === 'done') return 'confirmed';
    return item.createdBy === userProfile ? 'mine-pending' : 'partner-pending';
  };

  return (
    <div className="px-6 pb-24">
      {/* Título + toggle de visão */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <h2 className="font-['Quicksand',sans-serif] font-bold text-lg text-[#2B2A28]">Calendário de Encontros</h2>
        </div>
        <div className="flex bg-[#F8F6F4] border-2 border-[#E9E4DF] rounded-full p-1">
          {(['month', 'week'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight transition-colors ${
                viewMode === mode ? 'bg-primary text-white' : 'text-[#2B2A28]'
              }`}
            >
              {mode === 'month' ? 'Mês' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="p-2 rounded-full hover:bg-muted/40 transition-colors">
          <ChevronLeft className="w-5 h-5 text-[#2B2A28]" />
        </button>
        <button onClick={goToday} className="text-base font-medium capitalize text-[#2B2A28]">
          {headerLabel}
        </button>
        <button onClick={goNext} className="p-2 rounded-full hover:bg-muted/40 transition-colors">
          <ChevronRight className="w-5 h-5 text-[#2B2A28]" />
        </button>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-xs font-bold text-muted-foreground uppercase">
            {label}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-y-2">
        {days.map(date => {
          const dateStr = toDateStr(date);
          const item = meetupsByDate.get(dateStr);
          const state = dayState(item);
          const outOfMonth = viewMode === 'month' && !isSameMonth(date, cursor);
          const isPast = isBefore(date, today);
          const disabled = isPast;
          const TypeIcon = item ? (typeOf(item.meetupType)?.icon || Heart) : null;

          const stateClasses: Record<DayState, string> = {
            none: 'bg-transparent text-[#2B2A28] hover:bg-muted/30',
            'mine-pending': 'bg-white border-2 border-dashed border-primary text-primary',
            'partner-pending': 'bg-[#F6C177]/30 border-2 border-[#F6C177] text-[#8A5A15]',
            confirmed: 'bg-primary text-white',
          };

          return (
            <div key={dateStr} className="flex items-center justify-center">
              <button
                onClick={() => handleDayTap(date)}
                disabled={disabled}
                className={`relative w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-medium transition-colors ${
                  stateClasses[state]
                } ${outOfMonth ? 'opacity-30' : ''} ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${
                  isToday(date) ? 'ring-2 ring-[#2B2A28]/40' : ''
                }`}
              >
                {format(date, 'd')}
                {TypeIcon && (
                  <TypeIcon
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full p-[1px] ${
                      state === 'confirmed' ? 'bg-white text-primary fill-white' : 'bg-white text-[#2B2A28]'
                    }`}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-2 text-sm text-[#2B2A28]">
          <span className="w-4 h-4 rounded-md bg-white border-2 border-dashed border-primary" />
          Você propôs, aguardando {partner}
        </div>
        <div className="flex items-center gap-2 text-sm text-[#2B2A28]">
          <span className="w-4 h-4 rounded-md bg-[#F6C177]/30 border-2 border-[#F6C177]" />
          {partner} propôs, toque para confirmar
        </div>
        <div className="flex items-center gap-2 text-sm text-[#2B2A28]">
          <span className="w-4 h-4 rounded-md bg-primary" />
          Encontro confirmado 💕
        </div>
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          {TYPE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <div key={id} className="flex items-center gap-1">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de proposta: escolher período + tipo do encontro */}
      <AnimatePresence>
        {proposeDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProposeSheet}
              className="fixed inset-0 bg-black/40 z-40"
              style={{ maxWidth: 390, margin: '0 auto' }}
            />
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={closeProposeSheet}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
              style={{ maxWidth: 390 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-card rounded-t-3xl shadow-2xl z-50 pb-8"
              style={{ maxWidth: 390 }}
            >
              <div className="px-6 py-6">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  <h2 className="text-xl font-medium">
                    {format(new Date(`${proposeDate}T00:00:00`), "d 'de' MMMM", { locale: ptBR })}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Propor um encontro para {partner}</p>

                <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-2 block">
                  Período
                </label>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {PERIOD_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setDraftPeriod(id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                        draftPeriod === id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-[#2B2A28]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>

                <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-2 block">
                  O que vamos fazer?
                </label>
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {TYPE_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setDraftType(id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                        draftType === id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-[#2B2A28]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium text-center leading-tight">{label}</span>
                    </button>
                  ))}
                </div>

                <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-2 block">
                  Comentário (opcional)
                </label>
                <textarea
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value.slice(0, 300))}
                  placeholder={`Escreve um recadinho pra ${partner} ver antes de confirmar...`}
                  rows={2}
                  className="w-full mb-6 px-4 py-3 rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-sm resize-none"
                />

                <button
                  onClick={handleSubmitPropose}
                  disabled={!draftPeriod || !draftType}
                  className="w-full px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Propor encontro
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom sheet de ação do dia selecionado */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 bg-black/40 z-40"
              style={{ maxWidth: 390, margin: '0 auto' }}
            />
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={closeSheet}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
              style={{ maxWidth: 390 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-card rounded-t-3xl shadow-2xl z-50 pb-8"
              style={{ maxWidth: 390 }}
            >
              <div className="px-6 py-6">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  <h2 className="text-xl font-medium">
                    {format(new Date(`${selectedDay.dateStr}T00:00:00`), "d 'de' MMMM", { locale: ptBR })}
                  </h2>
                </div>

                {/* Período + tipo escolhidos na proposta */}
                {selectedDay.item && (periodOf(selectedDay.item.meetupPeriod) || typeOf(selectedDay.item.meetupType)) && (
                  <div className="flex items-center gap-3 mb-4">
                    {periodOf(selectedDay.item.meetupPeriod) && (() => {
                      const { icon: Icon, label } = periodOf(selectedDay.item!.meetupPeriod)!;
                      return (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 text-sm text-[#2B2A28]">
                          <Icon className="w-4 h-4" /> {label}
                        </div>
                      );
                    })()}
                    {typeOf(selectedDay.item.meetupType) && (() => {
                      const { icon: Icon, label } = typeOf(selectedDay.item!.meetupType)!;
                      return (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 text-sm text-[#2B2A28]">
                          <Icon className="w-4 h-4" /> {label}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Comentário deixado por quem propôs, pra o outro ver antes de confirmar */}
                {selectedDay.item?.comment && (
                  <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-xl bg-muted/40">
                    <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-[#2B2A28] whitespace-pre-wrap">{selectedDay.item.comment}</p>
                  </div>
                )}

                {selectedDay.item?.status === 'done' ? (
                  <>
                    <div className="flex items-center gap-2 mb-6 text-base text-[#2B2A28]">
                      <Check className="w-5 h-5 text-primary" />
                      Encontro confirmado! Vocês vão se ver nesse dia 💕
                    </div>
                    <button
                      onClick={() => { onCancelDay(selectedDay.item!); closeSheet(); }}
                      className="w-full px-6 py-3 rounded-xl text-destructive font-medium hover:bg-destructive/10 transition-colors"
                    >
                      Remover encontro
                    </button>
                  </>
                ) : selectedDay.item?.createdBy === userProfile ? (
                  <>
                    <div className="flex items-center gap-2 mb-6 text-base text-muted-foreground">
                      <Clock className="w-5 h-5" />
                      Você propôs esse dia. Aguardando {partner} confirmar.
                    </div>
                    <button
                      onClick={() => { onCancelDay(selectedDay.item!); closeSheet(); }}
                      className="w-full px-6 py-3 rounded-xl text-destructive font-medium hover:bg-destructive/10 transition-colors"
                    >
                      Cancelar proposta
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-6 text-base text-[#2B2A28]">
                      {selectedDay.item?.createdBy} quer te ver nesse dia! Confirma?
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { onCancelDay(selectedDay.item!); closeSheet(); }}
                        className="flex-1 px-6 py-3 rounded-xl text-foreground font-medium hover:bg-muted transition-colors"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={() => { onConfirmDay(selectedDay.item!); closeSheet(); }}
                        className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                      >
                        Confirmar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
