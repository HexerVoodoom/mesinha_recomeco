import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, LocationShare } from '../utils/api';
import { syncApi } from '../utils/syncApi';
import { useRealtimeSync } from './useRealtimeSync';

type Profile = 'Amanda' | 'Mateus';
type LocationsState = Record<Profile, LocationShare | null>;

const SHARE_DURATION_MS = 60 * 60 * 1000; // 1 hora
const UPDATE_THROTTLE_MS = 12000; // não manda posição nova mais que 1x a cada ~12s

/**
 * Compartilhamento de localização em tempo real (aba "Mapa"). Fica montado no
 * nível da Home (não dentro da tela do mapa) para que o `watchPosition`
 * continue rodando mesmo se a pessoa trocar de categoria dentro do app — a
 * ideia é compartilhar por 1h corrido, não só enquanto a aba Mapa está aberta.
 */
export function useLocationSharing(userProfile: Profile) {
  const [locations, setLocations] = useState<LocationsState>({ Amanda: null, Mateus: null });
  const watchIdRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);

  useEffect(() => {
    api.getLocations().then(setLocations).catch(() => {});
  }, []);

  useRealtimeSync({
    onSync: (event) => {
      if (event.type === 'location_updated') {
        setLocations(prev => ({ ...prev, [event.data.profile]: event.data }));
      } else if (event.type === 'location_stopped') {
        setLocations(prev => ({ ...prev, [event.data.profile]: null }));
      }
    },
    enabled: true,
  });

  const clearWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (stopTimeoutRef.current !== null) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  };

  const stopSharing = useCallback(async () => {
    clearWatch();
    setLocations(prev => ({ ...prev, [userProfile]: null }));
    try {
      await syncApi.stopLocationShare(userProfile);
    } catch (_) {
      // já paramos localmente; se o servidor não confirmar, a sessão expira sozinha em 1h
    }
  }, [userProfile]);

  const startSharing = useCallback(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não é suportada nesse navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const location = await syncApi.startLocationShare(userProfile, pos.coords.latitude, pos.coords.longitude);
          setLocations(prev => ({ ...prev, [userProfile]: location }));
          lastSentAtRef.current = Date.now();
          toast.success('Compartilhando sua localização por 1h! 📍');

          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => {
              const now = Date.now();
              if (now - lastSentAtRef.current < UPDATE_THROTTLE_MS) return;
              lastSentAtRef.current = now;
              syncApi.updateLocation(userProfile, p.coords.latitude, p.coords.longitude)
                .then(loc => setLocations(prev => ({ ...prev, [userProfile]: loc })))
                .catch(() => {
                  // Sessão pode ter expirado no servidor; o timeout local abaixo cuida de parar.
                });
            },
            (err) => console.error('[useLocationSharing] watchPosition error:', err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
          );

          stopTimeoutRef.current = window.setTimeout(() => {
            stopSharing();
            toast.info('Compartilhamento de localização encerrado (1h).');
          }, SHARE_DURATION_MS);
        } catch (_) {
          toast.error('Erro ao iniciar compartilhamento de localização.');
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Permissão de localização negada.');
        } else {
          toast.error('Não foi possível obter sua localização.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [userProfile, stopSharing]);

  // Só limpa de verdade quando o app inteiro desmonta (não a cada troca de aba).
  useEffect(() => () => clearWatch(), []);

  const myShare = locations[userProfile];
  const isSharing = !!myShare && new Date(myShare.expiresAt).getTime() > Date.now();

  return { locations, isSharing, myShare, startSharing, stopSharing };
}
