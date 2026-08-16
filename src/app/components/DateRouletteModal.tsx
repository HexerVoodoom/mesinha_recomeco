import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Dices, RefreshCw, Film, UtensilsCrossed, MapPin } from 'lucide-react';
import { api, ListItem } from '../utils/api';

interface DateRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ListItem[];
}

// Slots da roleta: cada um sorteia um item PENDENTE de uma lista de vocês.
// A graça é que a sugestão nunca é genérica — sai do que vocês mesmos salvaram.
const SLOTS = [
  { category: 'movies', label: 'Pra assistir', icon: Film },
  { category: 'food', label: 'Pra comer', icon: UtensilsCrossed },
  { category: 'places', label: 'Pra ir', icon: MapPin },
] as const;

type SlotCategory = (typeof SLOTS)[number]['category'];

function pickRandom(list: ListItem[], excludeId?: string): ListItem | null {
  const pool = excludeId && list.length > 1 ? list.filter(i => i.id !== excludeId) : list;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function DateRouletteModal({ isOpen, onClose, items }: DateRouletteModalProps) {
  // Pool por categoria: começa com o que já está no estado da Home e é
  // completado com uma busca no servidor na primeira abertura (as categorias
  // são carregadas sob demanda, então o estado pode estar incompleto).
  const [pools, setPools] = useState<Record<SlotCategory, ListItem[]>>({ movies: [], food: [], places: [] });
  const [picks, setPicks] = useState<Record<SlotCategory, ListItem | null>>({ movies: null, food: null, places: null });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  // Pools completos vindos do servidor, preservados entre aberturas do modal
  const serverPoolsRef = useRef<Partial<Record<SlotCategory, ListItem[]>>>({});

  useEffect(() => {
    if (!isOpen) return;

    const fromState = (cat: SlotCategory) => {
      const cached = serverPoolsRef.current[cat];
      if (cached && cached.length > 0) return cached;
      return items.filter(i => i.category === cat && i.status === 'pending');
    };

    const initial: Record<SlotCategory, ListItem[]> = {
      movies: fromState('movies'),
      food: fromState('food'),
      places: fromState('places'),
    };
    setPools(initial);
    setPicks({
      movies: pickRandom(initial.movies),
      food: pickRandom(initial.food),
      places: pickRandom(initial.places),
    });
    setSpinKey(k => k + 1);

    if (loaded) return;
    setLoading(true);
    Promise.all(
      SLOTS.map(s =>
        api.getItems(s.category, 0, 200)
          .then(r => ({ category: s.category, items: r.items.filter(i => i.status === 'pending') }))
          .catch(() => ({ category: s.category, items: [] as ListItem[] })),
      ),
    ).then(results => {
      const next = { ...initial };
      for (const r of results) {
        // Servidor é fonte de verdade quando retorna algo; senão fica o estado local
        if (r.items.length > 0) {
          next[r.category] = r.items;
          serverPoolsRef.current[r.category] = r.items;
        }
      }
      setPools(next);
      // Preenche slots que ficaram vazios agora que o pool completo chegou
      setPicks(p => ({
        movies: p.movies ?? pickRandom(next.movies),
        food: p.food ?? pickRandom(next.food),
        places: p.places ?? pickRandom(next.places),
      }));
      setLoaded(true);
    }).finally(() => setLoading(false));
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const spinAll = () => {
    setPicks({
      movies: pickRandom(pools.movies, picks.movies?.id),
      food: pickRandom(pools.food, picks.food?.id),
      places: pickRandom(pools.places, picks.places?.id),
    });
    setSpinKey(k => k + 1);
  };

  const spinOne = (cat: SlotCategory) => {
    setPicks(p => ({ ...p, [cat]: pickRandom(pools[cat], p[cat]?.id) }));
    setSpinKey(k => k + 1);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60]"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-card rounded-t-3xl z-[70] border-t-2 border-[#4D989B]/10 max-h-[85vh] overflow-hidden flex flex-col"
            style={{
              maxWidth: 390,
              boxShadow: '0 -4px 20px rgba(77, 152, 155, 0.08), 0 -1px 4px rgba(77, 152, 155, 0.04)',
            }}
          >
            <div className="px-6 py-6 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-2xl font-medium">Roleta de Encontro 🎲</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Não sabem o que fazer? A roleta sorteia das listas de vocês.
              </p>

              <div className="space-y-3 mb-5">
                {SLOTS.map(slot => {
                  const pick = picks[slot.category];
                  const Icon = slot.icon;
                  return (
                    <div
                      key={slot.category}
                      className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] px-4 py-3 flex items-center gap-3"
                    >
                      <Icon className="w-5 h-5 text-[#4D989B] shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-tight font-bold text-muted-foreground font-['Quicksand',sans-serif]">
                          {slot.label}
                        </p>
                        <motion.p
                          key={`${slot.category}-${pick?.id ?? 'empty'}-${spinKey}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="font-['Quicksand',sans-serif] font-bold text-[#2B2A28] truncate"
                        >
                          {pick ? pick.title : loading ? 'Sorteando...' : 'Lista vazia — adiciona itens!'}
                        </motion.p>
                      </div>
                      <button
                        onClick={() => spinOne(slot.category)}
                        disabled={pools[slot.category].length <= 1}
                        className="p-2 rounded-full hover:bg-[#E9E4DF] transition-colors disabled:opacity-30"
                        aria-label={`Sortear outro em ${slot.label}`}
                      >
                        <RefreshCw className="w-4 h-4 text-[#2B2A28]" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={spinAll}
                className="w-full py-3.5 rounded-2xl bg-[#4D989B] text-white font-['Quicksand',sans-serif] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-2"
              >
                <Dices className="w-5 h-5" />
                Girar tudo de novo
              </button>
              <p className="text-xs text-center text-muted-foreground pb-2">
                Sorteia só itens pendentes de Filmes/Séries, Comidas e Lugares
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
