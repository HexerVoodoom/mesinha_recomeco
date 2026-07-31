import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { api, ListItem, MeetupPeriod, MeetupType } from '../utils/api';
import { syncApi } from '../utils/syncApi';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { isRealtimeConnected } from '../utils/realtimeChannel';
import { useNotifications } from '../hooks/useNotifications';
import { ListItemComponent } from '../components/ListItemComponent';
import { EmptyState } from '../components/EmptyState';
import { AddItemModal } from '../components/AddItemModal';
import { FilterModal } from '../components/FilterModal';
import { Top3ItemComponent } from '../components/Top3ItemComponent';
import { CategoryMenu, categories, type Category } from '../components/CategoryMenu';
import { MuralSection } from '../components/MuralSection';
import { AddMuralModal } from '../components/AddMuralModal';
import { SearchContent } from '../components/SearchContent';
import { MeetupCalendar } from '../components/MeetupCalendar';
import { MapView } from '../components/MapView';
import { useLocationSharing } from '../hooks/useLocationSharing';
import { NotificationPermissionBanner } from '../components/NotificationPermissionBanner';
import { toast } from 'sonner';
import fabButton from "figma:asset/dd4b98f23138814cb5d5f735480190b4a56f65a0.png";
import grainTexture from "figma:asset/870f87368b0cc75469636c24542ec183a844dabf.png";
import headerDecoration from "figma:asset/1f94cbc6275b0a35eb5a9c6c93b92d94e2251075.png";
import topLaceDecoration from "figma:asset/efb30badc4fa5c4da28d3bf6ea65d7d99aa6b99b.png";

// Chave de localStorage para itens criados localmente que ainda não foram
// confirmados na resposta de listagem do servidor.
const PENDING_KEY = 'pendingCreatedItems';

// Versão "leve" de um item para armazenar/renderizar sem estourar a cota do
// localStorage: remove o conteúdo pesado (base64 de imagem/vídeo/áudio) mas
// mantém a miniatura e o conteúdo de texto (que é pequeno), igual ao formato
// que o GET /items já retorna na listagem. O conteúdo pesado é recarregado sob
// demanda via getItemFull quando o usuário abre o post.
function toLightItem(item: ListItem): ListItem {
  const isHeavyMedia = item.muralContentType && item.muralContentType !== 'text';
  return {
    ...item,
    muralContent: isHeavyMedia ? undefined : item.muralContent,
    photo: item.photo ? 'HAS_PHOTO' : null,
  } as ListItem;
}

function saveItemsToStorage(items: ListItem[]) {
  try {
    localStorage.setItem('offlineItems', JSON.stringify(items.map(toLightItem)));
  } catch {
    localStorage.removeItem('offlineItems');
  }
}

