import { useState, useEffect, useRef } from 'react';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { ListItem } from '../utils/api';
import { MuralItemComponent } from './MuralItemComponent';

interface MuralGridProps {
  items: ListItem[];
  currentUser: string;
  onDeleteItem: (id: string) => void;
  onMarkViewed: (id: string) => void;
}

interface DayGroup {
  date: Date;
  dateStr: string;
  items: ListItem[];
}

export function MuralGrid({ items, currentUser, onDeleteItem, onMarkViewed }: MuralGridProps) {
  const [visibleDays, setVisibleDays] = useState(3); // Carregar 3 dias inicialmente
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Agrupar itens por dia
  const groupByDay = (itemsList: ListItem[]): DayGroup[] => {
    const groups = new Map<string, DayGroup>();

    // Ordenar por mais recentes primeiro
    const sortedItems = [...itemsList].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    sortedItems.forEach(item => {
      const itemDate = parseISO(item.createdAt);
      const dayStart = startOfDay(itemDate);
      const dateStr = format(dayStart, 'yyyy-MM-dd');

      if (!groups.has(dateStr)) {
        groups.set(dateStr, {
          date: dayStart,
          dateStr,
          items: [],
        });
      }

      groups.get(dateStr)?.items.push(item);
    });

    // Converter para array e ordenar por data (mais recentes primeiro)
    return Array.from(groups.values()).sort((a, b) => 
      b.date.getTime() - a.date.getTime()
    );
  };

  const dayGroups = groupByDay(items);
  const visibleGroups = dayGroups.slice(0, visibleDays);
  const hasMoreDays = visibleDays < dayGroups.length;

  // Intersection Observer para detectar scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMoreDays) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoadingMore && hasMoreDays) {
          setIsLoadingMore(true);
          
          // Simular um pequeno delay para suavizar
          setTimeout(() => {
            setVisibleDays(prev => Math.min(prev + 3, dayGroups.length));
            setIsLoadingMore(false);
          }, 300);
        }
      },
      {
        root: null,
        rootMargin: '100px', // Começar a carregar 100px antes do final
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreDays, isLoadingMore, dayGroups.length]);

  // Reset quando mudar os itens
  useEffect(() => {
    setVisibleDays(3);
  }, [items.length]);

  // Formatar label do dia
  const getDayLabel = (date: Date): string => {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(new Date(now.setDate(now.getDate() - 1)));

    if (isSameDay(date, today)) {
      return 'Hoje';
    } else if (isSameDay(date, yesterday)) {
      return 'Ontem';
    } else {
      return format(date, "d 'de' MMMM", { locale: ptBR });
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 pb-6">
      {visibleGroups.map((group, groupIndex) => (
        <motion.div
          key={group.dateStr}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.05 }}
        >
          {/* Date Header */}
          <div className="flex items-center justify-center mb-4">
            <div className="px-4 py-1.5 bg-[#F8F6F3] rounded-full border border-[#E8E4DF]">
              <span className="text-sm font-medium text-[#4D989B]">
                {getDayLabel(group.date)}
              </span>
            </div>
          </div>

          {/* Grid de itens do dia */}
          <div className="grid grid-cols-2 gap-4">
            {group.items.map((item, itemIndex) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: groupIndex * 0.05 + itemIndex * 0.03,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20
                }}
              >
                <MuralItemComponent
                  item={item}
                  onDelete={() => onDeleteItem(item.id)}
                  currentUser={currentUser}
                  onMarkViewed={() => onMarkViewed(item.id)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Loading Trigger & Indicator */}
      {hasMoreDays && (
        <div ref={loadMoreRef} className="py-4">
          {isLoadingMore && (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#F8F6F3] rounded-full">
                <div className="w-4 h-4 border-2 border-[#4D989B] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#4D989B] font-medium">Carregando...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* End Message */}
      {!hasMoreDays && dayGroups.length > 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-4"
        >
          <div className="px-4 py-2 bg-[#F8F6F3] rounded-full">
            <span className="text-sm text-[#8A847D]">
              Todos os posts carregados
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}