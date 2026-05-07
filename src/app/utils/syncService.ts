import { localDB } from './localDB';
import { toast } from 'sonner';

export type SyncMode = 'local-only' | 'cloudflare-sync' | 'supabase-sync';

const CLOUDFLARE_WORKER_URL = 'https://mesinha-sync.your-worker.workers.dev';

class SyncService {
  private syncMode: SyncMode = 'supabase-sync';
  private autoBackupInterval: number | null = null;
  private lastBackupTime: number = 0;
  private lastSyncTime: number = 0;
  private isSyncing: boolean = false;

  constructor() {
    const storedMode = localStorage.getItem('sync_mode') as SyncMode;
    if (storedMode) {
      this.syncMode = storedMode;
    } else {
      localStorage.setItem('sync_mode', 'supabase-sync');
      this.syncMode = 'supabase-sync';
    }

    const lastBackup = localStorage.getItem('last_backup_time');
    if (lastBackup) this.lastBackupTime = parseInt(lastBackup, 10);

    const lastSync = localStorage.getItem('last_sync_time');
    if (lastSync) this.lastSyncTime = parseInt(lastSync, 10);
  }

  getSyncMode(): SyncMode {
    return this.syncMode;
  }

  setSyncMode(mode: SyncMode): void {
    this.syncMode = mode;
    localStorage.setItem('sync_mode', mode);
    if (this.autoBackupInterval) {
      this.stopAutoBackup();
      this.startAutoBackup();
    }
  }

  getLastBackupTime(): number {
    return this.lastBackupTime;
  }

  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  async saveItem(item: any): Promise<void> {
    try {
      item.updatedAt = new Date().toISOString();
      if (!item.createdAt) {
        item.createdAt = new Date(0).toISOString();
      }

      await localDB.saveItem(item);
      console.log('[SyncService] Item saved locally:', item.id);

      if (this.syncMode !== 'local-only') {
        this.debouncedBackup();
      }
    } catch (error) {
      console.error('[SyncService] Error saving item:', error);
      throw error;
    }
  }

  private backupTimeout: number | null = null;

  private debouncedBackup(): void {
    if (this.backupTimeout) clearTimeout(this.backupTimeout);
    this.backupTimeout = window.setTimeout(() => {
      if (this.syncMode === 'cloudflare-sync') {
        this.syncWithCloudflare(false).catch(err =>
          console.log('[SyncService] Background sync skipped:', err.message)
        );
      } else if (this.syncMode === 'supabase-sync') {
        this.syncWithSupabase(false).catch(err =>
          console.log('[SyncService] Background supabase sync skipped:', err.message)
        );
      }
    }, 2000);
  }

  async deleteItem(id: string): Promise<void> {
    try {
      await localDB.deleteItem(id);
      if (this.syncMode !== 'local-only') {
        this.debouncedBackup();
      }
    } catch (error) {
      throw error;
    }
  }

  async getItems(category?: string): Promise<any[]> {
    try {
      if (category) return await localDB.getItemsByCategory(category);
      return await localDB.getAllItems();
    } catch (error) {
      return [];
    }
  }

  async getItem(id: string): Promise<any | null> {
    try {
      return await localDB.getItem(id);
    } catch (error) {
      return null;
    }
  }

  async saveSettings(settings: any): Promise<void> {
    try {
      await localDB.saveSettings(settings);
      if (this.syncMode !== 'local-only') {
        this.debouncedBackup();
      }
    } catch (error) {
      throw error;
    }
  }

  async getSettings(): Promise<any> {
    try {
      return await localDB.getSettings() || {
        coupleName: "Amanda & Mateus",
        themeColor: "#81D8D0",
        notificationsEnabled: true,
      };
    } catch (error) {
      return {
        coupleName: "Amanda & Mateus",
        themeColor: "#81D8D0",
        notificationsEnabled: true,
      };
    }
  }

  startAutoBackup(intervalMinutes: number = 5): void {
    this.stopAutoBackup();
    if (this.syncMode === 'local-only') return;

    this.autoBackupInterval = window.setInterval(() => {
      if (this.syncMode === 'cloudflare-sync') {
        this.syncWithCloudflare(false).catch(err => {
          console.log('[SyncService] Auto-sync skipped:', err.message);
        });
      } else if (this.syncMode === 'supabase-sync') {
        this.syncWithSupabase(false).catch(err => {
          console.log('[SyncService] Auto-sync skipped:', err.message);
        });
      }
    }, intervalMinutes * 60 * 1000);

    if (this.syncMode === 'cloudflare-sync') {
      this.syncWithCloudflare(false).catch(err => {
        console.log('[SyncService] Initial sync skipped:', err.message);
      });
    } else if (this.syncMode === 'supabase-sync') {
      this.syncWithSupabase(false).catch(err => {
        console.log('[SyncService] Initial sync skipped:', err.message);
      });
    }
  }

  stopAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
  }

  async syncWithCloudflare(showToast: boolean = false): Promise<void> {
    if (this.isSyncing || this.syncMode !== 'cloudflare-sync') return;
    this.isSyncing = true;

    try {
      if (showToast) toast.loading('Sincronizando com Cloudflare...', { id: 'sync' });

      const localItems = await localDB.getAllItems();
      const cloudData = { items: [] as any[] };

      let itemsChanged = false;
      const localItemsMap = new Map(localItems.map(item => [item.id, item]));

      for (const cloudItem of cloudData.items) {
        const localItem = localItemsMap.get(cloudItem.id);
        if (!localItem) {
          await localDB.saveItem(cloudItem);
          itemsChanged = true;
        } else {
          const localTime = new Date(localItem.updatedAt || localItem.createdAt).getTime();
          const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt).getTime();

          if (cloudTime > localTime) {
            await localDB.saveItem(cloudItem);
            itemsChanged = true;
          }
        }
      }

      this.lastSyncTime = Date.now();
      localStorage.setItem('last_sync_time', this.lastSyncTime.toString());

      if (showToast) toast.success('Sincronizado!', { id: 'sync' });
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      if (showToast) toast.error('Erro ao sincronizar', { id: 'sync' });
    } finally {
      this.isSyncing = false;
    }
  }

  async syncWithSupabase(showToast: boolean = false): Promise<void> {
    if (this.isSyncing || this.syncMode !== 'supabase-sync') return;
    this.isSyncing = true;

    try {
      if (showToast) toast.loading('Sincronizando com Supabase...', { id: 'sync-supabase' });
      
      const { api, fetchAPI } = await import('./api');
      
      // 1. Fetch remote data to merge down
      const backupData = await api.exportBackup().catch(err => {
         console.warn('Failed to fetch remote backup, continuing with push only', err);
         return null;
      });

      const localItems = await localDB.getAllItems();
      const localItemsMap = new Map(localItems.map(item => [item.id, item]));
      const remoteItemsMap = new Map<string, any>();
      
      let itemsChangedLocally = false;

      if (backupData && backupData.data) {
        // Merge remote items to local
        if (backupData.data.items && Array.isArray(backupData.data.items)) {
          for (const cloudItem of backupData.data.items) {
            remoteItemsMap.set(cloudItem.id, cloudItem);
            const localItem = localItemsMap.get(cloudItem.id);
            if (!localItem) {
              await localDB.saveItem(cloudItem);
              localItemsMap.set(cloudItem.id, cloudItem); // Update map
              itemsChangedLocally = true;
            } else {
              const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
              const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
    
              if (cloudTime > localTime) {
                await localDB.saveItem(cloudItem);
                localItemsMap.set(cloudItem.id, cloudItem); // Update map
                itemsChangedLocally = true;
              }
            }
          }
        }

        // Merge remote settings
        if (backupData.data.settings) {
          const localSettings = await localDB.getSettings();
          const localTime = new Date(localSettings?.updatedAt || 0).getTime();
          const cloudTime = new Date(backupData.data.settings.updatedAt || 0).getTime();
          
          if (!localSettings || cloudTime > localTime) {
            await localDB.saveSettings(backupData.data.settings);
          }
        }
      }

      // 2. Push local data to remote
      const itemsToPush = [];
      for (const localItem of localItemsMap.values()) {
        const remoteItem = remoteItemsMap.get(localItem.id);
        if (!remoteItem) {
          // It's a new local item
          itemsToPush.push(fetchAPI('/items', {
            method: 'POST',
            body: JSON.stringify(localItem),
          }));
        } else {
          // Compare dates
          const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
          const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();
          
          if (localTime > remoteTime) {
            itemsToPush.push(fetchAPI(`/items/${localItem.id}`, {
              method: 'PUT',
              body: JSON.stringify(localItem),
            }));
          }
        }
      }

      if (itemsToPush.length > 0) {
        await Promise.allSettled(itemsToPush);
      }

      this.lastSyncTime = Date.now();
      localStorage.setItem('last_sync_time', this.lastSyncTime.toString());
      
      if (showToast) toast.success('Sincronizado!', { id: 'sync-supabase' });
      
      if (itemsChangedLocally && !showToast) {
        // If background sync updated items, we might need to refresh UI
        // Trigger a custom event for React components to listen to
        window.dispatchEvent(new CustomEvent('sync_completed'));
      }
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      if (showToast) toast.error('Erro ao sincronizar', { id: 'sync-supabase' });
    } finally {
      this.isSyncing = false;
    }
  }

  // Export/Import Local
  async exportLocalBackup(): Promise<Blob> {
    const backupData = await localDB.exportData();
    const json = JSON.stringify(backupData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async importLocalBackup(file: File): Promise<void> {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      await localDB.importData(backupData);
      toast.success('Backup importado com sucesso!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Erro ao importar backup');
      throw error;
    }
  }
}

export const syncService = new SyncService();
