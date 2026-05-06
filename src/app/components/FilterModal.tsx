import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Filter } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterStatus: 'all' | 'pending' | 'done';
  onApplyFilter: (status: 'all' | 'pending' | 'done') => void;
}

export function FilterModal({ isOpen, onClose, filterStatus, onApplyFilter }: FilterModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(filterStatus);

  const handleApply = () => {
    onApplyFilter(selectedStatus);
  };

  const handleClear = () => {
    setSelectedStatus('all');
    onApplyFilter('all');
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
            className="fixed inset-0 bg-black/40 z-40"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />

          {/* Close Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onClose}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
            style={{ maxWidth: 390 }}
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-card rounded-t-3xl shadow-2xl z-50 pb-8"
            style={{ maxWidth: 390 }}
          >
            <div className="px-6 py-6">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5" />
                <h2 className="text-xl font-medium">Filtros</h2>
              </div>

              {/* Status Filter */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Status</label>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'pending', label: 'Pendentes' },
                    { value: 'done', label: 'Concluídos' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value as any)}
                      className={`w-full px-4 py-3 rounded-xl border transition-colors text-left ${
                        selectedStatus === option.value
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClear}
                  className="flex-1 px-6 py-3 rounded-xl text-foreground font-medium hover:bg-muted transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
