import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shuffle, Plus, Trash2, PenLine } from 'lucide-react';
import { api, CardType, CardDeck } from '../utils/api';
import { toast } from 'sonner';

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: 'Amanda' | 'Mateus';
}

const TYPES: { id: CardType; label: string; emoji: string; hint: string }[] = [
  { id: 'verdade', label: 'Verdade', emoji: '🤍', hint: 'Uma pergunta pra responder na lata' },
  { id: 'desafio', label: 'Desafio', emoji: '🔥', hint: 'Uma missão pra cumprir agora' },
  { id: 'prefere', label: 'O que prefere', emoji: '⚖️', hint: 'Escolhe uma das duas' },
];

const EMPTY_DECK: CardDeck = { verdade: [], desafio: [], prefere: [] };

export function GamesModal({ isOpen, onClose, userProfile }: GamesModalProps) {
  const [custom, setCustom] = useState<CardDeck>(EMPTY_DECK);
  const [defaults, setDefaults] = useState<CardDeck>(EMPTY_DECK);
  const [type, setType] = useState<CardType>('verdade');
  const [card, setCard] = useState<string | null>(null);
  const [isOurs, setIsOurs] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Edição do baralho
  const [showDeck, setShowDeck] = useState(false);
  const [newCard, setNewCard] = useState('');

  useEffect(() => {
    if (!isOpen || loaded) return;
    api.getCards()
      .then(r => { setCustom(r.custom); setDefaults(r.defaults); setLoaded(true); })
      .catch(() => toast.error('Não deu pra carregar o baralho'));
  }, [isOpen, loaded]);

  const draw = (drawType: CardType = type) => {
    const ours = custom[drawType] || [];
    const theirs = defaults[drawType] || [];
    // As cartas de vocês entram com peso maior: são as que fazem a diferença
    // (o conteúdo genérico é só reserva pra nunca ficar sem carta).
    const pool = [...ours, ...ours, ...theirs];
    if (pool.length === 0) {
      setCard(null);
      toast.info('Baralho vazio — escreve a primeira carta!');
      return;
    }
    let pick = pool[Math.floor(Math.random() * pool.length)];
    // Evita repetir a carta anterior quando há alternativa
    if (pick === card && pool.length > 1) {
      const alt = pool.filter(c => c !== card);
      pick = alt[Math.floor(Math.random() * alt.length)];
    }
    setCard(pick);
    setIsOurs(ours.includes(pick));
  };

  const pickType = (next: CardType) => {
    setType(next);
    draw(next);
  };

  const addCard = async () => {
    if (!newCard.trim()) return;
    try {
      await api.addCard(userProfile, type, newCard);
      setCustom(prev => ({ ...prev, [type]: [...prev[type], newCard.trim()] }));
      setNewCard('');
      toast.success('Carta guardada no baralho de vocês! 🃏');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu pra guardar a carta');
    }
  };

  const removeCard = async (text: string) => {
    try {
      await api.removeCard(type, text);
      setCustom(prev => ({ ...prev, [type]: prev[type].filter(c => c !== text) }));
    } catch {
      toast.error('Não deu pra remover');
    }
  };

  const currentTypeMeta = TYPES.find(t => t.id === type)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60]"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />

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
                <h2 className="text-2xl font-medium">Jogos 🃏</h2>
                <button onClick={onClose} className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                As cartas de vocês saem com o dobro de chance das padrão.
              </p>

              {/* Tipo de carta */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => pickType(t.id)}
                    className={`rounded-2xl border-2 py-3 flex flex-col items-center gap-1 transition-colors ${
                      type === t.id
                        ? 'border-[#4D989B] bg-[#4D989B]/10'
                        : 'border-[#E9E4DF] bg-white hover:bg-[#F8F6F4]'
                    }`}
                  >
                    <span className="text-xl leading-none">{t.emoji}</span>
                    <span className="font-['Quicksand',sans-serif] text-[11px] font-bold text-[#2B2A28]">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* A carta */}
              <div className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] p-5 min-h-[140px] flex flex-col items-center justify-center text-center mb-3">
                {card ? (
                  <motion.div
                    key={card}
                    initial={{ opacity: 0, rotateX: -60 }}
                    animate={{ opacity: 1, rotateX: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <p className="font-['Quicksand',sans-serif] font-bold text-lg text-[#2B2A28] leading-snug">
                      {card}
                    </p>
                    {isOurs && (
                      <span className="inline-block mt-2 text-[11px] font-bold text-[#4D989B] bg-[#4D989B]/10 px-2 py-0.5 rounded-full">
                        carta de vocês
                      </span>
                    )}
                  </motion.div>
                ) : (
                  <p className="font-['Quicksand',sans-serif] text-muted-foreground">
                    {currentTypeMeta.hint}
                  </p>
                )}
              </div>

              <button
                onClick={() => draw()}
                className="w-full py-3.5 rounded-2xl bg-[#4D989B] text-white font-['Quicksand',sans-serif] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-4"
              >
                <Shuffle className="w-5 h-5" />
                {card ? 'Outra carta' : 'Tirar carta'}
              </button>

              {/* Baralho de vocês */}
              <button
                onClick={() => setShowDeck(prev => !prev)}
                className="w-full rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] px-4 py-3 flex items-center gap-3 hover:bg-[#E9E4DF]/50 transition-colors"
              >
                <PenLine className="w-5 h-5 text-[#4D989B]" strokeWidth={1.5} />
                <div className="flex-1 text-left">
                  <p className="font-['Quicksand',sans-serif] font-bold text-sm text-[#2B2A28]">
                    Escrever cartas de {currentTypeMeta.label.toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {custom[type].length} de vocês · {defaults[type].length} padrão
                  </p>
                </div>
              </button>

              {showDeck && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newCard}
                      onChange={(e) => setNewCard(e.target.value.substring(0, 240))}
                      onKeyDown={(e) => { if (e.key === 'Enter') addCard(); }}
                      placeholder={currentTypeMeta.hint}
                      className="flex-1 px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                    <button
                      onClick={addCard}
                      disabled={!newCard.trim()}
                      className="px-4 rounded-xl bg-[#4D989B] text-white disabled:opacity-40 flex items-center justify-center"
                      aria-label="Adicionar carta"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2 pb-2">
                    {custom[type].length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        Nenhuma carta de vocês nesse tipo ainda.
                      </p>
                    ) : (
                      custom[type].map(text => (
                        <div key={text} className="flex items-center gap-2 rounded-xl border border-[#E9E4DF] bg-white px-3 py-2">
                          <p className="flex-1 text-sm font-['Quicksand',sans-serif] text-[#2B2A28]">{text}</p>
                          <button
                            onClick={() => removeCard(text)}
                            className="p-1 rounded-full hover:bg-muted transition-colors"
                            aria-label="Remover carta"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
