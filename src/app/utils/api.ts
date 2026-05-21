import { projectId, publicAnonKey } from '/utils/supabase/info';
import { syncService } from './syncService';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-19717bce`;
const USE_LOCAL_STORAGE = false; // Disable local storage to use Supabase strictly

export interface ListItem {
  id: string;
  title: string;
  comment: string;
  category: string;
  eventDate: string | null;
  photo: string | null;
  reminderEnabled: boolean;
  reminderFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  repeatCount?: number;
  createdBy: string;
  createdAt: string;
  status: 'pending' | 'done';
  updatedAt?: string;
  tags?: string[];
  isFavorite?: boolean; // Indica se o item é favorito
  // Campo para vídeos curtos (categoria watch)
  videoLink?: string; // Link do vídeo (YouTube, TikTok, etc.)
  // Campos específicos para lembretes (categoria alarm)
  reminderTime?: string; // Horário do lembrete (formato HH:mm)
  reminderDays?: string[]; // Dias da semana ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  reminderForMateus?: boolean; // Lembrete ativo para Mateus
  reminderForAmanda?: boolean; // Lembrete ativo para Amanda
  reminderActive?: boolean; // Status do lembrete (ativo/desativado)
  // Campos específicos para Top 3
  top3Mateus?: {
    position1: string;
    position2: string;
    position3: string;
  };
  top3Amanda?: {
    position1: string;
    position2: string;
    position3: string;
  };
  // Campos específicos para Mural
  muralContentType?: 'text' | 'image' | 'video' | 'audio';
  muralContent?: string;
  viewedBy?: string[]; // Lista de usuários que visualizaram o post
  likedBy?: string[]; // Lista de usuários que curtiram o post
  caption?: string; // Texto/legenda para posts de imagem do mural
}

export interface Settings {
  coupleName: string;
  themeColor: string;
  notificationsEnabled: boolean;
}

export const fetchAPI = async (endpoint: string, options: RequestInit = {}, retries = 2): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60 seconds for large responses

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...options.headers as Record<string, string>,
  };

  console.log(`[API] Making request to ${BASE_URL}${endpoint}`);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
    });

    clearTimeout(timeoutId);

    // For login endpoint, return the response data even if not ok
    // This allows us to handle error messages properly
    if (endpoint === '/login') {
      const data = await response.json();
      console.log(`[API] Login response:`, data);
      return data;
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('text/html')) {
        console.error(`Server returned HTML error page for ${endpoint}`);
        throw new Error('Servidor temporariamente indisponível. Usando modo offline.');
      }
      
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`API Error for ${endpoint}:`, error);
      
      throw new Error(error.error || 'API request failed');
    }

    const clone = response.clone();
    
    try {
      const data = await response.json();
      console.log(`[API] Success: ${endpoint}`, { size: JSON.stringify(data).length });
      return data;
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      const text = await clone.text();
      console.error('Response text:', text.substring(0, 200));
      throw new Error('Erro ao processar resposta do servidor');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Enhanced error logging
    console.error(`[API] Error on ${endpoint}:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Retry logic for connection errors
    if (retries > 0 && (
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof TypeError && error.message.includes('fetch')) ||
      (error instanceof Error && error.message.includes('connection closed'))
    )) {
      console.log(`Retrying request to ${endpoint}... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchAPI(endpoint, options, retries - 1);
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Request timeout for ${endpoint}`);
      throw new Error('Tempo limite excedido. Usando modo offline.');
    }
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error(`Network error: Cannot reach server at ${BASE_URL}${endpoint}`);
      throw new Error('Não foi possível conectar ao servidor. Usando modo offline.');
    }
    throw error;
  }
};

