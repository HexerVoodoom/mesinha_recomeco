import { getSupabaseClient } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Singleton channel - um único canal compartilhado por toda a aplicação
let channelInstance: RealtimeChannel | null = null;
let isSubscribed = false;
let subscriptionPromise: Promise<void> | null = null;

export type SyncEvent = 
  | { type: 'item_created'; data: any }
  | { type: 'item_updated'; data: any }
  | { type: 'item_deleted'; data: { id: string } }
  | { type: 'settings_updated'; data: any };

type SyncCallback = (event: SyncEvent) => void;
const callbacks: Set<SyncCallback> = new Set();

// Inicializa o canal (chamado automaticamente)
function initChannel() {
  if (channelInstance && isSubscribed) {
    return channelInstance;
  }

  console.log('[RealtimeChannel] Initializing shared channel...');
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
        console.log('[RealtimeChannel] Received event:', payload.type);
        
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
        console.log('[RealtimeChannel] Subscription status:', status);
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
  console.log('[RealtimeChannel] New subscriber registered');
  callbacks.add(callback);
  
  // Inicializa o canal se ainda não foi feito
  if (!channelInstance) {
    initChannel();
  }

  // Retorna função de cleanup
  return () => {
    console.log('[RealtimeChannel] Subscriber unregistered');
    callbacks.delete(callback);
    
    // Se não houver mais callbacks, desconectar
    if (callbacks.size === 0 && channelInstance) {
      console.log('[RealtimeChannel] No more subscribers, unsubscribing...');
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
    console.log('[RealtimeChannel] Waiting for subscription before broadcasting...');
    await subscriptionPromise;
  }
  
  try {
    // Usar o método send() que aguarda a conexão WebSocket estar pronta
    await channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: event,
    });
    
    console.log('[RealtimeChannel] Broadcast sent:', event.type);
  } catch (error) {
    console.error('[RealtimeChannel] Failed to broadcast:', error);
  }
}