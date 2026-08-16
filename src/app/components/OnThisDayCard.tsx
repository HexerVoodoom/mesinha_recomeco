import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { api, OnThisDayMemory } from '../utils/api';

// Chave de sessão por dia: dispensou o card, ele só volta amanhã.
function dismissKey(date: string) {
  return `onThisDayDismissed:${date}`;
}

const TYPE_EMOJI: Record<string, string> = { text: '📝', image: '🖼️', video: '🎥', audio: '🎵' };

/**
 * Card de nostalgia no topo do Mural: ressuscita posts desta mesma data em
 * anos anteriores ("neste dia, há 1 ano..."). Só aparece quando existe
 * memória — em dias sem post antigo, não ocupa espaço nenhum.
 */
export function OnThisDayCard() {
  const [memories, setMemories] = useState<OnThisDayMemory[]>([]);
  const [date, setDate] = useState<string>('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getOnThisDay()
      .then(result => {
        if (cancelled) return;
        setDate(result.date);
        setMemories(result.memories || []);
        try {
          setDismissed(sessionStorage.getItem(dismissKey(result.date)) === '1');
        } catch (_) {}
      })
      .catch(() => {
        // Silencioso: nostalgia é bônus, nunca erro na cara do usuário
      });
    return () => { cancelled = true; };
  }, []);

  if (dismissed || memories.length === 0) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(dismissKey(date), '1'); } catch (_) {}
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <p className="font-['Quicksand',sans-serif] font-bold text-xs uppercase tracking-tight text-[#4D989B]">
            📆 Neste dia
          </p>
          <button
            onClick={dismiss}
            className="p-1 -mr-1 rounded-full hover:bg-[#E9E4DF] transition-colors"
            aria-label="Dispensar memórias de hoje"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pb-3 space-y-2">
          {memories.slice(0, 3).map(memory => {
            const yearsLabel = memory.yearsAgo === 1 ? 'há 1 ano' : `há ${memory.yearsAgo} anos`;
            const emoji = TYPE_EMOJI[memory.muralContentType || 'text'] || '📝';
            const text = memory.muralContentType === 'text'
              ? (memory.muralContent || memory.title)
              : (memory.caption || memory.title);
            return (
              <div key={memory.id} className="flex items-center gap-3">
                {memory.muralThumbnail ? (
                  <img
                    src={memory.muralThumbnail}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#E9E4DF]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#E9E4DF] flex items-center justify-center text-xl shrink-0">
                    {emoji}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28] line-clamp-2">
                    {text || 'Uma memória de vocês'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {memory.createdBy} postou {yearsLabel} 💛
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
