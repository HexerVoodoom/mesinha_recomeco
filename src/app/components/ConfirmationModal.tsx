import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import primaryButtonBg from "figma:asset/85f171ff8cd9cb4f7140b1d04b0f2e0ecceb0615.png";
import secondaryButtonBg from "figma:asset/75c872bdf2a28b8670edf0ef3851acf422588625.png";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}: ConfirmationModalProps) {
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
            className="fixed inset-0 bg-black/40 z-[80]"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] bg-white rounded-2xl z-[90] shadow-xl"
            style={{ 
              maxWidth: 330,
              boxShadow: '0 10px 40px rgba(77, 152, 155, 0.15), 0 4px 12px rgba(77, 152, 155, 0.08)'
            }}
          >
            <div className="p-6">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
              </div>

              {/* Title */}
              <h2 className="font-['Quicksand',sans-serif] text-xl font-semibold text-[#2B2A28] text-center mb-2">
                {title}
              </h2>

              {/* Message */}
              <p className="font-['Quicksand',sans-serif] text-sm text-[#8A847D] text-center mb-6">
                {message}
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 h-11 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity flex items-center justify-center"
                  style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 h-11 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity flex items-center justify-center"
                  style={{ backgroundImage: `url(${primaryButtonBg})` }}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}