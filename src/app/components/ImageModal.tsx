import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  title?: string;
  createdBy?: string;
  createdAt?: string;
}

export function ImageModal({ isOpen, onClose, photoUrl, title, createdBy, createdAt }: ImageModalProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photoUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = title ? `${title.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}_${timestamp}.jpg` : `foto_${timestamp}.jpg`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

          {/* Modal - Slide from bottom like Mural */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 left-1/2 -translate-x-1/2 w-full bg-white rounded-t-3xl z-50 shadow-xl"
            style={{ maxWidth: 390, maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DF]">
              <h3 className="text-lg font-semibold text-[#2B2A28]">
                {title || 'Foto'}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#F8F6F3] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#2B2A28]" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 py-6 space-y-4" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              {/* Photo */}
              <div className="w-full rounded-xl overflow-hidden">
                <img 
                  src={photoUrl} 
                  alt={title || 'Foto'}
                  className="w-full h-auto object-contain"
                />
              </div>

              {/* Metadata - only show if provided */}
              {(createdBy || createdAt) && (
                <div className="space-y-2 pt-4 border-t border-[#E8E4DF]">
                  {createdBy && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#8A847D]">Criado por:</span>
                      <span className="font-medium text-[#2B2A28]">{createdBy}</span>
                    </div>
                  )}
                  {createdAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#8A847D]">Data:</span>
                      <span className="font-medium text-[#2B2A28]">
                        {format(parseISO(createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8A847D]">Tipo:</span>
                    <span className="font-medium text-[#2B2A28]">🖼️ Imagem</span>
                  </div>
                </div>
              )}

              {/* Download button */}
              <div className="pt-2">
                <button
                  onClick={handleDownload}
                  className="w-full h-12 bg-[#4D989B] hover:bg-[#3d7a7c] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Baixar Imagem
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}