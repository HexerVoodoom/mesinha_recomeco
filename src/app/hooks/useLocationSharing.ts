import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, LocationMeta, LocationMode, LocationShare } from '../utils/api';
import { syncApi } from '../utils/syncApi';
import { useRealtimeSync } from './useRealtimeSync';

type Profile = 'Amanda' | 'Mateus';
type LocationsState = Record<Profile, LocationShare | null>;

/** Duração do modo "temporario" (o botão de 1h). */
const SHARE_DURATION_MS = 60 * 60 * 1000;

/**
 * Cadência adaptativa — é daqui que sai quase toda a economia de bateria do
 * modo "sempre". Mandar posição de alta precisão a cada 12s o dia inteiro come
 * 20–35% de bateria por dia; com estes três degraus, fica em 5–8%:
 *
 *   - PARADO: a pessoa não saiu do lugar desde o último envio. 1 posição/min,
 *     e sem GPS de alta precisão (torre/Wi-Fi já resolve "está em casa").
 *   - EM MOVIMENTO: andou mais que `MOVED_THRESHOLD_M`. 1 posição a cada 15s.
 *   - SENDO OBSERVADO: o outro está com a aba Mapa aberta agora. Aí sim vale o
 *     GPS caro, a cada 8s — mas só durante esses minutos.
 */
const INTERVAL_PARADO_MS = 60000;
const INTERVAL_MOVIMENTO_MS = 15000;
const INTERVAL_OBSERVADO_MS = 8000;
const MOVED_THRESHOLD_M = 30;

/** De quanto em quanto tempo renovamos o "estou olhando o mapa" no servidor. */
const WATCH_PING_MS = 60000;

/** Distância aproximada em metros entre dois pontos (equirretangular, basta aqui). */
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x = toRad(b.lng - a.lng) * Math.cos(toRad((a.lat + b.lat) / 2));
  const y = toRad(b.lat - a.lat);
  return Math.sqrt(x * x + y * y) * R;
}

/** Nível de bateria (0–1), quando o navegador expõe. Vai junto com a posição. */
async function readBattery(): Promise<number | null> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    if (!nav.getBattery) return null;
    const battery = await nav.getBattery();
    return typeof battery.level === 'number' ? battery.level : null;
  } catch (_) {
    return null;
  }
}

/**
 * Ponte com o app Android nativo. Quando o PWA roda dentro da WebView do app
 * (`window.MesinhaNative`), o modo "sempre" é entregue a um serviço em primeiro
 * plano nativo, que continua mandando posição com o app fechado e a tela
 * apagada — coisa que `watchPosition` no navegador não faz. Fora do app, o
 * modo "sempre" ainda funciona, mas só enquanto o Mesinha está aberto na frente.
 */
interface MesinhaNativeBridge {
  startAlwaysSharing?: (profile: string) => void;
  stopAlwaysSharing?: () => void;
  isAlwaysSharing?: () => boolean;
}

function nativeBridge(): MesinhaNativeBridge | null {
  const bridge = (window as unknown as { MesinhaNative?: MesinhaNativeBridge }).MesinhaNative;
  return bridge && typeof bridge.startAlwaysSharing === 'function' ? bridge : null;
}

export function hasNativeAlwaysOn(): boolean {
  return nativeBridge() !== null;
}

/**
 * Compartilhamento de localização (aba "Mapa"). Fica montado no nível da Home
 * (não dentro da tela do mapa) para que o `watchPosition` continue rodando
 * mesmo se a pessoa trocar de categoria dentro do app.
 *
 * Dois modos: "temporario" (1h, o botão antigo) e "sempre", que não expira.
 */
