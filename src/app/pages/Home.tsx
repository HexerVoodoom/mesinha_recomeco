import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Tv,
  Film,
  Gamepad2,
  UtensilsCrossed,
  MapPin,
  Calendar,
  Smile,
  AlarmClock,
  Umbrella,
  ChevronRight, 
  Plus, 
  Settings as SettingsIcon,
  ChevronDown,
  Filter,
  Search,
  Trophy,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, ListItem } from '../utils/api';
import { syncApi } from '../utils/syncApi';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useNotifications } from '../hooks/useNotifications';
import { seedInitialData } from '../utils/seedData';
import { localDB } from '../utils/localDB';
import { ListItemComponent } from '../components/ListItemComponent';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AddItemModal } from '../components/AddItemModal';
import { FilterModal } from '../components/FilterModal';
import { Top3ItemComponent } from '../components/Top3ItemComponent';
import { MuralItemComponent } from '../components/MuralItemComponent';
import { AddMuralModal } from '../components/AddMuralModal';
import { SearchContent } from '../components/SearchContent';
import { NotificationPermissionBanner } from '../components/NotificationPermissionBanner';
import { toast } from 'sonner';
import fabButton from "figma:asset/dd4b98f23138814cb5d5f735480190b4a56f65a0.png";
import grainTexture from "figma:asset/870f87368b0cc75469636c24542ec183a844dabf.png";
import headerDecoration from "figma:asset/1f94cbc6275b0a35eb5a9c6c93b92d94e2251075.png";
import topLaceDecoration from "figma:asset/efb30badc4fa5c4da28d3bf6ea65d7d99aa6b99b.png";
import imgIconeMural from "figma:asset/f55be14c67f2ee6191fde351aa33771fce7d5b93.png";
import imgIconLembrete from "figma:asset/5097108198344c1c84390e42ebe8df3ec16868c9.png";
import imgIconData from "figma:asset/e6ae93276b700b8f8f931da6519affe6c2e9c5d0.png";
import imgIconBobeiras from "figma:asset/44df7767036d0bbe143fb9ee3102554d9c29474f.png";
import imgIconTop3 from "figma:asset/f296c57b6ed7e73b350453d968fd883591dd3581.png";
import imgIconFilmesESeries from "figma:asset/a7e6f180afcfd6cefd1ae8165ed758a29e25da14.png";
import imgIconPesquisar from "figma:asset/cb1c8fe4b905e0ba73cec7627c5b9f5168142c03.png";
import imgIconOutros from "figma:asset/9598e760cce271dc861fb90f06a336792553ef6a.png";
import imgIconLugares from "figma:asset/d4ec5ae65b7bd51ce704f9bf07164532caa53a33.png";
import imgIconcomidas from "figma:asset/2c8cffafea0b456e1dfa9a773e633226de456ac0.png";
import imgIconVideoGame from "figma:asset/783a5ddb42e8653aa6debba484cc8b75c211df92.png";
import imgIconVieosCurtos from "figma:asset/b72dc3ec57224b4caa82c0bbb8e9602e4a8602e4.png";

type Category = 'watch' | 'movies' | 'games' | 'food' | 'places' | 'dates' | 'jokes' | 'alarm' | 'top3' | 'mural' | 'other';

const categories = [
  { id: 'mural' as Category, icon: Gift, label: 'Mural' },
  { id: 'alarm' as Category, icon: AlarmClock, label: 'Lembrete' },
  { id: 'dates' as Category, icon: Calendar, label: 'Datas' },
  { id: 'jokes' as Category, icon: Smile, label: 'Bobeiras' },
  { id: 'top3' as Category, icon: Trophy, label: 'Top 3' },
  { id: 'movies' as Category, icon: Film, label: 'Filmes/Séries' },
  { id: 'watch' as Category, icon: Tv, label: 'Vídeos Curtos' },
  { id: 'games' as Category, icon: Gamepad2, label: 'Jogos' },
  { id: 'food' as Category, icon: UtensilsCrossed, label: 'Comidas' },
  { id: 'places' as Category, icon: MapPin, label: 'Lugares' },
  { id: 'other' as Category, icon: Umbrella, label: 'Outros' },
];

