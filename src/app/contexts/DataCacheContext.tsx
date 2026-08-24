import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ListItem } from '../utils/api';
import { toast } from 'sonner';

interface DataCacheContextType {
  items: ListItem[];
  loading: boolean;
  error: string | null;
  refreshItems: (silent?: boolean) => Promise<void>;
  updateItem: (id: string, updates: Partial<ListItem>) => void;
  addItem: (item: ListItem) => void;
  deleteItem: (id: string) => void;
  lastFetch: number | null;
}

const DataCacheContext = createContext<DataCacheContextType | null>(null);

const CACHE_DURATION = 30000; // 30 segundos - cache curto para manter sincronizado
const CACHE_KEY = 'mesinha_data_cache';
const CACHE_TIMESTAMP_KEY = 'mesinha_cache_timestamp';

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  // Carrega do cache ao inicializar
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const age = Date.now() - timestamp;
          
          // Se o cache é recente (menos de 30s), usa ele imediatamente
          if (age < CACHE_DURATION) {
            const parsedItems = JSON.parse(cachedData);
            setItems(parsedItems);
            setLastFetch(timestamp);
            setLoading(false);
            console.log('[DataCache] Loaded from cache (age:', Math.round(age / 1000), 's)');
            
            // Ainda faz uma requisição silenciosa para atualizar
            refreshItems(true);
            return;
          }
        }
      } catch (err) {
        console.error('[DataCache] Error loading from cache:', err);
      }
      
      // Se não tem cache ou está expirado, carrega normalmente
      refreshItems(false);
    };

    loadFromCache();
  }, []);

  const refreshItems = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      const fetchedItems = await api.getItems();
      
      if (Array.isArray(fetchedItems)) {
        const now = Date.now();
        
        // Detecta mudanças
        const hasChanges = JSON.stringify(items.map(i => ({ id: i.id, updatedAt: i.updatedAt }))) !== 
                          JSON.stringify(fetchedItems.map(i => ({ id: i.id, updatedAt: i.updatedAt })));
        
        setItems(fetchedItems);
        setLastFetch(now);
        setError(null);
        
        // Salva no cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(fetchedItems));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
        } catch (err) {
          console.error('[DataCache] Error saving to cache:', err);
        }
        
        // Mostra toast apenas se for atualização silenciosa e houver mudanças
        if (silent && hasChanges && items.length > 0) {
          const userProfile = localStorage.getItem('userProfile');
          const partnerName = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
          toast.info(`${partnerName} atualizou a lista! 💕`, { duration: 2000 });
        }
        
        console.log('[DataCache] Items refreshed:', fetchedItems.length, 'items (silent:', silent, ')');
      }
    } catch (err) {
      console.error('[DataCache] Error refreshing items:', err);
      setError('Erro ao carregar dados');
      
      // Se falhar e não for silencioso, mostra erro
      if (!silent) {
        toast.error('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
    }
  }, [items]);

  // O localStorage é gravado a partir da lista NOVA calculada dentro do
  // setItems. Gravar a partir do `items` capturado pelo callback usava uma
  // lista velha: duas ações seguidas (adicionar dois itens, curtir e comentar)
  // salvavam por cima uma da outra e o cache voltava com o estado anterior no
  // próximo reload.
  const persistCache = (novaLista: ListItem[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(novaLista));
    } catch (err) {
      console.error('[DataCache] Error updating cache:', err);
    }
    return novaLista;
  };

  // Atualiza um item no cache local imediatamente (optimistic update)
  const updateItem = useCallback((id: string, updates: Partial<ListItem>) => {
    setItems(prev => persistCache(prev.map(item =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    )));
  }, []);

  // Adiciona um item no cache local imediatamente
  const addItem = useCallback((item: ListItem) => {
    setItems(prev => {
      // Evita duplicatas
      if (prev.some(i => i.id === item.id)) return prev;
      return persistCache([...prev, item]);
    });
  }, []);

  // Remove um item no cache local imediatamente
  const deleteItem = useCallback((id: string) => {
    setItems(prev => persistCache(prev.filter(item => item.id !== id)));
  }, []);

  const value = {
    items,
    loading,
    error,
    refreshItems,
    updateItem,
    addItem,
    deleteItem,
    lastFetch,
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
}
