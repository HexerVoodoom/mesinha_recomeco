import { motion, AnimatePresence } from 'motion/react';
import { X, Download } from 'lucide-react';

interface PhotoViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  title?: string;
}

export function PhotoViewModal({ isOpen, onClose, photoUrl, title }: PhotoViewModalProps) {
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
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            style={{ maxWidth: 390, margin: '0 auto' }}
          >
            {/* Download Button - Top Left */}
            <button
              onClick={handleDownload}
              className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
            >
              <Download className="w-6 h-6 text-white" />
            </button>

            {/* Close Button - Top Right */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-[90%] max-h-[80%]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photoUrl}
                alt={title || 'Foto ampliada'}
                className="w-full h-full object-contain rounded-lg"
              />
              {title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-3 rounded-b-lg">
                  <p className="text-white text-center font-['Quicksand',sans-serif] font-medium">
                    {title}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}