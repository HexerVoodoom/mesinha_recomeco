import { useState } from 'react';
import { ChevronRight, Play, ExternalLink, AlarmClock, Star } from 'lucide-react';
import { ListItem } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from './ui/Card';
import { LazyPhoto } from './LazyPhoto';
import { ItemDetailModal } from './ItemDetailModal';

interface ListItemComponentProps {
  item: ListItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<ListItem>) => void;
  onDelete: () => void;
  onMarkAsDone: () => void;
  onMarkAsPending?: () => void;
  allItems: ListItem[];
}

export function ListItemComponent({
  item,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onMarkAsDone,
  onMarkAsPending,
  allItems,
}: ListItemComponentProps) {
  const formattedDate = format(parseISO(item.createdAt), 'd MMM', { locale: ptBR });
  const [showModal, setShowModal] = useState(false);
  const [tempPhoto, setTempPhoto] = useState(item.photo && item.photo !== 'HAS_PHOTO' ? item.photo : '');
  
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
  
  const videoThumbnail = item.category === 'watch' ? getYouTubeThumbnail(item.videoLink) : null;
  const isWatchCategory = item.category === 'watch';
  
  const handlePhotoLoaded = (photo: string | null) => {
    if (photo) {
      setTempPhoto(photo);
    }
  };

  const isDateCategory = item.category === 'dates';
  const isAlarmCategory = item.category === 'alarm';
  const isJokesCategory = item.category === 'jokes';
  const isOtherCategory = item.category === 'other';
  const isDone = item.status === 'done';
  
  // Determine background color based on creator
  const isAmanda = item.createdBy === 'Amanda';
  const isMateus = item.createdBy === 'Mateus';
  const cardBackgroundClass = isAmanda 
    ? 'bg-purple-50/50' 
    : isMateus 
    ? 'bg-gray-50/50' 
    : 'bg-white';
  
  const frequencyLabels = {
    daily: 'Diariamente',
    weekly: 'Semanalmente',
    monthly: 'Mensalmente',
    yearly: 'Anualmente',
  };
  
  const dayLabels: Record<string, string> = {
    mon: 'Seg',
    tue: 'Ter',
    wed: 'Qua',
    thu: 'Qui',
    fri: 'Sex',
    sat: 'Sáb',
    sun: 'Dom',
  };

  return (
    <>
      <Card variant="white" className={`overflow-visible ${cardBackgroundClass}`}>
        <CardContent className="p-[18px]">
          {/* Main Row */}
          <div className="flex items-start gap-4">
            {/* Checkbox - não mostrar para categoria dates, jokes (bobeiras) e other (outros) */}
            {!isDateCategory && !isJokesCategory && !isOtherCategory && (
              <button
                onClick={() => {
                  if (isAlarmCategory) {
                    // Para categoria alarm: alterna entre ativo/desativado
                    onUpdate({ reminderActive: !item.reminderActive });
                  } else {
                    // Para outras categorias: marca como feito
                    if (!isDone) {
                      onMarkAsDone();
                    }
                  }
                }}
                className="flex-shrink-0 mt-0.5"
              >
                {isAlarmCategory ? (
                  // Ícone de relógio para lembretes
                  <AlarmClock 
                    className={`w-6 h-6 transition-all ${
                      item.reminderActive ? 'text-primary' : 'text-[#C5C0BA]'
                    }`}
                    strokeWidth={2}
                  />
                ) : (
                  // Checkbox para outras categorias
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isDone ? 'border-primary bg-primary' : 'border-[#4D989B]/30 bg-white'
                  }`}>
                    {isDone && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}
              </button>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setShowModal(true)}
                className="w-full text-left"
              >
                <div className={`font-['Quicksand',sans-serif] font-semibold text-base ${
                  isDone ? 'line-through text-muted-foreground' : 'text-[#2B2A28]'
                }`}>
                  {item.title}
                </div>
                
                {/* Horário do lembrete - aparece entre título e metadados */}
                {isAlarmCategory && item.reminderTime && (
                  (() => {
                    const today = new Date().getDay();
                    const dayMap: { [key: number]: string } = {
                      0: 'dom',
                      1: 'seg',
                      2: 'ter',
                      3: 'qua',
                      4: 'qui',
                      5: 'sex',
                      6: 'sab'
                    };
                    const todayKey = dayMap[today];
                    const isActiveToday = item.reminderDays?.includes(todayKey) && item.reminderActive;
                    
                    return (
                      <div className={`text-sm mt-1 font-['Quicksand',sans-serif] ${
                        isActiveToday ? 'text-[#2B2A28]' : 'text-[#C5C0BA]'
                      }`}>
                        {item.reminderTime}
                      </div>
                    );
                  })()
                )}
                
                {/* Event Date, Reminder Frequency and Repeat Count for dates category */}
                {isDateCategory && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {item.eventDate && (
                      <span className="text-xs text-[#8A847D]">
                        {format(parseISO(item.eventDate), 'd MMM yyyy', { locale: ptBR })}
                      </span>
                    )}
                    {item.reminderFrequency && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        🔔 {frequencyLabels[item.reminderFrequency]}
                      </span>
                    )}
                    {item.repeatCount !== undefined && item.repeatCount > 0 && (
                      <span className="text-xs font-medium text-[#2B2A28] bg-[#FFD700]/30 border border-[#FFD700]/50 px-2 py-0.5 rounded-full">
                        🔄 {item.repeatCount}x
                      </span>
                    )}
                  </div>
                )}
                
                {/* Reminder info for alarm category */}
                {isAlarmCategory && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Dias da semana */}
                    {item.reminderDays && item.reminderDays.length > 0 && (
                      <span className="text-xs text-[#8A847D]">
                        {item.reminderDays.map(day => dayLabels[day]).join(', ')}
                      </span>
                    )}
                    
                    {/* Para quem */}
                    <div className="flex items-center gap-1">
                      {item.reminderForMateus && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Mateus
                        </span>
                      )}
                      {item.reminderForAmanda && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Amanda
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.tags.map(tag => (
                      <span 
                        key={tag}
                        className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Video Thumbnail Preview - apenas para categoria watch */}
                {isWatchCategory && item.videoLink && (
                  <div className="mt-3 space-y-2">
                    {videoThumbnail ? (
                      <div 
                        className="relative rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.videoLink, '_blank');
                        }}
                      >
                        <img 
                          src={videoThumbnail} 
                          alt={item.title}
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            // Fallback se thumbnail não carregar
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                            <Play className="w-8 h-8 text-[#4D989B] ml-1" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Fallback quando não há thumbnail (TikTok, Instagram, etc)
                      <div 
                        className="relative rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group bg-gradient-to-br from-[#81D8D0]/20 to-[#4D989B]/20 border-2 border-[#81D8D0]/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.videoLink, '_blank');
                        }}
                      >
                        <div className="w-full h-40 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Play className="w-8 h-8 text-[#4D989B] ml-1" fill="currentColor" />
                            </div>
                            <p className="text-sm font-medium text-[#2B2A28]">Clique para assistir</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Watch Button */}
                    {/* Removed watch button - video opens via thumbnail click */}
                  </div>
                )}
                
                {/* Photo Preview - versão fechada */}
                {!isWatchCategory && hasPhoto && (
                  <div 
                    className="mt-3 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModal(true);
                    }}
                  >
                    {tempPhoto && tempPhoto.startsWith('data:') ? (
                      <img 
                        src={tempPhoto} 
                        alt={item.title}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <LazyPhoto 
                        itemId={item.id}
                        hasPhoto={hasPhoto}
                        className="w-full h-40 object-cover"
                        alt={item.title}
                        onLoad={handlePhotoLoaded}
                      />
                    )}
                  </div>
                )}
                
                <div className="font-['Quicksand',sans-serif] text-xs text-[#8A847D] mt-1.5">
                  {item.createdBy} • {formattedDate}
                </div>
              </button>
            </div>

            {/* Favorite Star (visual indicator only) and Chevron */}
            <div className="flex items-center gap-1 flex-shrink-0 mt-1">
              {/* Favorite Star - Only visible when favorited */}
              {item.isFavorite && (
                <Star 
                  className="w-5 h-5 text-[#FFD700] fill-[#FFD700]"
                  strokeWidth={1.5}
                  style={{ stroke: '#000000' }}
                />
              )}
              
              {/* Chevron */}
              <button onClick={() => setShowModal(true)}>
                <ChevronRight className="w-5 h-5 text-[#8A847D]/40" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        item={item}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onMarkAsDone={onMarkAsDone}
        onMarkAsPending={onMarkAsPending}
        allItems={allItems}
      />
    </>
  );
}