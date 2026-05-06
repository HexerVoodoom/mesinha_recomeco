// IndexedDB wrapper for local storage
const DB_NAME = 'CoupleAppDB';
const DB_VERSION = 1;
const ITEMS_STORE = 'items';
const SETTINGS_STORE = 'settings';

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private initAttempted = false;

  async init(): Promise<void> {
    try {
      await this.openDatabase();
      this.initAttempted = true;
    } catch (error) {
      console.error('[LocalDB] Database init failed, attempting recovery:', error);

      // Try to recover by deleting and recreating the database
      try {
        await this.resetDatabase();
        await this.openDatabase();
        this.initAttempted = true;
        console.log('[LocalDB] Database recovered successfully');
      } catch (recoveryError) {
        console.error('[LocalDB] Database recovery failed:', recoveryError);
        throw new Error('Failed to initialize database. Please clear browser data and refresh.');
      }
    }
  }

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[LocalDB] Database open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Add error handler for the database connection
        this.db.onerror = (event) => {
          console.error('[LocalDB] Database error:', event);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create items store
        if (!db.objectStoreNames.contains(ITEMS_STORE)) {
          const itemsStore = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
          itemsStore.createIndex('category', 'category', { unique: false });
          itemsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  async resetDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close existing connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      console.log('[LocalDB] Deleting corrupted database');
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

      deleteRequest.onsuccess = () => {
        console.log('[LocalDB] Database deleted successfully');
        resolve();
      };

      deleteRequest.onerror = () => {
        console.error('[LocalDB] Failed to delete database:', deleteRequest.error);
        reject(deleteRequest.error);
      };

      deleteRequest.onblocked = () => {
        console.warn('[LocalDB] Database deletion blocked');
        // Try to resolve anyway, the next open might work
        setTimeout(resolve, 100);
      };
    });
  }

  async getAllItems(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ITEMS_STORE], 'readonly');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        try {
          const result = request.result;
          // Validate result is an array
          if (Array.isArray(result)) {
            resolve(result);
          } else {
            console.warn('[LocalDB] getAllItems returned non-array, returning empty array');
            resolve([]);
          }
        } catch (error) {
          console.error('[LocalDB] Error processing getAllItems result:', error);
          resolve([]);
        }
      };
      request.onerror = () => {
        console.error('[LocalDB] getAllItems error:', request.error);
        reject(request.error);
      };
    });
  }

  async getItemsByCategory(category: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ITEMS_STORE], 'readonly');
      const store = transaction.objectStore(ITEMS_STORE);
      const index = store.index('category');
      const request = index.getAll(category);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getItem(id: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ITEMS_STORE], 'readonly');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveItem(item: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ITEMS_STORE], 'readwrite');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteItem(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ITEMS_STORE], 'readwrite');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSettings(): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('app-settings');

      request.onsuccess = () => {
        try {
          const result = request.result;
          resolve(result ? result.value : null);
        } catch (error) {
          console.error('[LocalDB] Error processing getSettings result:', error);
          resolve(null);
        }
      };
      request.onerror = () => {
        console.error('[LocalDB] getSettings error:', request.error);
        reject(request.error);
      };
    });
  }

  async saveSettings(settings: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.put({ key: 'app-settings', value: settings });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ITEMS_STORE, SETTINGS_STORE], 'readwrite');

      const itemsClear = transaction.objectStore(ITEMS_STORE).clear();
      const settingsClear = transaction.objectStore(SETTINGS_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async exportData(): Promise<any> {
    const items = await this.getAllItems();
    const settings = await this.getSettings();

    return {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      data: {
        settings: settings || {
          coupleName: "You & Partner",
          themeColor: "#81D8D0",
          notificationsEnabled: true,
        },
        items: items || [],
      },
      stats: {
        totalItems: items?.length || 0,
      }
    };
  }

  async importData(backup: any): Promise<void> {
    if (!backup || !backup.data) {
      throw new Error('Invalid backup format');
    }

    // Clear existing data
    await this.clear();

    // Import settings
    if (backup.data.settings) {
      await this.saveSettings(backup.data.settings);
    }

    // Import items
    if (backup.data.items && Array.isArray(backup.data.items)) {
      for (const item of backup.data.items) {
        await this.saveItem(item);
      }
    }
  }

  async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      if (!this.db) {
        await this.init();
      }

      // Try to read data
      await this.getAllItems();
      await this.getSettings();

      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async forceReset(): Promise<void> {
    console.log('[LocalDB] Force reset requested');
    await this.resetDatabase();
    await this.openDatabase();
    console.log('[LocalDB] Database force reset completed');
  }
}

export const localDB = new LocalDatabase();
