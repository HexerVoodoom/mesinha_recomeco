import { api, ListItem, Settings, LocationShare, LocationMeta, LocationMode } from './api';
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

  // Localização (Mapa) com sync — broadcast imediato pro parceiro ver a
  // posição em tempo real, além do PUT persistido no servidor.
  startLocationShare: async (
    profile: 'Amanda' | 'Mateus',
    lat: number,
    lng: number,
    mode: LocationMode = 'temporario',
    meta: LocationMeta = {},
  ): Promise<LocationShare> => {
    const { location } = await api.startLocationShare(profile, lat, lng, mode, meta);
    broadcastSync({ type: 'location_updated', data: location });
    return location;
  },

  /**
   * Manda a posição nova. Devolve também se o parceiro está com o mapa aberto
   * — quem chama usa isso pra decidir a cadência do GPS (ver `useLocationSharing`).
   */
  updateLocation: async (
    profile: 'Amanda' | 'Mateus',
    lat: number,
    lng: number,
    meta: LocationMeta = {},
  ): Promise<{ location: LocationShare; partnerWatching: boolean }> => {
    const { location, partnerWatching } = await api.updateLocation(profile, lat, lng, meta);
    broadcastSync({ type: 'location_updated', data: location });
    return { location, partnerWatching: !!partnerWatching };
  },

  stopLocationShare: async (profile: 'Amanda' | 'Mateus'): Promise<void> => {
    await api.stopLocationShare(profile);
    broadcastSync({ type: 'location_stopped', data: { profile } });
  },
};