function loadPendingFromStorage(): Map<string, ListItem> {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Map(arr.filter((i: any) => i?.id).map((i: ListItem) => [i.id, i]));
    }
  } catch (_) {}
  return new Map();
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState<Category>('mural');
  const [items, setItems] = useState<ListItem[]>([]);
  // Itens recém-criados nesta sessão que ainda podem não aparecer numa resposta
  // de listagem do servidor (por race de polling ou ordenação/paginação). Eles
  // são re-injetados em todo refresh para nunca "sumirem" da tela, e só são
  // removidos quando o servidor confirma o item ou quando ele é excluído.
  const pendingCreatedRef = useRef<Map<string, ListItem>>(loadPendingFromStorage());

  const persistPending = () => {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify([...pendingCreatedRef.current.values()]));
    } catch (_) {
      try { localStorage.removeItem(PENDING_KEY); } catch (_) {}
    }
  };

  const trackPendingItem = (item: ListItem) => {
    const pending = pendingCreatedRef.current;
    pending.set(item.id, toLightItem(item));
    // Limite de segurança: mantém só os 100 mais recentes (Map preserva ordem
    // de inserção) para o registro nunca crescer indefinidamente.
    while (pending.size > 100) {
      const oldest = pending.keys().next().value;
      if (oldest === undefined) break;
      pending.delete(oldest);
    }
    persistPending();
  };

  const untrackPendingItem = (id: string) => {
    if (pendingCreatedRef.current.delete(id)) persistPending();
  };

  // Injeta os itens pendentes que ainda não estão na lista, sem removê-los do
  // registro. Usado para exibir cache local (que não é confirmação do servidor).
  const injectPending = (list: ListItem[]): ListItem[] => {
    const pending = pendingCreatedRef.current;
    if (pending.size === 0) return list;
    const ids = new Set(list.map(i => i.id));
    const survivors = [...pending.values()].filter(p => !ids.has(p.id));
    return survivors.length ? [...survivors, ...list] : list;
  };

  // Mescla os itens pendentes com a lista vinda do SERVIDOR: remove do registro
  // os que o servidor já retornou (confirmados) e mantém visíveis os demais.
  // Só deve ser chamado com uma resposta real do servidor.
  const confirmAndMergePending = (serverItems: ListItem[]): ListItem[] => {
    const pending = pendingCreatedRef.current;
    if (pending.size === 0) return serverItems;
    const serverIds = new Set(serverItems.map(i => i.id));
    let changed = false;
    for (const id of [...pending.keys()]) {
      if (serverIds.has(id)) { pending.delete(id); changed = true; }
    }
    if (changed) persistPending();
    const survivors = [...pending.values()].filter(p => !serverIds.has(p.id));
    return survivors.length ? [...survivors, ...serverItems] : serverItems;
  };

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
  const [showMeetupCalendar, setShowMeetupCalendar] = useState(false);
  const [showMap, setShowMap] = useState(false);

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

  // Recarrega itens de UMA categoria específica (até 200) e os mescla ao estado
  // mantendo todas as outras categorias intactas. Resolve o problema de posts
  // do mural sumindo quando a lista geral de 100 itens os empurra para fora
  // do limite: aqui buscamos diretamente os posts do mural, independente de
  // quantos itens de outras categorias existem.
  const refreshCategoryItems = async (category: string, retriesLeft = 1) => {
    try {
      const result = await api.getItems(category, 0, 200);
      if (!result || !Array.isArray(result.items)) return;
      setItems(prev => {
        const others = prev.filter(i => i.category !== category);
        const fresh = confirmAndMergePending(result.items);
        const merged = [...others, ...fresh];
        saveItemsToStorage(merged);
        return merged;
      });
    } catch (e) {
      // Falha transitória (ex.: cold start do backend) não pode deixar a tela
      // presa no cache antigo silenciosamente: tenta de novo uma vez.
      console.warn('[refreshCategoryItems] failed:', e);
      if (retriesLeft > 0) {
        setTimeout(() => refreshCategoryItems(category, retriesLeft - 1), 4000);
      }
    }
  };

  // Sistema de notificações
  const { updateReminders, notifyNewMuralItem } = useNotifications(userProfile);

  // Compartilhamento de localização (aba "Mapa"). Fica montado aqui (não só
  // dentro da tela do mapa) pra continuar rodando por 1h mesmo trocando de aba.
  const locationSharing = useLocationSharing(userProfile);

  // Atualizar lembretes quando os itens mudarem
  useEffect(() => {
    updateReminders(items);
  }, [items]);

  // Realtime Sync - ao receber qualquer evento, rebusca todos os itens da API
  useRealtimeSync({
    onSync: (event) => {
      // Notificar se for novo item do mural
      if (event.type === 'item_created' && event.data?.category === 'mural') {
        notifyNewMuralItem(event.data);
        toast.success('Nova publicação no Mural! 💕', { duration: 3000 });
      } else if (event.type === 'item_created' && event.data?.category === 'meetup') {
        if (event.data?.createdBy && event.data.createdBy !== userProfile) {
          toast.success(`${event.data.createdBy} propôs um dia no calendário! 💕`, { duration: 3000 });
        }
      } else if (event.type === 'item_updated' && event.data?.category === 'meetup') {
        if (event.data?.status === 'done' && event.data?.createdBy === userProfile) {
          toast.success('Seu encontro foi confirmado! 💕', { duration: 3000 });
        }
      } else if (event.type === 'item_created') {
        toast.success('Lista atualizada! 💕', { duration: 2000 });
      }
      // Sempre rebusca da API para garantir dados atualizados
      loadItems(true);
      if (event.data?.category === 'meetup') {
        refreshCategoryItems('meetup');
      }
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

  // A busca foi movida para dentro do menu oculto de configurações. Ao voltar
  // de lá com o pedido de abrir a busca, abrimos aqui e limpamos o state da
  // navegação para não reabrir em um refresh/voltar futuro.
  useEffect(() => {
    if ((location.state as any)?.openSearch) {
      setShowSearch(true);
      setShowMeetupCalendar(false);
      setShowMap(false);
      navigate('.', { replace: true, state: null });
    }
  }, [location.state]);

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      if (isActive) {
        await loadItems();
      }
    };

    init();

    // Polling de fallback a cada 30s — só executa se o WebSocket não estiver conectado
    const pollInterval = setInterval(() => {
      if (isActive && !isRealtimeConnected()) {
        loadItems(true);
      }
    }, 30000);

    const handleSyncComplete = () => {
      loadItems(true);
    };

    window.addEventListener('sync_completed', handleSyncComplete);

    return () => {
      isActive = false;
      clearInterval(pollInterval);
      window.removeEventListener('sync_completed', handleSyncComplete);
    };
  }, []);

  // Carregar dados quando uma categoria é aberta pela primeira vez.
  // Para o mural: sempre faz um refresh específico ao entrar na aba,
  // garantindo que todos os posts (até 200) estejam carregados mesmo que
  // a lista geral de 100 itens os exclua por limite de paginação.
  useEffect(() => {
    if (!loadedCategories.has(activeCategory)) {
      setLoadedCategories(prev => new Set([...prev, activeCategory]));
    }
    if (activeCategory === 'mural') {
      refreshCategoryItems('mural');
    }
  }, [activeCategory]);

  // Calendário de Encontros: garante que todos os dias propostos/confirmados
  // estejam carregados (mesmo que a paginação geral de itens os deixe de fora),
  // igual ao que já é feito para o mural.
  useEffect(() => {
    if (showMeetupCalendar) {
      refreshCategoryItems('meetup');
    }
  }, [showMeetupCalendar]);

  const loadItems = async (silent: boolean = false, categoryFilter?: string, offset = 0) => {
    // Show cached data immediately so the UI isn't blank while the API wakes up
    if (!silent && offset === 0 && items.length === 0) {
      const cached = localStorage.getItem('offlineItems');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(injectPending(parsed));
            setLoading(false);
            silent = true; // API fetch continues in background, no spinner
          }
        } catch (_) {}
      }
    }

    try {
      const result = await api.getItems(categoryFilter, offset, 100);
      if (result && Array.isArray(result.items)) {
        const fetchedItems = result.items;

        // Check if there are updates (compare with current items)
        const hasUpdates = JSON.stringify(items.map(i => ({ id: i.id, updatedAt: i.updatedAt }))) !==
                          JSON.stringify(fetchedItems.map(i => ({ id: i.id, updatedAt: i.updatedAt })));

        // If offset > 0, append to existing items; otherwise replace.
        // Em ambos os casos mesclamos os itens pendentes (recém-criados) para
        // que um refresh em background nunca apague um post que o servidor
        // ainda não retornou. Usamos o updater funcional para evitar race com
        // o setItems do create.
        if (offset > 0) {
          // "Carregar mais": páginas mais antigas. Apenas injeta pendentes
          // (não confirma com base em dados locais).
          setItems(prev => {
            const merged = injectPending([...prev, ...fetchedItems]);
            saveItemsToStorage(merged);
            return merged;
          });
        } else {
          // Refresh completo: fetchedItems é a resposta real do servidor (100 mais
          // recentes). Preserva itens do mural que já estavam em `prev` mas ficaram
          // fora dos 100 gerais (o refreshCategoryItems busca até 200 especificamente).
          setItems(prev => {
            const serverIds = new Set(fetchedItems.map(i => i.id));
            const extraMuralItems = prev.filter(i => i.category === 'mural' && !serverIds.has(i.id));
            const merged = confirmAndMergePending([...fetchedItems, ...extraMuralItems]);
            saveItemsToStorage(merged);
            return merged;
          });
        }

        // Show toast only if this is a silent update and there are changes
        if (silent && hasUpdates && items.length > 0) {
          const partnerName = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
          toast.info(`${partnerName} atualizou a lista! 💕`, { duration: 2000 });
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
      trackPendingItem(createdItem);
      setItems(prev => {
        const updated = prev.some(i => i.id === createdItem.id) ? prev : [...prev, createdItem];
        saveItemsToStorage(updated);
        return updated;
      });
      setShowAddModal(false);
      toast.success('Item adicionado com sucesso!');
    } catch (error: any) {
      console.error('Failed to create item:', error);
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('too large') || msg.toLowerCase().includes('grande')) {
        toast.error('Foto muito grande! Use uma imagem menor.');
      } else {
        toast.error('Erro ao salvar item. Tente novamente.');
      }
    }
  };

  const handleAddMuralPost = async (title: string, contentType: 'text' | 'image' | 'video' | 'audio', content: string, caption?: string, thumbnail?: string) => {
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
      muralThumbnail: thumbnail,
      caption: caption || undefined,
    };

    try {
      const createdItem = await syncApi.createItem(item);
      trackPendingItem(createdItem);
      setItems(prev => {
        const updated = prev.some(i => i.id === createdItem.id) ? prev : [...prev, createdItem];
        saveItemsToStorage(updated);
        return updated;
      });
      toast.success('Post adicionado ao mural!');
      // Recarrega todos os posts do mural especificamente para garantir que o
      // post anterior (antigo hero) não seja empurrado para fora dos 100 itens
      // gerais e desapareça do grid.
      refreshCategoryItems('mural');
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('too large') || msg.toLowerCase().includes('grande')) {
        toast.error('Imagem muito grande! Use uma foto menor ou comprima antes de enviar.');
      } else {
        toast.error('Erro ao publicar no mural. Tente novamente.');
      }
      throw error; // modal permanece aberto para o usuário tentar novamente
    }
  };

  // Propõe um dia no Calendário de Encontros (com período + tipo escolhidos
  // no modal): cria um item pendente e o servidor notifica o parceiro para
  // que ele possa confirmar.
  const handleProposeMeetupDay = async (dateStr: string, period: MeetupPeriod, type: MeetupType) => {
    const partnerName = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
    const item: ListItem = {
      id: Date.now().toString(),
      title: 'Encontro',
      comment: '',
      category: 'meetup',
      eventDate: dateStr,
      photo: null,
      reminderEnabled: false,
      createdBy: userProfile,
      createdAt: new Date().toISOString(),
      status: 'pending',
      tags: [],
      meetupPeriod: period,
      meetupType: type,
    };

    try {
      const createdItem = await syncApi.createItem(item);
      trackPendingItem(createdItem);
      setItems(prev => {
        const updated = prev.some(i => i.id === createdItem.id) ? prev : [...prev, createdItem];
        saveItemsToStorage(updated);
        return updated;
      });
      toast.success(`Proposta enviada para ${partnerName}! 💕`);
    } catch (error) {
      console.error('Failed to propose meetup day:', error);
      toast.error('Erro ao propor o encontro. Tente novamente.');
    }
  };

  // Confirma um dia proposto pelo parceiro: o encontro passa a valer para os dois.
  const handleConfirmMeetupDay = async (item: ListItem) => {
    await handleUpdateItem(item.id, { status: 'done' });
    toast.success('Encontro confirmado! 💕');
  };

  // Cancela uma proposta própria, recusa a do parceiro, ou remove um encontro já confirmado.
  const handleCancelMeetupDay = async (item: ListItem) => {
    await handleDeleteItem(item.id);
  };

  const handleUpdateItem = async (id: string, updates: Partial<ListItem>) => {
    // Snapshot do item para toast e feedback offline — não use `items` diretamente
    // dentro do try/catch assíncrono: o closure seria obsoleto se loadItems ou
    // refreshCategoryItems atualizassem o estado enquanto aguardamos a API.
    const itemSnapshot = items.find(i => i.id === id);

    try {
      const updatedItem = await syncApi.updateItem(id, updates);
      // Usa atualização funcional para sempre operar sobre o estado mais recente,
      // evitando sobrescrever muralContent que loadItems ou refreshCategoryItems
      // possam ter buscado enquanto aguardávamos o retorno da API de update.
      setItems(prev => {
        const finalItems = prev.map(i => i.id === id ? toLightItem(updatedItem) : i);
        saveItemsToStorage(finalItems);
        return finalItems;
      });
    } catch (error) {
      console.error('Failed to update item:', error);
      // Fallback offline: aplica as mudanças sobre o estado atual (não closure obsoleto)
      setItems(prev => {
        const fallback = prev.map(i =>
          i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
        );
        saveItemsToStorage(fallback);
        return fallback;
      });

      // Feedback específico para lembretes ou genérico (o Calendário de
      // Encontros mostra seu próprio toast na chamada de handleConfirmMeetupDay)
      if (itemSnapshot?.category === 'alarm' && 'reminderActive' in updates) {
        toast.info(updates.reminderActive ? 'Lembrete ativado localmente (modo offline)' : 'Lembrete desativado localmente (modo offline)');
      } else if (itemSnapshot?.category !== 'meetup') {
        toast.info('Item atualizado localmente (modo offline)');
      }
      return;
    }

    // Feedback específico para lembretes ou genérico (o Calendário de
    // Encontros mostra seu próprio toast na chamada de handleConfirmMeetupDay)
    if (itemSnapshot?.category === 'alarm' && 'reminderActive' in updates) {
      toast.success(updates.reminderActive ? 'Lembrete ativado!' : 'Lembrete desativado!');
    } else if (itemSnapshot?.category !== 'meetup') {
      toast.success('Item atualizado!');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const itemSnapshot = items.find(i => i.id === id);
    untrackPendingItem(id); // não re-injetar um item que foi excluído

    try {
      await syncApi.deleteItem(id);
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.info('Item removido localmente (modo offline)');
    }

    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      saveItemsToStorage(filtered);
      return filtered;
    });
    setExpandedItemId(null);

    if (itemSnapshot?.category === 'meetup') {
      toast.success('Encontro removido do calendário.');
    } else {
      toast.success('Item removido!');
    }
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
    setShowMeetupCalendar(false);
    setShowMap(false);
    // Resetar página quando trocar de categoria se ainda não foi carregada
    if (!loadedCategories.has(categoryId)) {
      setCurrentPage(prev => ({ ...prev, [categoryId]: 1 }));
    }
  };

  const handleToggleMeetupCalendar = () => {
    setShowSearch(false);
    setShowMap(false);
    setShowMeetupCalendar(prev => !prev);
  };

  const handleToggleMap = () => {
    setShowSearch(false);
    setShowMeetupCalendar(false);
    setShowMap(prev => !prev);
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col font-['Quicksand',sans-serif] relative isolate"
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
          backgroundSize: 'auto',
          zIndex: -1,
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
        {/* Menu de categorias */}
        <CategoryMenu
          activeCategory={activeCategory}
          showSearch={showSearch}
          showMeetupCalendar={showMeetupCalendar}
          showMap={showMap}
          onCategoryChange={handleCategoryChange}
          onOpenMeetupCalendar={handleToggleMeetupCalendar}
          onOpenMap={handleToggleMap}
        />

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
        ) : showMeetupCalendar ? (
          <MeetupCalendar
            items={items}
            userProfile={userProfile}
            onProposeDay={handleProposeMeetupDay}
            onConfirmDay={handleConfirmMeetupDay}
            onCancelDay={handleCancelMeetupDay}
          />
        ) : showMap ? (
          <MapView userProfile={userProfile} {...locationSharing} />
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
                <MuralSection
                  pendingItems={pendingItems}
                  userProfile={userProfile}
                  onDeleteItem={handleDeleteItem}
                  onMarkViewed={handleMarkViewed}
                  onToggleLike={handleToggleLike}
                />
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

      {/* FAB - escondido quando busca, calendário de encontros ou mapa está ativo */}
      {!showSearch && !showMeetupCalendar && !showMap && (
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