// Mapeamento dos ícones personalizados do Figma
const categoryIcons: Record<Category | 'search', string> = {
  mural: imgIconeMural,
  alarm: imgIconLembrete,
  dates: imgIconData,
  jokes: imgIconBobeiras,
  top3: imgIconTop3,
  movies: imgIconFilmesESeries,
  watch: imgIconVieosCurtos,
  games: imgIconVideoGame,
  food: imgIconcomidas,
  places: imgIconLugares,
  other: imgIconOutros,
  search: imgIconPesquisar,
};

export default function Home() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('mural');
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all');
  const [error, setError] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Paginação - 7 itens por página
  const [currentPage, setCurrentPage] = useState<Record<Category, number>>({
    watch: 1,
    movies: 1,
    games: 1,
    food: 1,
    places: 1,
    dates: 1,
    jokes: 1,
    alarm: 1,
    top3: 1,
    mural: 1,
    other: 1,
  });
  const [loadedCategories, setLoadedCategories] = useState<Set<Category>>(new Set(['mural']));
  const ITEMS_PER_PAGE = 7;

  // Header long press states
  const [headerPressTimer, setHeaderPressTimer] = useState<number | null>(null);
  const [headerPressProgress, setHeaderPressProgress] = useState(0);

  const userProfile = (localStorage.getItem('userProfile') || 'You') as 'Amanda' | 'Mateus';

  // Sistema de notificações
  const { updateReminders, notifyNewMuralItem } = useNotifications(userProfile);

  // Atualizar lembretes quando os itens mudarem
  useEffect(() => {
    updateReminders(items);
  }, [items]);

  // Realtime Sync - ao receber qualquer evento, rebusca todos os itens da API
  useRealtimeSync({
    onSync: (event) => {
      console.log('[Home] Sync event received, reloading from API:', event.type);
      // Notificar se for novo item do mural
      if (event.type === 'item_created' && event.data?.category === 'mural') {
        notifyNewMuralItem(event.data);
        toast.success('Nova publicação no Mural! 💕', { duration: 3000 });
      } else if (event.type === 'item_created') {
        toast.success('Lista atualizada! 💕', { duration: 2000 });
      }
      // Sempre rebusca da API para garantir dados atualizados
      loadItems(true);
    },
    enabled: true,
  });

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleSwipe(1); // Next category
    } else if (isRightSwipe) {
      handleSwipe(-1); // Previous category
    }
  };

  // Header long press handlers
  const handleHeaderPressStart = () => {
    setHeaderPressProgress(0);
    
    const startTime = Date.now();
    const duration = 3000; // 3 seconds
    
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      
      setHeaderPressProgress(progress);
      
      if (progress >= 100) {
        clearInterval(timer);
        setHeaderPressTimer(null);
        setHeaderPressProgress(0);
        navigate('/settings');
        toast.success('Abrindo configurações...');
      }
    }, 16); // ~60fps
    
    setHeaderPressTimer(timer);
  };

  const handleHeaderPressEnd = () => {
    if (headerPressTimer) {
      clearInterval(headerPressTimer);
      setHeaderPressTimer(null);
      setHeaderPressProgress(0);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (headerPressTimer) {
        clearInterval(headerPressTimer);
      }
    };
  }, [headerPressTimer]);

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      if (isActive) {
        await loadItems();
      }
    };

    init();

    // Polling de fallback a cada 30s caso o WebSocket falhe
    const pollInterval = setInterval(() => {
      if (isActive) {
        console.log('[Home] Polling fallback: reloading items silently');
        loadItems(true);
      }
    }, 30000);

    const handleSyncComplete = () => {
      console.log('[Home] Background sync completed, reloading items silently');
      loadItems(true);
    };

    window.addEventListener('sync_completed', handleSyncComplete);

    return () => {
      isActive = false;
      clearInterval(pollInterval);
      window.removeEventListener('sync_completed', handleSyncComplete);
    };
  }, []);

  // Carregar dados quando uma categoria é aberta pela primeira vez
  useEffect(() => {
    if (!loadedCategories.has(activeCategory)) {
      setLoadedCategories(prev => new Set([...prev, activeCategory]));
    }
  }, [activeCategory]);

  const loadItems = async (silent: boolean = false, categoryFilter?: string, offset = 0) => {
    try {
      // Debug: Check if token exists before making API call
      const token = localStorage.getItem('authToken');
      console.log('[loadItems] Token in localStorage:', token ? `${token.substring(0, 50)}...` : 'MISSING');

      const result = await api.getItems(categoryFilter, offset, 100);
      if (result && Array.isArray(result.items)) {
        const fetchedItems = result.items;

        // Check if there are updates (compare with current items)
        const hasUpdates = JSON.stringify(items.map(i => ({ id: i.id, updatedAt: i.updatedAt }))) !==
                          JSON.stringify(fetchedItems.map(i => ({ id: i.id, updatedAt: i.updatedAt })));

        // If offset > 0, append to existing items; otherwise replace
        if (offset > 0) {
          setItems(prev => [...prev, ...fetchedItems]);
        } else {
          setItems(fetchedItems);
        }

        // Show toast only if this is a silent update and there are changes
        if (silent && hasUpdates && items.length > 0) {
          const partnerName = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
          toast.info(`${partnerName} atualizou a lista! 💕`, { duration: 2000 });
        }

        // Save to localStorage for offline mode (without photos to save space)
        try {
          const itemsForStorage = fetchedItems.map(item => ({
            ...item,
            photo: item.photo === 'HAS_PHOTO' ? null : item.photo
          }));
          localStorage.setItem('offlineItems', JSON.stringify(itemsForStorage));
        } catch (storageError) {
          console.warn('Failed to save to localStorage (quota exceeded?):', storageError);
          // Clear old data and try again
          localStorage.removeItem('offlineItems');
        }
        setError(null); // Clear any previous errors
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      
      // Only show error if this is not a silent update
      if (!silent) {
        // Try to load from localStorage
        const offlineItems = localStorage.getItem('offlineItems');
        if (offlineItems) {
          try {
            const parsed = JSON.parse(offlineItems);
            if (Array.isArray(parsed)) {
              setItems(parsed);
              setError(null); // Don't show error if we have offline data
            }
          } catch (parseError) {
            console.error('Failed to parse offline items:', parseError);
            localStorage.removeItem('offlineItems');
            // Initialize with sample data
            initializeSampleData();
          }
        } else {
          // Initialize with sample data
          initializeSampleData();
        }
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const initializeSampleData = () => {
    const sampleItems: ListItem[] = [
      {
        id: '1',
        title: 'Novo Filme',
        comment: '',
        category: 'watch',
        eventDate: null,
        photo: null,
        reminderEnabled: false,
        createdBy: 'Amanda',
        createdAt: '2026-04-02T12:00:00.000Z',
        status: 'pending',
        tags: ['netflix', 'fim de semana']
      },
      {
        id: '2',
        title: 'Avatar 3',
        comment: '',
        category: 'movies',
        eventDate: null,
        photo: null,
        reminderEnabled: false,
        createdBy: 'You',
        createdAt: '2026-03-15T12:00:00.000Z',
        status: 'pending',
        tags: ['cinema', 'ação']
      },
      {
        id: '3',
        title: 'GTA VI',
        comment: 'Lançamento em 2026',
        category: 'games',
        eventDate: null,
        photo: null,
        reminderEnabled: false,
        createdBy: 'Amanda',
        createdAt: '2026-02-20T12:00:00.000Z',
        status: 'pending',
        tags: ['playstation', 'ação']
      },
      {
        id: '4',
        title: 'Pizza da Maria',
        comment: '',
        category: 'food',
        eventDate: null,
        photo: null,
        reminderEnabled: false,
        createdBy: 'You',
        createdAt: '2026-03-01T12:00:00.000Z',
        status: 'done',
        tags: ['italiano', 'delivery']
      },
      {
        id: '5',
        title: 'Praia de Copacabana',
        comment: 'Ir no verão',
        category: 'places',
        eventDate: null,
        photo: null,
        reminderEnabled: false,
        createdBy: 'Amanda',
        createdAt: '2026-01-10T12:00:00.000Z',
        status: 'pending',
        tags: ['praia', 'rio de janeiro', 'fim de semana']
      },
      {
        id: '6',
        title: 'Aniversário Amanda',
        comment: '',
        category: 'dates',
        eventDate: '2026-07-15',
        photo: null,
        reminderEnabled: true,
        createdBy: 'You',
        createdAt: '2026-01-05T12:00:00.000Z',
        status: 'pending',
        tags: ['importante', 'aniversário']
      }
    ];
    setItems(sampleItems);
    localStorage.setItem('offlineItems', JSON.stringify(sampleItems));
    setError(null);
  };



  const handleAddItem = async (newItem: Partial<ListItem>) => {
    const item: ListItem = {
      id: Date.now().toString(),
      title: newItem.title || '',
      comment: newItem.comment || '',
      category: activeCategory,
      eventDate: newItem.eventDate || null,
      photo: newItem.photo || null,
      reminderEnabled: newItem.reminderEnabled || false,
      reminderFrequency: newItem.reminderFrequency,
      repeatCount: newItem.repeatCount,
      createdBy: userProfile,
      createdAt: new Date().toISOString(),
      status: 'pending',
      tags: newItem.tags || [],
      // Top 3 specific fields
      top3Mateus: newItem.top3Mateus,
      top3Amanda: newItem.top3Amanda,
      // Alarm specific fields
      reminderTime: newItem.reminderTime,
      reminderDays: newItem.reminderDays,
      reminderForMateus: newItem.reminderForMateus,
      reminderForAmanda: newItem.reminderForAmanda,
      reminderActive: newItem.reminderActive,
      // Mural specific fields
      muralContentType: newItem.muralContentType,
      muralContent: newItem.muralContent,
      // Watch specific fields
      videoLink: newItem.videoLink,
    };

    try {
      const createdItem = await syncApi.createItem(item);
      setItems([...items, createdItem]);
      localStorage.setItem('offlineItems', JSON.stringify([...items, createdItem]));
    } catch (error) {
      console.error('Failed to create item:', error);
      // Fallback to offline mode
      const newItems = [...items, item];
      setItems(newItems);
      localStorage.setItem('offlineItems', JSON.stringify(newItems));
      toast.info('Item adicionado localmente (modo offline)');
    }
    
    setShowAddModal(false);
    toast.success('Item adicionado com sucesso!');
  };

  const handleAddMuralPost = async (title: string, contentType: 'text' | 'image' | 'video' | 'audio', content: string, caption?: string) => {
    const item: ListItem = {
      id: Date.now().toString(),
      title,
      comment: '',
      category: 'mural',
      eventDate: null,
      photo: null,
      reminderEnabled: false,
      createdBy: userProfile,
      createdAt: new Date().toISOString(),
      status: 'pending',
      tags: [],
      muralContentType: contentType,
      muralContent: content,
      caption: caption || undefined, // Adiciona caption se fornecido
    };

    try {
      const createdItem = await syncApi.createItem(item);
      setItems([...items, createdItem]);
      localStorage.setItem('offlineItems', JSON.stringify([...items, createdItem]));
    } catch (error) {
      console.error('Failed to create mural post:', error);
      // Fallback to offline mode
      const newItems = [...items, item];
      setItems(newItems);
      localStorage.setItem('offlineItems', JSON.stringify(newItems));
      toast.info('Post adicionado localmente (modo offline)');
    }
    
    toast.success('Post adicionado ao mural!');
  };

  const handleUpdateItem = async (id: string, updates: Partial<ListItem>) => {
    const item = items.find(i => i.id === id);
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    
    try {
      const updatedItem = await syncApi.updateItem(id, updates);
      const finalItems = items.map(item => item.id === id ? updatedItem : item);
      setItems(finalItems);
      localStorage.setItem('offlineItems', JSON.stringify(finalItems));
    } catch (error) {
      console.error('Failed to update item:', error);
      // Fallback to offline mode
      setItems(updatedItems);
      localStorage.setItem('offlineItems', JSON.stringify(updatedItems));
      
      // Feedback específico para lembretes ou genérico
      if (item?.category === 'alarm' && 'reminderActive' in updates) {
        toast.info(updates.reminderActive ? 'Lembrete ativado localmente (modo offline)' : 'Lembrete desativado localmente (modo offline)');
      } else {
        toast.info('Item atualizado localmente (modo offline)');
      }
      return;
    }
    
    // Feedback específico para lembretes ou genérico
    if (item?.category === 'alarm' && 'reminderActive' in updates) {
      toast.success(updates.reminderActive ? 'Lembrete ativado!' : 'Lembrete desativado!');
    } else {
      toast.success('Item atualizado!');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const filteredItems = items.filter(item => item.id !== id);
    
    try {
      await syncApi.deleteItem(id);
      setItems(filteredItems);
      localStorage.setItem('offlineItems', JSON.stringify(filteredItems));
    } catch (error) {
      console.error('Failed to delete item:', error);
      // Fallback to offline mode
      setItems(filteredItems);
      localStorage.setItem('offlineItems', JSON.stringify(filteredItems));
      toast.info('Item removido localmente (modo offline)');
    }
    
    setExpandedItemId(null);
    toast.success('Item removido!');
  };

  const handleMarkAsDone = async (id: string) => {
    await handleUpdateItem(id, { status: 'done' });
    setExpandedItemId(null);
  };

  const handleMarkAsPending = async (id: string) => {
    await handleUpdateItem(id, { status: 'pending' });
    setExpandedItemId(null);
  };

  const handleMarkViewed = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Adiciona o usuário atual ao array de visualizações
    const viewedBy = item.viewedBy || [];
    if (!viewedBy.includes(userProfile)) {
      await handleUpdateItem(id, { 
        viewedBy: [...viewedBy, userProfile] 
      });
    }
  };

  const handleToggleLike = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Não pode curtir o próprio post
    if (item.createdBy === userProfile) return;
    
    // Toggle do like
    const likedBy = item.likedBy || [];
    const newLikedBy = likedBy.includes(userProfile)
      ? likedBy.filter(user => user !== userProfile) // Remove like
      : [...likedBy, userProfile]; // Adiciona like
    
    await handleUpdateItem(id, { 
      likedBy: newLikedBy 
    });
  };

  const filteredItems = items.filter(item => {
    if (item.category !== activeCategory) return false;
    // Para categoria 'dates', não filtrar por status
    if (activeCategory === 'dates') return true;
    if (filterStatus === 'pending' && item.status !== 'pending') return false;
    if (filterStatus === 'done' && item.status !== 'done') return false;
    return true;
  });

  // Para categoria 'dates', todos os itens são considerados "pending" (não tem separação)
  let allPendingItems = activeCategory === 'dates'
    ? filteredItems
    : filteredItems.filter(item => item.status === 'pending');
  let allDoneItems = activeCategory === 'dates'
    ? []
    : filteredItems.filter(item => item.status === 'done');

  // Para o mural, ordenar por mais recentes primeiro (reverse chronological)
  if (activeCategory === 'mural' && allPendingItems.length > 0) {
    allPendingItems.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Mais recentes primeiro (criados por último no topo)
    });
  }

  // Para todas as categorias, favoritos sempre ficam no topo
  if (allPendingItems.length > 0) {
    allPendingItems.sort((a, b) => {
      // Favoritos primeiro
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // Se ambos são favoritos ou nenhum é favorito, ordenar por data de criação
      // Mais recentes primeiro (criados por último no topo)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  // Aplicar paginação - mostrar apenas itens até a página atual
  const page = currentPage[activeCategory];
  const maxItems = page * ITEMS_PER_PAGE;
  const pendingItems = allPendingItems.slice(0, maxItems);
  const doneItems = allDoneItems.slice(0, maxItems);

  const hasMorePending = allPendingItems.length > maxItems;
  const hasMoreDone = allDoneItems.length > maxItems;

  const loadMoreItems = () => {
    setCurrentPage(prev => ({
      ...prev,
      [activeCategory]: prev[activeCategory] + 1,
    }));
  };

  const handleSwipe = (offset: number) => {
    const currentIndex = categories.findIndex(cat => cat.id === activeCategory);
    const newIndex = currentIndex + offset;

    if (newIndex >= 0 && newIndex < categories.length) {
      setActiveCategory(categories[newIndex].id);
    }
  };

  const handleCategoryChange = (categoryId: Category) => {
    setActiveCategory(categoryId);
    setShowSearch(false);
    // Resetar página quando trocar de categoria se ainda não foi carregada
    if (!loadedCategories.has(categoryId)) {
      setCurrentPage(prev => ({ ...prev, [categoryId]: 1 }));
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col font-['Quicksand',sans-serif] relative"
      style={{
        maxWidth: 390,
        margin: '0 auto'
      }}
    >

      {/* Top Lace Decoration */}
      <div className="absolute top-0 left-0 right-0 w-full flex items-start justify-center pointer-events-none z-10">
        <img
          src={topLaceDecoration}
          alt=""
          className="w-full h-auto object-contain opacity-40"
          style={{ maxWidth: '100%' }}
        />
      </div>

      {/* Background Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: `url(${grainTexture})`,
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto'
        }}
      />

      {/* Notification Permission Banner */}
      <NotificationPermissionBanner />
      
      {/* Header */}
      <header className="bg-transparent pt-16 pb-4 px-6 relative">
        {/* Decorative illustration */}
        <div className="absolute top-10 left-0 right-0 w-full h-[100px] flex items-center justify-center pointer-events-none">
          <img 
            src={headerDecoration} 
            alt="" 
            className="w-full max-w-[600px] h-auto object-contain opacity-60"
          />
        </div>

        <div 
          className="relative text-center mb-4 select-none cursor-pointer"
          onTouchStart={handleHeaderPressStart}
          onTouchEnd={handleHeaderPressEnd}
          onTouchCancel={handleHeaderPressEnd}
          onMouseDown={handleHeaderPressStart}
          onMouseUp={handleHeaderPressEnd}
          onMouseLeave={handleHeaderPressEnd}
        >
          <h1 className="font-['Quicksand',sans-serif] text-[#2B2A28] tracking-tight leading-tight">
            <div className="font-normal text-[20px] mb-1">- Mesinha -</div>
            <div className="font-bold text-[28px]">Amanda & Mateus</div>
          </h1>
          
          {/* Progress indicator */}
          {headerPressProgress > 0 && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${headerPressProgress}%` }}
              />
            </div>
          )}
        </div>
      </header>

      {/* List Content */}
      <main 
        className="flex-1 pb-24"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Category Card */}
        <div className="bg-[#F8F6F4] rounded-[32px] border-2 border-[#E9E4DF] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[21px] mb-6 relative mx-6">
          {/* Label Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E9E4DF] rounded-full px-4 py-1 flex items-center gap-2">
            <img 
              src={showSearch ? categoryIcons.search : categoryIcons[activeCategory]} 
              alt="" 
              className="w-5 h-5 object-contain"
            />
            <span className="font-['Quicksand',sans-serif] font-bold text-xs text-[#2B2A28] uppercase tracking-tight">
              {showSearch ? 'Buscar' : categories.find(c => c.id === activeCategory)?.label}
            </span>
          </div>

          {/* Category Icons Grid */}
          <div className="grid grid-cols-6 gap-4 pt-4">
            {categories.map(category => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id && !showSearch;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`transition-colors ${
                    isActive ? 'text-[#4D989B]' : 'text-[#2B2A28]'
                  }`}>
                    <Icon className="w-[20px] h-[20px]" strokeWidth={1.5} />
                  </div>
                </button>
              );
            })}

            {/* Search Icon */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex flex-col items-center gap-1"
            >
              <div className={`transition-colors ${
                showSearch ? 'text-[#4D989B]' : 'text-[#2B2A28]'
              }`}>
                <Search className="w-[20px] h-[20px]" strokeWidth={1.5} />
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-base font-medium text-destructive mb-1">Erro de Conexão</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  loadItems();
                }}
                className="px-3 py-1.5 text-sm font-medium bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-12 text-muted-foreground px-6">Carregando...</div>
        ) : showSearch ? (
          <SearchContent
            items={items}
            expandedItemId={expandedItemId}
            onToggleExpand={setExpandedItemId}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onMarkAsDone={handleMarkAsDone}
            onMarkAsPending={handleMarkAsPending}
          />
        ) : (
          <div className="px-6">
            {/* Pending Items */}
            <div className={activeCategory === 'mural' ? '' : 'space-y-2'}>
              {activeCategory === 'mural' ? (
                <>
                  {pendingItems.length === 0 ? (
                    <EmptyState category={activeCategory} />
                  ) : (
                    <>
                      {/* Primeiro item do mural - largura total */}
                      <div className="mb-4">
                        <MuralItemComponent
                          key={pendingItems[0].id}
                          item={pendingItems[0]}
                          onDelete={() => handleDeleteItem(pendingItems[0].id)}
                          currentUser={userProfile}
                          onMarkViewed={() => handleMarkViewed(pendingItems[0].id)}
                          onToggleLike={() => handleToggleLike(pendingItems[0].id)}
                          isHeroItem={true}
                        />
                      </div>

                      {/* Demais itens em grid 2 colunas */}
                      {pendingItems.length > 1 && (
                        <div className="grid grid-cols-2 gap-4">
                          {pendingItems.slice(1).map(item => (
                            <MuralItemComponent
                              key={item.id}
                              item={item}
                              onDelete={() => handleDeleteItem(item.id)}
                              currentUser={userProfile}
                              onMarkViewed={() => handleMarkViewed(item.id)}
                              onToggleLike={() => handleToggleLike(item.id)}
                              isHeroItem={false}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : pendingItems.length === 0 ? (
                <EmptyState category={activeCategory} />
              ) : (
                pendingItems.map(item => (
                  activeCategory === 'top3' ? (
                    <Top3ItemComponent
                      key={item.id}
                      item={item}
                      onUpdate={(updatedItem) => handleUpdateItem(item.id, updatedItem)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ) : (
                    <ListItemComponent
                      key={item.id}
                      item={item}
                      isExpanded={expandedItemId === item.id}
                      onToggleExpand={() => setExpandedItemId(
                        expandedItemId === item.id ? null : item.id
                      )}
                      onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                      onDelete={() => handleDeleteItem(item.id)}
                      onMarkAsDone={() => handleMarkAsDone(item.id)}
                      onMarkAsPending={() => handleMarkAsPending(item.id)}
                      allItems={items}
                    />
                  )
                ))
              )}
            </div>

            {/* Botão Carregar Mais - Pending Items */}
            {hasMorePending && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMoreItems}
                  className="px-6 py-2 bg-[#F8F6F4] border-2 border-[#E9E4DF] rounded-full font-['Quicksand',sans-serif] font-bold text-sm text-[#2B2A28] hover:bg-[#E9E4DF] transition-colors"
                >
                  Carregar mais ({allPendingItems.length - pendingItems.length} restantes)
                </button>
              </div>
            )}

            {/* Done Section - não mostrar para categoria alarm, top3 e mural */}
            {doneItems.length > 0 && activeCategory !== 'alarm' && activeCategory !== 'top3' && activeCategory !== 'mural' && (
              <div className="mt-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="px-4 py-1.5 bg-muted/30 rounded-full">
                    <h3 className="text-base font-normal text-muted-foreground">Feito</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  {doneItems.map(item => (
                    <ListItemComponent
                      key={item.id}
                      item={item}
                      isExpanded={expandedItemId === item.id}
                      onToggleExpand={() => setExpandedItemId(
                        expandedItemId === item.id ? null : item.id
                      )}
                      onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                      onDelete={() => handleDeleteItem(item.id)}
                      onMarkAsDone={() => {}}
                      onMarkAsPending={() => handleMarkAsPending(item.id)}
                      allItems={items}
                    />
                  ))}
                </div>

                {/* Botão Carregar Mais - Done Items */}
                {hasMoreDone && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={loadMoreItems}
                      className="px-6 py-2 bg-[#F8F6F4] border-2 border-[#E9E4DF] rounded-full font-['Quicksand',sans-serif] font-bold text-sm text-[#2B2A28] hover:bg-[#E9E4DF] transition-colors"
                    >
                      Carregar mais ({allDoneItems.length - doneItems.length} restantes)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB - escondido quando busca está ativa */}
      {!showSearch && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 w-16 h-16 z-50"
          style={{ maxWidth: 390, right: 'max(24px, calc((100vw - 390px) / 2 + 24px))' }}
        >
          <img src={fabButton} alt="Add" className="w-full h-full" />
        </motion.button>
      )}

      {/* Modals */}
      {activeCategory === 'mural' ? (
        <AddMuralModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMuralPost}
        />
      ) : (
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
          category={activeCategory}
          allItems={items}
        />
      )}

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterStatus={filterStatus}
        onApplyFilter={(status) => {
          setFilterStatus(status);
          setShowFilterModal(false);
        }}
      />
    </div>
  );
}