export function useLocationSharing(userProfile: Profile) {
  const [locations, setLocations] = useState<LocationsState>({ Amanda: null, Mateus: null });
  const watchIdRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const lastSentPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const partnerWatchingRef = useRef(false);
  const highAccuracyRef = useRef(true);
  // Guardado em ref para o callback do `watchPosition` (criado uma vez) ler
  // sempre o valor atual em vez do capturado no momento do registro.
  const modeRef = useRef<LocationMode>('temporario');

  useEffect(() => {
    api.getLocations().then(res => {
      setLocations({ Amanda: res.Amanda, Mateus: res.Mateus });
      const mine = res[userProfile];
      if (mine?.mode === 'sempre') modeRef.current = 'sempre';
    }).catch(() => {});
  }, [userProfile]);

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
    nativeBridge()?.stopAlwaysSharing?.();
    modeRef.current = 'temporario';
    setLocations(prev => ({ ...prev, [userProfile]: null }));
    try {
      await syncApi.stopLocationShare(userProfile);
    } catch (_) {
      // Já paramos localmente. No modo "temporario" a sessão expira sozinha em 1h;
      // no "sempre" a próxima abertura do app reconcilia o estado.
    }
  }, [userProfile]);

  /** Intervalo mínimo entre envios, conforme movimento e se o outro está olhando. */
  const currentIntervalMs = (pos: { lat: number; lng: number }): number => {
    if (partnerWatchingRef.current) return INTERVAL_OBSERVADO_MS;
    const last = lastSentPosRef.current;
    if (!last) return INTERVAL_MOVIMENTO_MS;
    return distanceMeters(last, pos) >= MOVED_THRESHOLD_M
      ? INTERVAL_MOVIMENTO_MS
      : INTERVAL_PARADO_MS;
  };

  /**
   * (Re)registra o `watchPosition`. O `enableHighAccuracy` não dá pra mudar em
   * um watch já criado, então trocar de degrau exige recriar — o que só
   * acontece quando o estado realmente muda (parado ⇄ movimento/observado).
   */
  const startWatch = useCallback((highAccuracy: boolean) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    highAccuracyRef.current = highAccuracy;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (now - lastSentAtRef.current < currentIntervalMs(pos)) return;
        lastSentAtRef.current = now;

        readBattery().then(battery => {
          const meta: LocationMeta = { accuracy: p.coords.accuracy ?? null, battery };
          syncApi.updateLocation(userProfile, pos.lat, pos.lng, meta)
            .then(({ location, partnerWatching }) => {
              lastSentPosRef.current = pos;
              partnerWatchingRef.current = partnerWatching;
              setLocations(prev => ({ ...prev, [userProfile]: location }));

              // Precisão alta só quando alguém está olhando ou a pessoa está
              // se deslocando; parada em casa, torre/Wi-Fi já basta.
              const querAltaPrecisao =
                partnerWatching || currentIntervalMs(pos) !== INTERVAL_PARADO_MS;
              if (querAltaPrecisao !== highAccuracyRef.current) {
                startWatch(querAltaPrecisao);
              }
            })
            .catch(() => {
              // Sessão pode ter expirado no servidor; no modo "temporario" o
              // timeout local abaixo para tudo de qualquer jeito.
            });
        });
      },
      (err) => console.error('[useLocationSharing] watchPosition error:', err),
      { enableHighAccuracy: highAccuracy, maximumAge: highAccuracy ? 10000 : 60000, timeout: 20000 }
    );
  }, [userProfile]);

  const startSharing = useCallback((mode: LocationMode = 'temporario') => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não é suportada nesse navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const battery = await readBattery();
          const location = await syncApi.startLocationShare(
            userProfile,
            pos.coords.latitude,
            pos.coords.longitude,
            mode,
            { accuracy: pos.coords.accuracy ?? null, battery },
          );
          modeRef.current = mode;
          setLocations(prev => ({ ...prev, [userProfile]: location }));
          lastSentAtRef.current = Date.now();
          lastSentPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };

          if (mode === 'sempre') {
            const bridge = nativeBridge();
            if (bridge) {
              // O serviço nativo assume daqui: continua com o app fechado.
              bridge.startAlwaysSharing?.(userProfile);
              toast.success('Localização ligada! Agora fica sempre disponível 📍');
            } else {
              toast.success('Localização ligada! Enquanto o Mesinha estiver aberto 📍');
            }
          } else {
            toast.success('Compartilhando sua localização por 1h! 📍');
          }

          startWatch(true);

          if (mode === 'temporario') {
            stopTimeoutRef.current = window.setTimeout(() => {
              stopSharing();
              toast.info('Compartilhamento de localização encerrado (1h).');
            }, SHARE_DURATION_MS);
          }
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
      { enableHighAccuracy: true, timeout: 20000 }
    );
  }, [userProfile, stopSharing, startWatch]);

  // Só limpa de verdade quando o app inteiro desmonta (não a cada troca de aba).
  useEffect(() => () => clearWatch(), []);

  const myShare = locations[userProfile];
  const isSharing = !!myShare && (myShare.expiresAt == null || new Date(myShare.expiresAt).getTime() > Date.now());
  const shareMode: LocationMode = myShare?.mode ?? modeRef.current;

  return { locations, isSharing, shareMode, myShare, startSharing, stopSharing };
}

/**
 * Enquanto a tela do Mapa está aberta e visível, avisa o servidor. O aparelho
 * do outro lê esse sinal e sobe a cadência do GPS só nesses minutos.
 */
export function useLocationWatchPing(userProfile: Profile, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      api.pingLocationWatching(userProfile).catch(() => {});
    };

    ping();
    const id = window.setInterval(ping, WATCH_PING_MS);
    document.addEventListener('visibilitychange', ping);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', ping);
    };
  }, [userProfile, enabled]);
}
