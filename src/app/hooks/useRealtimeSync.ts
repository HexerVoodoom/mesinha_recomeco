import { useEffect, useRef } from 'react';
import { subscribeToSync, SyncEvent } from '../utils/realtimeChannel';

interface UseRealtimeSyncOptions {
  onSync: (event: SyncEvent) => void;
  enabled?: boolean;
}

export function useRealtimeSync({ onSync, enabled = true }: UseRealtimeSyncOptions) {
  // Use ref to always call the latest onSync without re-subscribing
  const onSyncRef = useRef(onSync);
  useEffect(() => {
    onSyncRef.current = onSync;
  });

  useEffect(() => {
    if (!enabled) return;

    console.log('[useRealtimeSync] Setting up sync listener...');

    // Wrap in stable function that always calls latest ref
    const stableHandler = (event: SyncEvent) => onSyncRef.current(event);
    const unsubscribe = subscribeToSync(stableHandler);

    return () => {
      console.log('[useRealtimeSync] Cleaning up sync listener...');
      unsubscribe();
    };
  }, [enabled]); // Only re-subscribe if enabled changes
}

export type { SyncEvent };
