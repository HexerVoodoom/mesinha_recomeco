import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import faviconImage from 'figma:asset/be6328a8ae35307c0da22bbdbf01ed618424fba1.png';

export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Mostrar banner se ainda não tem permissão
      if (Notification.permission === 'default') {
        // Esperar 2 segundos antes de mostrar
        const timer = setTimeout(() => {
          setShow(true);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setShow(false);
        // Mostrar notificação de teste
        new Notification('💝 Mesinha', {
          body: 'Notificações ativadas! Você receberá lembretes e atualizações do mural.',
          icon: faviconImage,
          badge: faviconImage,
          tag: 'mesinha-welcome',
        });
      } else if (result === 'denied') {
        setShow(false);
      }
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Salvar no localStorage para não mostrar novamente nesta sessão
    sessionStorage.setItem('notificationBannerDismissed', 'true');
  };

  // Não mostrar se já foi dispensado nesta sessão
  if (sessionStorage.getItem('notificationBannerDismissed')) {
    return null;
  }

  return (
    <AnimatePresence>
      {show && permission === 'default' && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-4 right-4 z-50"
          style={{ maxWidth: 358, margin: '0 auto' }}
        >
          <div className="bg-gradient-to-br from-[#81D8D0] to-[#4D989B] rounded-2xl shadow-2xl p-4 border-2 border-white/20">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-bold text-base mb-1">
                  Ativar Notificações?
                </h3>
                <p className="text-white/90 text-sm mb-3">
                  Receba lembretes e saiba quando seu par adicionar algo ao mural!
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={requestPermission}
                    className="flex-1 bg-white text-[#4D989B] font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors"
                  >
                    Ativar
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="bg-white/20 text-white font-medium text-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}