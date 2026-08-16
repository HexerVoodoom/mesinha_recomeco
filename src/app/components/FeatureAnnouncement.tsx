import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift } from 'lucide-react';
import {
  pendingAnnouncement,
  markAnnouncementSeen,
  backfillAnnouncementsOnFirstRun,
  type ScheduledFeature,
} from '../utils/featureSchedule';

/**
 * Aviso de novidade: aparece uma única vez, no dia em que uma feature do
 * calendário é liberada. Enquanto a feature não abre, o app não dá nenhuma
 * pista de que ela existe — a graça é ser surpresa.
 */
export function FeatureAnnouncement() {
  const [feature, setFeature] = useState<ScheduledFeature | null>(null);

  useEffect(() => {
    // Quem instala o app hoje não deve receber a fila inteira de avisos
    // retroativos das features que já abriram.
    backfillAnnouncementsOnFirstRun();
    // Pequeno atraso pra não competir com o carregamento da tela.
    const timer = setTimeout(() => setFeature(pendingAnnouncement()), 900);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    if (feature) markAnnouncementSeen(feature.id);
    setFeature(null);
  };

  return (
    <AnimatePresence>
      {feature && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 bg-black/40 z-[80]"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-48px)] bg-card rounded-3xl z-[90] p-6 text-center border-2 border-[#4D989B]/20"
            style={{
              maxWidth: 330,
              boxShadow: '0 12px 40px rgba(77, 152, 155, 0.18)',
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <Gift className="w-4 h-4 text-[#4D989B]" />
              <span className="font-['Quicksand',sans-serif] font-bold text-[11px] uppercase tracking-[0.12em] text-[#4D989B]">
                Novidade na Mesinha
              </span>
            </div>

            <motion.div
              initial={{ scale: 0.5, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 200 }}
              className="text-5xl leading-none mb-3"
            >
              {feature.emoji}
            </motion.div>

            <h2 className="font-['Quicksand',sans-serif] font-bold text-2xl text-[#2B2A28] mb-2">
              {feature.name}
            </h2>
            <p className="font-['Quicksand',sans-serif] text-sm text-[#8A847D] leading-relaxed mb-5">
              {feature.blurb}
            </p>

            <button
              onClick={dismiss}
              className="w-full py-3 rounded-2xl bg-[#4D989B] text-white font-['Quicksand',sans-serif] font-bold hover:opacity-90 transition-opacity"
            >
              Quero ver!
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
