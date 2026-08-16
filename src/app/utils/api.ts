import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-19717bce`;

// Campos específicos do Calendário de Encontros (categoria "meetup")
export type MeetupPeriod = 'manha' | 'tarde' | 'noite';
export type MeetupType = 'coracao' | 'videogame' | 'pegadas';

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
  muralThumbnail?: string; // Miniatura leve (imagem), incluída na listagem para preview sem precisar tocar
  viewedBy?: string[]; // Lista de usuários que visualizaram o post
  likedBy?: string[]; // Lista de usuários que curtiram o post
  reactions?: Record<string, string>; // Reação com emoji por usuário (ex: { Amanda: '😂' }); reagir implica curtir
  caption?: string; // Texto/legenda para posts de imagem do mural
  // Campos específicos do Calendário de Encontros (categoria meetup)
  meetupPeriod?: MeetupPeriod; // período do dia (manhã/tarde/noite)
  meetupType?: MeetupType; // o que vão fazer (juntos em casa / video game cada um em casa / sair)
  // Cápsula do Tempo (categoria capsule): true enquanto o servidor esconde o
  // conteúdo (a data de abertura em eventDate ainda não chegou)
  capsuleLocked?: boolean;
  // Check-in de humor (categoria mood)
  moodEmoji?: string;
  // Tarefas de casa (categoria chore)
  choreAssignee?: 'Amanda' | 'Mateus';
  choreRotates?: boolean; // ao concluir, passa a vez pro outro
  choreDoneCount?: number;
  choreLastDoneBy?: string;
  choreLastDoneAt?: string;
}

// Pergunta do Dia — o servidor esconde a resposta do outro (com o sentinel
// '__HIDDEN__') até os dois responderem.
export interface QuestionOfTheDay {
  id: string;
  question: string;
  date: string;
  revealed: boolean;
  answerAmanda: string | null;
  answerMateus: string | null;
}

export const HIDDEN_ANSWER = '__HIDDEN__';

// Jogos: baralho de cartas escrito por vocês (+ as padrão de reserva)
export type CardType = 'verdade' | 'desafio' | 'prefere';
export type CardDeck = Record<CardType, string[]>;

// Jardim: sequência, progresso e retrospectiva, tudo derivado dos itens
export interface GardenStats {
  date: string;
  totalItems: number;
  streak: { current: number; longest: number; frozen: boolean };
  level: number;
  nextLevelAt: number;
  itemsCounted: number;
  activeDays: number;
  byCategory: Record<string, number>;
  byPerson: Record<string, number>;
  thisYear: {
    year: string;
    total: number;
    byMonth: Record<string, number>;
    busiestMonth: { month: string; count: number } | null;
  };
}

// Compartilhamento de localização em tempo real (aba "Mapa")
export interface LocationShare {
  profile: 'Amanda' | 'Mateus';
  lat: number;
  lng: number;
  updatedAt: string;
  expiresAt: string; // sessão de 1h a partir do início do compartilhamento
}

export interface Settings {
  coupleName: string;
  themeColor: string;
  notificationsEnabled: boolean;
  // Data de início do relacionamento (YYYY-MM-DD) — alimenta o contador "juntos há X dias"
  togetherSince?: string | null;
}

// Memória do "Neste dia" — post do mural desta mesma data em anos anteriores
export interface OnThisDayMemory {
  id: string;
  title?: string | null;
  caption?: string | null;
  comment?: string | null;
  createdBy: string;
  createdAt: string;
  muralContentType?: 'text' | 'image' | 'video' | 'audio' | null;
  muralThumbnail?: string | null;
  muralContent?: string | null; // preenchido só para posts de texto
  yearsAgo: number;
}

export const fetchAPI = async (endpoint: string, options: RequestInit = {}, retries = 2): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60 seconds for large responses

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...options.headers as Record<string, string>,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
    });

    clearTimeout(timeoutId);

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
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    params.set('offset', offset.toString());
    params.set('limit', limit.toString());
    params.set('_t', Date.now().toString());

    const data = await fetchAPI(`/items?${params.toString()}`);
    return {
      items: data.items,
      total: data.total,
      hasMore: data.hasMore
    };
  },

  getItemFull: async (id: string): Promise<ListItem> => {
    try {
      const data = await fetchAPI(`/items/${id}/full`);
      return data.item;
    } catch (error) {
      console.error(`Failed to load full item ${id}:`, error);
      throw error;
    }
  },

  getItemPhoto: async (id: string): Promise<string | null> => {
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
    const data = await fetchAPI('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return data.item;
  },

  updateItem: async (id: string, updates: Partial<ListItem>): Promise<ListItem> => {
    const data = await fetchAPI(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.item;
  },

  deleteItem: async (id: string): Promise<void> => {
    await fetchAPI(`/items/${id}`, {
      method: 'DELETE',
    });
  },

  // Settings
  getSettings: async (): Promise<Settings> => {
    const data = await fetchAPI('/settings');
    return data.settings;
  },

  updateSettings: async (settings: Partial<Settings>): Promise<Settings> => {
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

  // Falas dos widgets (Corvinho/Alpaquinha). Editáveis pelo app, lidas pelo widget nativo.
  getWidgetPhrases: async (): Promise<{ dupla: any[]; amanda: string[]; mateus: string[] }> => {
    return await fetchAPI('/widget-phrases');
  },

  updateWidgetPhrases: async (
    list: 'amanda' | 'mateus',
    phrases: string[],
    profile: 'Amanda' | 'Mateus'
  ): Promise<{ success: boolean; count: number }> => {
    return await fetchAPI(`/widget-phrases/${list}`, {
      method: 'PUT',
      body: JSON.stringify({ phrases, profile }),
    });
  },

  // Compartilhamento de localização em tempo real (aba "Mapa")
  startLocationShare: async (profile: 'Amanda' | 'Mateus', lat: number, lng: number): Promise<{ location: LocationShare }> => {
    return await fetchAPI('/location/start', {
      method: 'POST',
      body: JSON.stringify({ profile, lat, lng }),
    });
  },

  updateLocation: async (profile: 'Amanda' | 'Mateus', lat: number, lng: number): Promise<{ location: LocationShare }> => {
    return await fetchAPI('/location', {
      method: 'PUT',
      body: JSON.stringify({ profile, lat, lng }),
    });
  },

  stopLocationShare: async (profile: 'Amanda' | 'Mateus'): Promise<void> => {
    await fetchAPI('/location', {
      method: 'DELETE',
      body: JSON.stringify({ profile }),
    });
  },

  getLocations: async (): Promise<{ Amanda: LocationShare | null; Mateus: LocationShare | null }> => {
    return await fetchAPI('/location');
  },

  // Cutucada: push imediato pro outro. O servidor aplica rate limit (429 com
  // mensagem amigável se cutucar de novo rápido demais).
  sendNudge: async (from: 'Amanda' | 'Mateus', message?: string): Promise<{ success: boolean; to: string }> => {
    return await fetchAPI('/nudge', {
      method: 'POST',
      body: JSON.stringify({ from, message }),
    });
  },

  // "Neste dia": posts do mural desta mesma data em anos anteriores (cacheado por dia no servidor)
  getOnThisDay: async (): Promise<{ date: string; memories: OnThisDayMemory[] }> => {
    return await fetchAPI('/memories/on-this-day');
  },

  // Pergunta do Dia
  getQuestionOfTheDay: async (profile: 'Amanda' | 'Mateus'): Promise<QuestionOfTheDay> => {
    return await fetchAPI(`/question-of-the-day?profile=${profile}&_t=${Date.now()}`);
  },

  answerQuestionOfTheDay: async (profile: 'Amanda' | 'Mateus', answer: string): Promise<QuestionOfTheDay> => {
    return await fetchAPI('/question-of-the-day/answer', {
      method: 'POST',
      body: JSON.stringify({ profile, answer }),
    });
  },

  getQuestionBank: async (): Promise<{ questions: string[]; pending: number; defaultsCount: number }> => {
    return await fetchAPI('/question-bank');
  },

  addQuestionToBank: async (profile: 'Amanda' | 'Mateus', question: string): Promise<{ success: boolean; count: number }> => {
    return await fetchAPI('/question-bank', {
      method: 'POST',
      body: JSON.stringify({ profile, question }),
    });
  },

  removeQuestionFromBank: async (question: string): Promise<void> => {
    await fetchAPI('/question-bank', {
      method: 'DELETE',
      body: JSON.stringify({ question }),
    });
  },

  // Jardim: sequência, nível e retrospectiva (cacheado por dia no servidor)
  getGarden: async (): Promise<GardenStats> => {
    return await fetchAPI('/garden');
  },

  // Jogos: baralho de cartas (as de vocês + as padrão)
  getCards: async (): Promise<{ custom: CardDeck; defaults: CardDeck }> => {
    return await fetchAPI('/cards');
  },

  addCard: async (profile: 'Amanda' | 'Mateus', type: CardType, text: string): Promise<{ success: boolean; count: number }> => {
    return await fetchAPI('/cards', {
      method: 'POST',
      body: JSON.stringify({ profile, type, text }),
    });
  },

  removeCard: async (type: CardType, text: string): Promise<void> => {
    await fetchAPI('/cards', {
      method: 'DELETE',
      body: JSON.stringify({ type, text }),
    });
  },
};

// Limite de caracteres por fala (deve casar com o servidor).
export const WIDGET_PHRASE_MAX_LEN = 60;
export const WIDGET_PHRASE_MAX_COUNT = 60;