export const api = {
  // Authentication
  login: async (profile: 'Amanda' | 'Mateus', password: string): Promise<any> => {
    if (profile === 'Amanda' && password === 'Mateus') {
      return { success: true };
    }
    if (profile === 'Mateus' && password === 'Amanda') {
      return { success: true };
    }
    return { error: 'Invalid password' };
  },

  // Items
  getItems: async (category?: string, offset = 0, limit = 100): Promise<{ items: ListItem[], total: number, hasMore: boolean }> => {
    if (USE_LOCAL_STORAGE) {
      try {
        const items = await syncService.getItems(category);

        // Sort by creation date (most recent first)
        items.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        const total = items.length;
        const paginatedItems = items.slice(offset, offset + limit);

        return {
          items: paginatedItems,
          total,
          hasMore: offset + limit < total
        };
      } catch (error) {
        console.error('[API] Error getting items from local storage:', error);
        // Fallback to server if local fails
      }
    }

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    params.set('offset', offset.toString());
    params.set('limit', limit.toString());

    const data = await fetchAPI(`/items?${params.toString()}`);
    return {
      items: data.items,
      total: data.total,
      hasMore: data.hasMore
    };
  },

  getItemFull: async (id: string): Promise<ListItem> => {
    if (USE_LOCAL_STORAGE) {
      try {
        const item = await syncService.getItem(id);
        if (item) return item;
      } catch (error) {
        console.error('[API] Error getting item from local storage:', error);
      }
    }

    try {
      const data = await fetchAPI(`/items/${id}/full`);
      return data.item;
    } catch (error) {
      console.error(`Failed to load full item ${id}:`, error);
      throw error;
    }
  },

  getItemPhoto: async (id: string): Promise<string | null> => {
    if (USE_LOCAL_STORAGE) {
      try {
        const item = await syncService.getItem(id);
        return item?.photo || null;
      } catch (error) {
        console.error('[API] Error getting photo from local storage:', error);
      }
    }

    try {
      // Use timeout menor para fotos (10s) e permite 1 retry
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${BASE_URL}/items/${id}/photo`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.photo;
    } catch (error) {
      // Silenciosamente retorna null (sem logs)
      return null;
    }
  },

  createItem: async (item: Partial<ListItem>): Promise<ListItem> => {
    if (USE_LOCAL_STORAGE) {
      try {
        const itemId = crypto.randomUUID();
        const newItem: ListItem = {
          id: itemId,
          title: String(item.title || '').substring(0, 500),
          comment: item.comment ? String(item.comment).substring(0, 2000) : "",
          category: item.category || 'agenda',
          eventDate: item.eventDate || null,
          photo: item.photo || null,
          reminderEnabled: item.reminderEnabled || false,
          reminderFrequency: item.reminderFrequency,
          repeatCount: item.repeatCount,
          createdBy: item.createdBy || "Unknown",
          createdAt: new Date().toISOString(),
          status: item.status || "pending",
          tags: Array.isArray(item.tags) ? item.tags.slice(0, 20) : [],
          videoLink: item.videoLink,
          reminderTime: item.reminderTime,
          reminderDays: item.reminderDays,
          reminderForMateus: item.reminderForMateus,
          reminderForAmanda: item.reminderForAmanda,
          reminderActive: item.reminderActive !== undefined ? item.reminderActive : true,
          top3Mateus: item.top3Mateus,
          top3Amanda: item.top3Amanda,
          muralContentType: item.muralContentType,
          muralContent: item.muralContent,
          viewedBy: Array.isArray(item.viewedBy) ? item.viewedBy : [],
          isFavorite: item.isFavorite,
          caption: item.caption,
          likedBy: item.likedBy,
        };

        await syncService.saveItem(newItem);
        return newItem;
      } catch (error) {
        console.error('[API] Error creating item in local storage:', error);
        throw error;
      }
    }

    const data = await fetchAPI('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return data.item;
  },

  updateItem: async (id: string, updates: Partial<ListItem>): Promise<ListItem> => {
    if (USE_LOCAL_STORAGE) {
      try {
        const existingItem = await syncService.getItem(id);
        if (!existingItem) {
          throw new Error('Item not found');
        }

        const updatedItem = {
          ...existingItem,
          ...updates,
          id: id, // Ensure ID doesn't change
          updatedAt: new Date().toISOString(),
        };

        await syncService.saveItem(updatedItem);
        return updatedItem;
      } catch (error) {
        console.error('[API] Error updating item in local storage:', error);
        throw error;
      }
    }

    const data = await fetchAPI(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.item;
  },

  deleteItem: async (id: string): Promise<void> => {
    if (USE_LOCAL_STORAGE) {
      try {
        await syncService.deleteItem(id);
        return;
      } catch (error) {
        console.error('[API] Error deleting item from local storage:', error);
        throw error;
      }
    }

    await fetchAPI(`/items/${id}`, {
      method: 'DELETE',
    });
  },

  // Settings
  getSettings: async (): Promise<Settings> => {
    if (USE_LOCAL_STORAGE) {
      try {
        return await syncService.getSettings();
      } catch (error) {
        console.error('[API] Error getting settings from local storage:', error);
      }
    }

    const data = await fetchAPI('/settings');
    return data.settings;
  },

  updateSettings: async (settings: Partial<Settings>): Promise<Settings> => {
    if (USE_LOCAL_STORAGE) {
      try {
        const currentSettings = await syncService.getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        await syncService.saveSettings(updatedSettings);
        return updatedSettings;
      } catch (error) {
        console.error('[API] Error updating settings in local storage:', error);
        throw error;
      }
    }

    const data = await fetchAPI('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return data.settings;
  },

  // Backup
  exportBackup: async (): Promise<any> => {
    // Always fetch from server for backup export
    const data = await fetchAPI('/backup');
    return data;
  },

  getBackupStats: async (): Promise<{ stats: { totalItems: number; lastChecked: string } }> => {
    // Get backup statistics without downloading all data
    const data = await fetchAPI('/backup/stats');
    return data;
  },
};