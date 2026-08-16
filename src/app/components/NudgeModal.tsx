import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

interface NudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: 'Amanda' | 'Mateus';
}

// Mensagens rápidas da cutucada. O toque envia push imediato pro outro;
// o servidor limita a 1 cutucada a cada 3 min pra nunca virar spam.
const QUICK_MESSAGES = [
  'tá pensando em você agora 💭',
  'saudade! 🥺',
  'te amo 💗',
  'bora marcar alguma coisa? 👀',
  'olha o Mural que tem coisa nova 🎁',
];

const NUDGE_MAX_LEN = 90;

export function NudgeModal({ isOpen, onClose, userProfile }: NudgeModalProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const partnerName = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';

  const send = async (message?: string) => {
    if (sending) return;
    setSending(true);
    try {
      await api.sendNudge(userProfile, message);
      toast.success(`Cutucada enviada! ${partnerName} vai receber agora 💌`);
      setCustomMessage('');
      onClose();
    } catch (error) {
      // O servidor devolve mensagem amigável no rate limit (429)
      toast.error(error instanceof Error ? error.message : 'Não deu pra cutucar agora. Tenta de novo!');
    } finally {
      setSending(false);
    }
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
                <h2 className="text-2xl font-medium">Cutucar {partnerName} 💌</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Manda uma notificação carinhosa na hora, sem precisar de motivo.
              </p>

              {/* Mensagens rápidas */}
              <div className="space-y-2 mb-5">
                {QUICK_MESSAGES.map((msg) => (
                  <button
                    key={msg}
                    onClick={() => send(msg)}
                    disabled={sending}
                    className="w-full text-left px-4 py-3 rounded-xl border border-border bg-input-background hover:bg-muted transition-colors disabled:opacity-50 font-['Quicksand',sans-serif]"
                  >
                    {msg}
                  </button>
                ))}
              </div>

              {/* Mensagem personalizada */}
              <label className="text-base font-medium mb-2 block">Ou escreve a sua</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value.substring(0, NUDGE_MAX_LEN))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customMessage.trim()) send(customMessage);
                  }}
                  placeholder="Ex: comprei aquele doce que você ama"
                  className="flex-1 px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => send(customMessage)}
                  disabled={sending || !customMessage.trim()}
                  className="px-4 rounded-xl bg-[#4D989B] text-white disabled:opacity-40 transition-opacity flex items-center justify-center"
                  aria-label="Enviar cutucada"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground pb-2">
                {customMessage.length}/{NUDGE_MAX_LEN} · máx. 1 cutucada a cada 3 minutos
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
