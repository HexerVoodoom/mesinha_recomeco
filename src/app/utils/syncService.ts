// Sync service to manage local storage and Cloudflare Sync
import { localDB } from './localDB';
import { toast } from 'sonner';

export type SyncMode = 'local-only' | 'cloudflare-sync' | 'local-with-drive';

// Essa URL deve ser substituída pela URL do Cloudflare Worker no futuro
const CLOUDFLARE_WORKER_URL = 'https://mesinha-sync.your-worker.workers.dev';

class SyncService {
  private syncMode: SyncMode = 'cloudflare-sync';
  private autoBackupInterval: number | null = null;
  private lastBackupTime: number = 0;
  private lastSyncTime: number = 0;
  private isSyncing: boolean = false;

  constructor() {
    const storedMode = localStorage.getItem('sync_mode') as SyncMode;
    if (storedMode) {
      this.syncMode = storedMode;
    } else {
      localStorage.setItem('sync_mode', 'cloudflare-sync');
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
        item.createdAt = new Date().toISOString();
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
      } else if (this.syncMode === 'local-with-drive') {
        this.performBackup().catch(err =>
          console.log('[SyncService] Background drive sync skipped:', err.message)
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
      this.syncWithCloudflare(false).catch(err => {
        console.log('[SyncService] Auto-sync skipped:', err.message);
      });
    }, intervalMinutes * 60 * 1000);

    this.syncWithCloudflare(false).catch(err => {
      console.log('[SyncService] Initial sync skipped:', err.message);
    });
  }

  stopAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
  }

  // Cloudflare Synchronization Strategy
  // "checar se há update e baixar somente o conteudo novo"
  async syncWithCloudflare(showToast: boolean = false): Promise<void> {
    if (this.isSyncing || this.syncMode !== 'cloudflare-sync') return;
    this.isSyncing = true;

    try {
      if (showToast) toast.loading('Sincronizando...', { id: 'sync' });

      const localItems = await localDB.getAllItems();
      const payload = {
        lastSync: this.lastSyncTime,
        items: localItems // Para um sistema real em Cloudflare, enviaremos apenas os itens atualizados
      };

      // Simulação da chamada para o Cloudflare
      // const response = await fetch(`${CLOUDFLARE_WORKER_URL}/sync`, {
      //   method: 'POST',
      //   body: JSON.stringify(payload)
      // });
      // const cloudData = await response.json();
      
      // Simular que Cloudflare retornou dados vazios (nada novo)
      const cloudData = { items: [] };

      // Lógica de merge (baixar somente o conteudo novo)
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

  // Google Drive Synchronization Strategy
  async performBackup(): Promise<void> {
    if (this.syncMode !== 'local-with-drive') return;
    
    try {
      const backupData = await localDB.exportData();
      await import('./googleDriveBackup').then(m => m.googleDriveBackup.uploadBackup(backupData));
      
      this.lastBackupTime = Date.now();
      localStorage.setItem('last_backup_time', this.lastBackupTime.toString());
      console.log('[SyncService] Backup manual concluído com sucesso');
    } catch (error) {
      console.error('[SyncService] Erro no backup manual:', error);
      throw error;
    }
  }

  async restoreFromGoogleDrive(): Promise<void> {
    try {
      toast.loading('Baixando backup do Google Drive...', { id: 'restore' });
      const backupData = await import('./googleDriveBackup').then(m => m.googleDriveBackup.downloadBackup());
      
      if (!backupData) {
        toast.error('Nenhum backup encontrado no Google Drive', { id: 'restore' });
        return;
      }

      await localDB.importData(backupData);
      toast.success('Backup restaurado com sucesso!', { id: 'restore' });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('[SyncService] Error restoring backup:', error);
      toast.error('Falha ao restaurar backup', { id: 'restore' });
      throw error;
    }
  }

  async syncWithGoogleDrive(showToast: boolean = false): Promise<void> {
    if (this.isSyncing || this.syncMode !== 'local-with-drive') return;
    this.isSyncing = true;

    try {
      if (showToast) toast.loading('Sincronizando com Google Drive...', { id: 'sync' });
      
      const backupData = await localDB.exportData();
      await import('./googleDriveBackup').then(m => m.googleDriveBackup.uploadBackup(backupData));
      
      this.lastBackupTime = Date.now();
      localStorage.setItem('last_backup_time', this.lastBackupTime.toString());
      
      if (showToast) toast.success('Sincronizado!', { id: 'sync' });
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      if (showToast) toast.error('Erro ao sincronizar', { id: 'sync' });
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncService = new SyncService();
