import { useEffect } from 'react';
import { subscribeToSync, SyncEvent } from '../utils/realtimeChannel';

interface UseRealtimeSyncOptions {
  onSync: (event: SyncEvent) => void;
  enabled?: boolean;
}

export function useRealtimeSync({ onSync, enabled = true }: UseRealtimeSyncOptions) {
  useEffect(() => {
    if (!enabled) return;

    console.log('[useRealtimeSync] Setting up sync listener...');
    
    // Registra callback no canal compartilhado
    const unsubscribe = subscribeToSync(onSync);

    // Cleanup ao desmontar
    return () => {
      console.log('[useRealtimeSync] Cleaning up sync listener...');
      unsubscribe();
    };
  }, [onSync, enabled]);
}

export type { SyncEvent };
