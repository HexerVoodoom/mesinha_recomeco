import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinned } from 'lucide-react';
import { LocationShare } from '../utils/api';

type Profile = 'Amanda' | 'Mateus';

interface MapViewProps {
  userProfile: Profile;
  locations: Record<Profile, LocationShare | null>;
  isSharing: boolean;
  myShare: LocationShare | null;
  startSharing: () => void;
  stopSharing: () => void;
}

const PROFILE_META: Record<Profile, { emoji: string; color: string; label: string }> = {
  Amanda: { emoji: '🦙', color: '#8B4513', label: 'Amanda' },
  Mateus: { emoji: '🐦‍⬛', color: '#1A1A1A', label: 'Mateus' },
};

const FALLBACK_CENTER: [number, number] = [-23.5505, -46.6333]; // São Paulo, só usado sem nenhum ponto ainda

function makeIcon(profile: Profile) {
  const meta = PROFILE_META[profile];
  return L.divIcon({
    className: '',
    html: `<div style="width:40px;height:40px;border-radius:50%;background:${meta.color};display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${meta.emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

function formatRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expirando...';
  const min = Math.ceil(ms / 60000);
  return `${min} min restantes`;
}

/** Enquadra os dois marcadores (ou centraliza no único disponível) sempre que a posição muda. */
function FitBounds({ points }: { points: LocationShare[] }) {
  const map = useMap();
  const key = points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');

  useEffect(() => {
    if (points.length === 2) {
      map.fitBounds(
        [[points[0].lat, points[0].lng], [points[1].lat, points[1].lng]],
        { padding: [48, 48] }
      );
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

/**
 * Aba "Mapa": mostra os dois no mapa em tempo real enquanto o compartilhamento
 * de localização (1h) estiver ativo. O `watchPosition`/timer de 1h vive no
 * hook `useLocationSharing`, montado na Home — esse componente só exibe o
 * estado e os controles de iniciar/parar.
 */
export function MapView({ userProfile, locations, isSharing, myShare, startSharing, stopSharing }: MapViewProps) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const partnerShare = locations[partner];

  // Re-render periódico só pra atualizar o texto "restam Xmin".
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const points = ([locations.Amanda, locations.Mateus].filter(Boolean) as LocationShare[]);

  return (
    <div className="px-6 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <MapPinned className="w-5 h-5 text-primary" strokeWidth={1.5} />
        <h2 className="font-['Quicksand',sans-serif] font-bold text-lg text-[#2B2A28]">Mapa</h2>
      </div>

      {partnerShare && !isSharing && (
        <div className="mb-4 bg-primary/10 border-2 border-primary/30 rounded-2xl p-4">
          <p className="text-sm text-[#2B2A28]">
            {PROFILE_META[partner].label} está compartilhando a localização! Compartilhe a sua também pra se verem no mapa.
          </p>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border-2 border-[#E9E4DF] mb-4" style={{ height: 320 }}>
        {points.length > 0 ? (
          <MapContainer
            center={[points[0].lat, points[0].lng]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />
            {(['Amanda', 'Mateus'] as Profile[]).map(profile => {
              const loc = locations[profile];
              if (!loc) return null;
              return (
                <Marker key={profile} position={[loc.lat, loc.lng]} icon={makeIcon(profile)}>
                  <Popup>
                    {PROFILE_META[profile].label} · {formatRemaining(loc.expiresAt)}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 bg-muted/20">
            <MapPinned className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Ninguém está compartilhando localização agora</p>
          </div>
        )}
      </div>

      {isSharing ? (
        <div className="space-y-3">
          <div className="text-center text-sm text-muted-foreground">
            Compartilhando sua localização{myShare ? ` · ${formatRemaining(myShare.expiresAt)}` : ''}
          </div>
          <button
            onClick={stopSharing}
            className="w-full px-6 py-3 rounded-xl border-2 border-destructive text-destructive font-medium hover:bg-destructive/10 transition-colors"
          >
            Parar de compartilhar
          </button>
        </div>
      ) : (
        <button
          onClick={startSharing}
          className="w-full px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
        >
          Compartilhar minha localização por 1h
        </button>
      )}

      <p className="text-xs text-muted-foreground text-center mt-3">
        Mantenha o app aberto pra continuar compartilhando. Para automaticamente depois de 1h.
      </p>
    </div>
  );
}
