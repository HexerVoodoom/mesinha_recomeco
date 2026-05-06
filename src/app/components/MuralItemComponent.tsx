import { useState, useEffect } from 'react';
import { Trash2, X, Download, Copy, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ListItem, api } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { toast } from 'sonner';
import secondaryButtonBg from "figma:asset/75c872bdf2a28b8670edf0ef3851acf422588625.png";

interface MuralItemComponentProps {
  item: ListItem;
  onDelete: () => void;
  onMarkViewed?: () => void;
  currentUser: string;
  isHeroItem?: boolean;
  onToggleLike?: () => void;
}

export function MuralItemComponent({ item, onDelete, onMarkViewed, currentUser, isHeroItem = false, onToggleLike }: MuralItemComponentProps) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  const [fullItem, setFullItem] = useState<ListItem | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Parse do conteúdo do mural
  const contentType = (fullItem?.muralContentType || item.muralContentType) || 'text';
  const content = (fullItem?.muralContent || item.muralContent) || '';

  // Load full content only when user clicks to view
  const loadFullContentIfNeeded = async () => {
    if (!fullItem && !item.muralContent && !loadingContent) {
      setLoadingContent(true);
      try {
        const full = await api.getItemFull(item.id);
        setFullItem(full);
      } catch (error) {
        console.error('Failed to load mural content:', error);
      } finally {
        setLoadingContent(false);
      }
    }
  };

  // Verifica se é novo para o usuário atual
  const isNew = item.createdBy !== currentUser && !item.viewedBy?.includes(currentUser);

  // Verifica se o usuário atual curtiu o post
  const isLikedByCurrentUser = item.likedBy?.includes(currentUser) || false;
  
  // Só pode curtir se não foi o criador
  const canLike = item.createdBy !== currentUser;

  // Determine background color based on creator
  const isAmanda = item.createdBy === 'Amanda';
  const isMateus = item.createdBy === 'Mateus';
  const cardBackgroundClass = isAmanda 
    ? 'bg-purple-50/50' 
    : isMateus 
    ? 'bg-gray-50/50' 
    : 'bg-white';

  const handleOpenContent = async () => {
    await loadFullContentIfNeeded();
    setShowExpandedContent(true);
    // Marca como visualizado quando abre o conteúdo
    if (isNew && onMarkViewed) {
      onMarkViewed();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = content;
    
    // Gerar nome do arquivo baseado no tipo e título
    const timestamp = format(parseISO(item.createdAt), 'yyyyMMdd_HHmmss');
    const title = item.title ? item.title.substring(0, 20).replace(/[^a-z0-9]/gi, '_') : 'mural';
    
    let extension = '';
    switch (contentType) {
      case 'image':
        extension = '.jpg';
        break;
      case 'video':
        extension = '.mp4';
        break;
      case 'audio':
        extension = '.mp3';
        break;
      default:
        extension = '.txt';
    }
    
    link.download = `${title}_${timestamp}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    // Fallback para navegadores que bloqueiam Clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success('Conteúdo copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar:', err);
      toast.error('Não foi possível copiar o conteúdo');
    }
    
    document.body.removeChild(textArea);
  };

  const renderPreview = () => {
    // Show placeholder for images without loaded content
    if (!content && contentType === 'image') {
      return (
        <div
          className="w-full aspect-square bg-[#F8F6F3] rounded-sm overflow-hidden cursor-pointer hover:opacity-95 transition-opacity flex items-center justify-center"
          onClick={handleOpenContent}
        >
          {loadingContent ? (
            <div className="w-8 h-8 border-4 border-[#81D8D0] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#8A847D]">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Toque para visualizar</span>
            </div>
          )}
        </div>
      );
    }

    switch (contentType) {
      case 'image':
        return (
          <div
            className="w-full aspect-square bg-[#F8F6F3] rounded-sm overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
            onClick={handleOpenContent}
          >
            <img
              src={content}
              alt={item.title || 'Imagem do mural'}
              className="w-full h-full object-cover"
            />
          </div>
        );
      
      case 'video':
        return (
          <div 
            className="w-full aspect-video bg-[#F8F6F3] rounded-sm overflow-hidden relative cursor-pointer group"
            onClick={handleOpenContent}
          >
            <video 
              src={content}
              className="w-full h-full object-cover"
            >
              Seu navegador não suporta vídeo.
            </video>
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#4D989B] ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
            </div>
          </div>
        );
      
      case 'audio':
        return (
          <div 
            className="w-full p-6 bg-[#F8F6F3] rounded-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#F0EDE9] transition-colors"
            onClick={handleOpenContent}
          >
            <div className="w-16 h-16 rounded-full bg-[#81D8D0]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#4D989B]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-[#4D989B]">Toque para ouvir</span>
          </div>
        );
      
      case 'text':
      default:
        return (
          <div 
            className="w-full min-h-[120px] p-4 bg-[#F8F6F3] rounded-sm cursor-pointer hover:bg-[#F0EDE9] transition-colors"
            onClick={handleOpenContent}
          >
            <p className="text-sm text-[#2B2A28] whitespace-pre-wrap break-words leading-relaxed line-clamp-6">
              {content}
            </p>
            {content.length > 200 && (
              <div className="mt-2 text-xs text-[#4D989B] font-medium">Toque para ler mais...</div>
            )}
          </div>
        );
    }
  };

  const renderExpandedContent = () => {
    switch (contentType) {
      case 'image':
        return (
          <div className="w-full rounded-xl overflow-hidden">
            <img 
              src={content} 
              alt={item.title || 'Imagem do mural'}
              className="w-full h-auto object-contain"
            />
          </div>
        );
      
      case 'video':
        return (
          <div className="w-full rounded-xl overflow-hidden bg-black">
            <video 
              src={content}
              controls
              autoPlay
              className="w-full h-auto"
            >
              Seu navegador não suporta vídeo.
            </video>
          </div>
        );
      
      case 'audio':
        return (
          <div className="w-full p-8 bg-gradient-to-br from-[#81D8D0]/10 to-[#4D989B]/10 rounded-xl flex flex-col items-center justify-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#81D8D0] to-[#4D989B] flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <audio 
              src={content}
              controls
              autoPlay
              className="w-full"
            >
              Seu navegador não suporta áudio.
            </audio>
          </div>
        );
      
      case 'text':
      default:
        return (
          <div className="w-full p-6 bg-[#F8F6F3] rounded-xl">
            <p className="text-base text-[#2B2A28] whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          </div>
        );
    }
  };

  return (
    <>
      {/* Polaroid Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative ${cardBackgroundClass} ${isHeroItem ? 'p-4 pb-6' : 'p-3 pb-4'} rounded-lg shadow-lg`}
        style={{
          boxShadow: '0 4px 8px rgba(0,0,0,0.1), 0 6px 20px rgba(0,0,0,0.08)',
          transform: isHeroItem ? 'rotate(0deg)' : `rotate(${Math.random() * 4 - 2}deg)`,
        }}
      >
        {/* Fita adesiva no topo */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div 
            className="w-20 h-5 bg-gradient-to-b from-[#f4f1e8]/70 to-[#e8e4d8]/60 shadow-md relative"
            style={{
              transform: 'rotate(-2deg)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1), inset 0 -1px 2px rgba(0,0,0,0.08)',
              clipPath: 'polygon(2% 0%, 5% 20%, 3% 40%, 6% 60%, 4% 80%, 7% 100%, 93% 100%, 96% 80%, 94% 60%, 97% 40%, 95% 20%, 98% 0%)',
            }}
          >
            {/* Textura da fita */}
            <div className="w-full h-full opacity-20" style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 2px)'
            }} />
          </div>
        </div>

        {/* Content */}
        <div className="relative">
          {renderPreview()}
        </div>

        {/* Caption / Title */}
        <div className="mt-3 px-1">
          {item.title && (
            <p className="text-sm font-medium text-[#2B2A28] mb-1 line-clamp-2">
              {item.title}
            </p>
          )}
          
          {/* Metadata and Like */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-[#8A847D]">
                {item.createdBy}
              </span>
              <span className="text-[#8A847D]">
                {format(parseISO(item.createdAt), "d 'de' MMM", { locale: ptBR })}
              </span>
            </div>
            
            {/* Like button - só aparece se pode curtir */}
            {canLike && onToggleLike && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike();
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
              >
                <Heart 
                  className={`w-5 h-5 transition-colors ${
                    isLikedByCurrentUser 
                      ? 'fill-red-500 text-red-500' 
                      : 'text-[#8A847D]'
                  }`}
                />
              </motion.button>
            )}
          </div>
        </div>

        {/* Delete button - appears on hover/tap */}
        <button
          onClick={() => setShowDeleteConfirmation(true)}
          className="absolute top-2 left-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md opacity-0 hover:opacity-100 transition-opacity z-10"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>

        {/* Tag "NOVO" - só aparece para quem não criou e ainda não visualizou */}
        {isNew && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 z-20"
          >
            <div className="relative">
              <div className="px-3 py-1 bg-gradient-to-r from-[#4D989B] to-[#81D8D0] text-white text-xs font-bold rounded-full shadow-lg">
                NOVO
              </div>
              {/* Brilho animado */}
              <motion.div
                className="absolute inset-0 bg-white/30 rounded-full"
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Expand button for details */}
        <button
          onClick={() => setShowExpandedContent(true)}
          className="absolute bottom-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md opacity-0 hover:opacity-100 transition-opacity z-10"
        >
          <svg className="w-3.5 h-3.5 text-[#4D989B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {showExpandedContent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExpandedContent(false)}
              className="fixed inset-0 bg-black/40 z-40"
              style={{ maxWidth: 390, margin: '0 auto' }}
            />

            {/* Modal */}
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
                  {item.title || 'Post do Mural'}
                </h3>
                <button
                  onClick={() => setShowExpandedContent(false)}
                  className="p-2 hover:bg-[#F8F6F3] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#2B2A28]" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto px-6 py-6 space-y-4" style={{ maxHeight: 'calc(80vh - 80px)' }}>
                {/* Content preview */}
                <div>
                  {renderExpandedContent()}
                </div>

                {/* Caption - só para posts de imagem */}
                {contentType === 'image' && item.caption && (
                  <div className="pt-2">
                    <p className="text-sm text-[#2B2A28] leading-relaxed">
                      {item.caption}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2 pt-4 border-t border-[#E8E4DF]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8A847D]">Criado por:</span>
                    <span className="font-medium text-[#2B2A28]">
                      {item.createdBy}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8A847D]">Data:</span>
                    <span className="font-medium text-[#2B2A28]">
                      {format(parseISO(item.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8A847D]">Tipo:</span>
                    <span className="font-medium text-[#2B2A28]">
                      {contentType === 'text' && '📝 Texto'}
                      {contentType === 'image' && '🖼️ Imagem'}
                      {contentType === 'video' && '🎥 Vídeo'}
                      {contentType === 'audio' && '🎵 Áudio'}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  {/* Download button - Only for media content */}
                  {contentType !== 'text' && (
                    <button
                      onClick={handleDownload}
                      className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity flex items-center justify-center"
                      style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}

                  {/* Copy button - Only for text content */}
                  {contentType === 'text' && (
                    <button
                      onClick={handleCopy}
                      className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity flex items-center justify-center"
                      style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => {
                      setShowExpandedContent(false);
                      setShowDeleteConfirmation(true);
                    }}
                    className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Post
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={onDelete}
        itemTitle={item.title || 'este post'}
      />
    </>
  );
}