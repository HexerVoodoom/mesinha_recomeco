import { api, ListItem, Settings } from './api';
import { broadcastSync } from './realtimeChannel';

// API wrapper com sincronização
export const syncApi = {
  ...api,

  // Items com sync
  createItem: async (item: Partial<ListItem>): Promise<ListItem> => {
    const createdItem = await api.createItem(item);
    broadcastSync({ type: 'item_created', data: createdItem });
    return createdItem;
  },

  updateItem: async (id: string, updates: Partial<ListItem>): Promise<ListItem> => {
    const updatedItem = await api.updateItem(id, updates);
    broadcastSync({ type: 'item_updated', data: updatedItem });
    return updatedItem;
  },

  deleteItem: async (id: string): Promise<void> => {
    await api.deleteItem(id);
    broadcastSync({ type: 'item_deleted', data: { id } });
  },

  updateSettings: async (settings: Partial<Settings>): Promise<Settings> => {
    const updatedSettings = await api.updateSettings(settings);
    broadcastSync({ type: 'settings_updated', data: updatedSettings });
    return updatedSettings;
  },
};
