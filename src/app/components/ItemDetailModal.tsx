import { useState } from 'react';
import { X, Image as ImageIcon, Bell, BellOff, Play, ExternalLink, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ListItem } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TextArea } from './ui/input';
import { TagSelector } from './TagSelector';
import { toast } from 'sonner';
import { LazyPhoto } from './LazyPhoto';
import { Checkbox } from './ui/checkbox';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ImageModal } from './ImageModal';
import { ConfirmationModal } from './ConfirmationModal';
import primaryButtonBg from "figma:asset/85f171ff8cd9cb4f7140b1d04b0f2e0ecceb0615.png";
import secondaryButtonBg from "figma:asset/75c872bdf2a28b8670edf0ef3851acf422588625.png";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ListItem;
  onUpdate: (updates: Partial<ListItem>) => void;
  onDelete: () => void;
  onMarkAsDone: () => void;
  onMarkAsPending?: () => void;
  allItems: ListItem[];
}

export function ItemDetailModal({
  isOpen,
  onClose,
  item,
  onUpdate,
  onDelete,
  onMarkAsDone,
  onMarkAsPending,
  allItems,
}: ItemDetailModalProps) {
  const [tempComment, setTempComment] = useState(item.comment || '');
  const [tempPhoto, setTempPhoto] = useState(item.photo && item.photo !== 'HAS_PHOTO' ? item.photo : '');
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showPhotoView, setShowPhotoView] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);
  const [tempVideoLink, setTempVideoLink] = useState(item.videoLink || '');
  
  // Estados específicos para categoria alarm (lembretes)
  const [tempReminderTime, setTempReminderTime] = useState(item.reminderTime || '08:00');
  const [tempReminderDays, setTempReminderDays] = useState<string[]>(item.reminderDays || []);
  const [tempReminderForMateus, setTempReminderForMateus] = useState(item.reminderForMateus || false);
  const [tempReminderForAmanda, setTempReminderForAmanda] = useState(item.reminderForAmanda || false);
  
  const hasPhoto = item.photo === 'HAS_PHOTO' || (item.photo && item.photo.startsWith('data:'));
  
  // Extract YouTube thumbnail from videoLink
  const getYouTubeThumbnail = (url: string | undefined): string | null => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /youtube\.com\/shorts\/([^&\?\/]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
      }
    }
    
    return null;
  };
  
  const videoThumbnail = item.category === 'watch' ? getYouTubeThumbnail(tempVideoLink) : null;
  const isWatchCategory = item.category === 'watch';
  
  const handlePhotoLoaded = (photo: string | null) => {
    if (photo) {
      setTempPhoto(photo);
    }
  };

  const handleSave = () => {
    const updates: Partial<ListItem> = { 
      comment: tempComment, 
      photo: tempPhoto || null 
    };
    
    if (item.category === 'alarm') {
      updates.reminderTime = tempReminderTime;
      updates.reminderDays = tempReminderDays;
      updates.reminderForMateus = tempReminderForMateus;
      updates.reminderForAmanda = tempReminderForAmanda;
    }
    
    if (item.category === 'watch') {
      updates.videoLink = tempVideoLink;
    }
    
    onUpdate(updates);
  };

  const handleSaveTags = (tags: string[]) => {
    onUpdate({ tags });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let width = img.width;
          let height = img.height;
          const maxSize = 1200;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          if (compressedDataUrl.length > 2800000) {
            const lowerQuality = canvas.toDataURL('image/jpeg', 0.5);
            resolve(lowerQuality);
          } else {
            resolve(compressedDataUrl);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setTempPhoto(compressed);
        toast.success('Foto comprimida e adicionada!');
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.error('Erro ao processar imagem');
      }
    }
  };

  const isDateCategory = item.category === 'dates';
  const isAlarmCategory = item.category === 'alarm';
  const isJokesCategory = item.category === 'jokes';
  const isOtherCategory = item.category === 'other';
  const isDone = item.status === 'done';
  
  const dayLabels: Record<string, string> = {
    mon: 'Seg',
    tue: 'Ter',
    wed: 'Qua',
    thu: 'Qui',
    fri: 'Sex',
    sat: 'Sáb',
    sun: 'Dom',
  };
  
  const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-[60]"
              style={{ maxWidth: '100vw', left: 0, right: 0, margin: 0 }}
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[70] max-h-[85vh] overflow-y-auto"
              style={{ bottom: 0, maxWidth: 390, margin: '0 auto' }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <h2 className="font-['Quicksand',sans-serif] font-bold text-lg text-[#2B2A28]">
                  {item.title}
                </h2>
                <div className="flex items-center gap-2">
                  {/* Botão de favorito */}
                  <button
                    onClick={() => {
                      onUpdate({ isFavorite: !item.isFavorite });
                      toast.success(item.isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/30 transition-colors"
                  >
                    <Star 
                      className={`w-5 h-5 transition-all ${
                        item.isFavorite 
                          ? 'text-[#FFD700] fill-[#FFD700]' 
                          : 'text-[#8A847D]'
                      }`}
                      strokeWidth={1.5}
                      style={item.isFavorite ? { stroke: '#000000' } : undefined}
                    />
                  </button>
                  {/* Botão de fechar */}
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-[#8A847D]" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {isDone ? (
                  // Content for completed items
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Item marcado como concluído
                    </p>
                    
                    {/* Actions for done items */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          onMarkAsPending?.();
                          onClose();
                        }}
                        className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                        style={{ backgroundImage: `url(${primaryButtonBg})` }}
                      >
                        Desmarcar
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirmation(true)}
                        className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                        style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ) : (
                  // Content for pending items
                  <>
                    {/* Repeat Count Display for dates */}
                    {isDateCategory && item.repeatCount !== undefined && item.repeatCount > 0 && (
                      <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#2B2A28]">
                            Total de repetições
                          </span>
                          <span className="text-2xl font-bold text-[#2B2A28]">
                            {item.repeatCount}x
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Campos específicos para categoria alarm (lembretes) */}
                    {isAlarmCategory && (
                      <div className="space-y-4 bg-primary/5 rounded-lg p-4">
                        {/* Checkboxes Mateus e Amanda */}
                        <div className="space-y-2">
                          <label className="font-['Quicksand',sans-serif] text-sm font-medium text-[#2B2A28] block mb-2">
                            Enviar lembrete para:
                          </label>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`mateus-${item.id}`}
                                checked={tempReminderForMateus}
                                onCheckedChange={(checked) => setTempReminderForMateus(checked as boolean)}
                              />
                              <label
                                htmlFor={`mateus-${item.id}`}
                                className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28] cursor-pointer select-none"
                              >
                                Mateus
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`amanda-${item.id}`}
                                checked={tempReminderForAmanda}
                                onCheckedChange={(checked) => setTempReminderForAmanda(checked as boolean)}
                              />
                              <label
                                htmlFor={`amanda-${item.id}`}
                                className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28] cursor-pointer select-none"
                              >
                                Amanda
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        {/* Time Picker */}
                        <div>
                          <label 
                            htmlFor={`time-${item.id}`}
                            className="font-['Quicksand',sans-serif] text-sm font-medium text-[#2B2A28] block mb-2"
                          >
                            Horário:
                          </label>
                          <input
                            id={`time-${item.id}`}
                            type="time"
                            value={tempReminderTime}
                            onChange={(e) => setTempReminderTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[#2B2A28] font-['Quicksand',sans-serif]"
                          />
                        </div>
                        
                        {/* Day Selector */}
                        <div>
                          <label className="font-['Quicksand',sans-serif] text-sm font-medium text-[#2B2A28] block mb-2">
                            Dias da semana:
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {allDays.map(day => {
                              const isSelected = tempReminderDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  onClick={() => {
                                    if (isSelected) {
                                      setTempReminderDays(tempReminderDays.filter(d => d !== day));
                                    } else {
                                      setTempReminderDays([...tempReminderDays, day]);
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    isSelected
                                      ? 'bg-primary text-white'
                                      : 'bg-white border border-border text-[#8A847D] hover:border-primary'
                                  }`}
                                >
                                  {dayLabels[day]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Video Preview and Link - apenas para categoria watch (ANTES do comment) */}
                    {isWatchCategory && (
                      <div className="space-y-3">
                        {/* Video Thumbnail Preview */}
                        {videoThumbnail && (
                          <div 
                            className="relative rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                            onClick={() => {
                              if (tempVideoLink) {
                                window.open(tempVideoLink, '_blank');
                              }
                            }}
                          >
                            <img 
                              src={videoThumbnail} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                            />
                            {/* Play Icon Overlay */}
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                                <Play className="w-8 h-8 text-[#4D989B] ml-1" fill="currentColor" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Watch Video Button */}
                        {tempVideoLink && (
                          <a
                            href={tempVideoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#81D8D0] to-[#4D989B] text-white rounded-xl hover:opacity-90 transition-opacity font-medium text-sm shadow-md"
                          >
                            <Play className="w-5 h-5" fill="currentColor" />
                            <span>Ir para o vídeo</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        
                        {/* Video Link Input */}
                        <div>
                          <label 
                            htmlFor={`video-link-${item.id}`}
                            className="font-['Quicksand',sans-serif] text-sm font-medium text-[#2B2A28] block mb-2"
                          >
                            Link do vídeo:
                          </label>
                          <input
                            id={`video-link-${item.id}`}
                            type="url"
                            value={tempVideoLink}
                            onChange={(e) => setTempVideoLink(e.target.value)}
                            placeholder="Cole o link do YouTube, TikTok, Instagram..."
                            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[#2B2A28] font-['Quicksand',sans-serif] text-sm placeholder:text-[#8A847D]/60"
                          />
                        </div>
                      </div>
                    )}

                    {/* Comment Input */}
                    <TextArea
                      value={tempComment}
                      onChange={(e) => setTempComment(e.target.value)}
                      placeholder="Adicionar um comentário..."
                      rows={3}
                      className="text-sm"
                    />

                    {/* Photo Upload - ESCONDER para categoria watch */}
                    {!isWatchCategory && (
                      <div>
                        <div className="relative">
                          <input
                            id={`photo-upload-${item.id}`}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor={`photo-upload-${item.id}`}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-center gap-2 text-muted-foreground text-sm"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>{tempPhoto ? 'Alterar foto' : 'Incluir foto'}</span>
                          </label>
                          {(tempPhoto || hasPhoto) && (
                            <div className="mt-2 relative rounded-lg overflow-hidden">
                              {tempPhoto && tempPhoto.startsWith('data:') ? (
                                <>
                                  <img 
                                    src={tempPhoto} 
                                    alt="Preview" 
                                    className="w-full h-32 object-cover rounded-lg cursor-pointer"
                                    onClick={() => setShowPhotoView(true)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowRemovePhotoConfirm(true)}
                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
                                </>
                              ) : hasPhoto ? (
                                <div onClick={() => setShowPhotoView(true)} className="cursor-pointer">
                                  <LazyPhoto 
                                    itemId={item.id}
                                    hasPhoto={hasPhoto}
                                    className="w-full h-32 object-cover rounded-lg"
                                    alt="Preview"
                                    onLoad={handlePhotoLoaded}
                                  />
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-1">
                      {isAlarmCategory ? (
                        // Para categoria alarm: Salvar/Excluir
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              handleSave();
                              onClose();
                            }}
                            className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                            style={{ backgroundImage: `url(${primaryButtonBg})` }}
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirmation(true)}
                            className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                            style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                          >
                            Excluir
                          </button>
                        </div>
                      ) : isDateCategory ? (
                        // Para categoria dates: Checkbox de lembrete + Editar/Excluir
                        <>
                          {/* Checkbox de ativar lembrete */}
                          {item.eventDate && (
                            <div className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`reminder-${item.id}`}
                                checked={!!item.reminderFrequency}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    onUpdate({ reminderFrequency: 'monthly' });
                                    toast.success('Lembrete ativado (mensal)');
                                  } else {
                                    onUpdate({ reminderFrequency: null });
                                    toast.success('Lembrete desativado');
                                  }
                                }}
                              />
                              <label
                                htmlFor={`reminder-${item.id}`}
                                className="font-['Quicksand',sans-serif] text-sm text-[#2B2A28] cursor-pointer select-none flex items-center gap-1.5"
                              >
                                {item.reminderFrequency ? (
                                  <Bell className="w-4 h-4 text-[#4D989B]" />
                                ) : (
                                  <BellOff className="w-4 h-4 text-[#8A847D]" />
                                )}
                                <span>Ativar lembrete</span>
                              </label>
                            </div>
                          )}
                          
                          {/* Botões de Editar e Excluir */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                handleSave();
                                onClose();
                              }}
                              className="flex-1 h-11 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                              style={{ backgroundImage: `url(${primaryButtonBg})` }}
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirmation(true)}
                              className="flex-1 h-11 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                              style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                            >
                              Excluir
                            </button>
                          </div>
                        </>
                      ) : isJokesCategory || isOtherCategory ? (
                        // Para categoria jokes e other: Apenas salvar e excluir
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              handleSave();
                              onClose();
                            }}
                            className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                            style={{ backgroundImage: `url(${primaryButtonBg})` }}
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirmation(true)}
                            className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                            style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                          >
                            Excluir
                          </button>
                        </div>
                      ) : (
                        // Para outras categorias: Salvar (com concluir) e Excluir
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              handleSave();
                              onMarkAsDone();
                              onClose();
                            }}
                            className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                            style={{ backgroundImage: `url(${primaryButtonBg})` }}
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirmation(true)}
                            className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity text-sm flex items-center justify-center"
                            style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>

                    {/* + Adicionar tag link */}
                    <button 
                      onClick={() => setShowTagSelector(true)}
                      className="font-['Quicksand',sans-serif] text-xs text-[#8A847D] hover:text-[#4D989B] transition-colors flex items-center gap-1"
                    >
                      <span className="text-lg leading-none">+</span>
                      <span>Adicionar tag</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tag Selector Modal */}
      <TagSelector
        isOpen={showTagSelector}
        onClose={() => setShowTagSelector(false)}
        selectedTags={item.tags || []}
        onSaveTags={handleSaveTags}
        allItems={allItems}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={() => {
          onDelete();
          onClose();
        }}
        itemTitle={item.title}
      />

      {/* Photo View Modal */}
      <ImageModal
        isOpen={showPhotoView}
        onClose={() => setShowPhotoView(false)}
        photoUrl={tempPhoto || ''}
        title={item.title}
        createdBy={item.createdBy}
        createdAt={item.createdAt}
      />

      {/* Remove Photo Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemovePhotoConfirm}
        onClose={() => setShowRemovePhotoConfirm(false)}
        onConfirm={() => {
          setTempPhoto('');
          toast.success('Foto removida');
          setShowRemovePhotoConfirm(false);
        }}
        title="Remover foto?"
        message="Tem certeza que deseja remover esta foto?"
        confirmText="Remover"
        cancelText="Cancelar"
      />
    </>
  );
}