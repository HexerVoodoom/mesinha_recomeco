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

    const stableHandler = (event: SyncEvent) => onSyncRef.current(event);
    const unsubscribe = subscribeToSync(stableHandler);

    return () => {
      unsubscribe();
    };
  }, [enabled]); // Only re-subscribe if enabled changes
}

export type { SyncEvent };
