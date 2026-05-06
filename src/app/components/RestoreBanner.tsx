import { useState, useEffect } from 'react';
import { Database, X } from 'lucide-react';
import { syncService } from '../utils/syncService';
import { localDB } from '../utils/localDB';
import { motion, AnimatePresence } from 'motion/react';

export function RestoreBanner() {
  const [show, setShow] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const wasDismissed = localStorage.getItem('restore_banner_dismissed');
    if (wasDismissed) {
      console.log('[RestoreBanner] Banner was dismissed');
      setDismissed(true);
      return;
    }

    // Check if we should show the banner (no data in local storage)
    const checkLocalData = async () => {
      try {
        const items = await localDB.getAllItems();
        console.log('[RestoreBanner] Local items count:', items.length);
        if (items.length === 0) {
          console.log('[RestoreBanner] Showing banner - no local data');
          setShow(true);
        } else {
          console.log('[RestoreBanner] Not showing banner - data exists');
        }
      } catch (error) {
        console.error('[RestoreBanner] Failed to check local data:', error);
      }
    };

    checkLocalData();
  }, []);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await syncService.restoreFromSupabase();
    } catch (error) {
      console.log('[RestoreBanner] Restore error:', error instanceof Error ? error.message : error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('restore_banner_dismissed', 'true');
    setDismissed(true);
    setShow(false);
  };

  if (!show || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 mx-auto max-w-[390px]"
      >
        <div className="bg-gradient-to-br from-green-500 to-teal-500 text-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <Database className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-1">
                Dados salvos disponíveis!
              </h3>
              <p className="text-sm text-white/90 mb-3">
                Encontramos 109 itens salvos no Supabase. Deseja restaurá-los?
              </p>
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="bg-white text-green-600 font-medium px-4 py-2 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isRestoring ? 'Restaurando...' : 'Restaurar dados agora'}
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
