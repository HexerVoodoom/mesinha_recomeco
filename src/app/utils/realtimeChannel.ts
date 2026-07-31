import { getSupabaseClient } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Singleton channel - um único canal compartilhado por toda a aplicação
let channelInstance: RealtimeChannel | null = null;
let isSubscribed = false;
let subscriptionPromise: Promise<void> | null = null;

export function isRealtimeConnected(): boolean {
  return isSubscribed;
}

export type SyncEvent =
  | { type: 'item_created'; data: any }
  | { type: 'item_updated'; data: any }
  | { type: 'item_deleted'; data: { id: string } }
  | { type: 'settings_updated'; data: any }
  | { type: 'location_updated'; data: import('./api').LocationShare }
  | { type: 'location_stopped'; data: { profile: 'Amanda' | 'Mateus' } };

type SyncCallback = (event: SyncEvent) => void;
const callbacks: Set<SyncCallback> = new Set();

// Inicializa o canal (chamado automaticamente)
function initChannel() {
  if (channelInstance && isSubscribed) {
    return channelInstance;
  }

  const supabase = getSupabaseClient();
  
  channelInstance = supabase.channel('shared-couple-lists', {
    config: {
      broadcast: { ack: false, self: false }
    }
  });
  
  // Criar promise de subscrição
  subscriptionPromise = new Promise((resolve) => {
    channelInstance!
      .on('broadcast', { event: 'sync' }, ({ payload }) => {
        // Notificar todos os callbacks registrados
        callbacks.forEach(callback => {
          try {
            callback(payload as SyncEvent);
          } catch (error) {
            console.error('[RealtimeChannel] Error in callback:', error);
          }
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          resolve();
        }
      });
  });

  return channelInstance;
}

// Registra um callback para receber eventos
export function subscribeToSync(callback: SyncCallback): () => void {
  callbacks.add(callback);
  
  // Inicializa o canal se ainda não foi feito
  if (!channelInstance) {
    initChannel();
  }

  // Retorna função de cleanup
  return () => {
    callbacks.delete(callback);

    if (callbacks.size === 0 && channelInstance) {
      channelInstance.unsubscribe();
      channelInstance = null;
      isSubscribed = false;
      subscriptionPromise = null;
    }
  };
}

// Envia um evento para todos os clientes conectados
export async function broadcastSync(event: SyncEvent): Promise<void> {
  const channel = initChannel();
  
  // Aguardar até que o canal esteja subscrito antes de enviar
  if (subscriptionPromise && !isSubscribed) {
    await subscriptionPromise;
  }
  
  try {
    // Usar o método send() que aguarda a conexão WebSocket estar pronta
    await channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: event,
    });
    
  } catch (error) {
    console.error('[RealtimeChannel] Failed to broadcast:', error);
  }
}