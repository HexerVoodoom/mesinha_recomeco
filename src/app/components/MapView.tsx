import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapSkin.css';
import { MapPinned } from 'lucide-react';
import { LocationMode, LocationShare } from '../utils/api';
import { hasNativeAlwaysOn, useLocationWatchPing } from '../hooks/useLocationSharing';

type Profile = 'Amanda' | 'Mateus';

interface MapViewProps {
  userProfile: Profile;
  locations: Record<Profile, LocationShare | null>;
  isSharing: boolean;
  shareMode: LocationMode;
  myShare: LocationShare | null;
  startSharing: (mode?: LocationMode) => void;
  stopSharing: () => void;
}

const PROFILE_META: Record<Profile, { emoji: string; color: string; label: string }> = {
  Amanda: { emoji: '🦙', color: '#8B4513', label: 'Amanda' },
  Mateus: { emoji: '🐦‍⬛', color: '#1A1A1A', label: 'Mateus' },
};

/**
 * Goiânia e região metropolitana. Como a gente só circula por aqui, o mapa
 * abre e fica preso nesse retângulo: nada de arrastar até o Japão sem querer,
 * e a skin fica calibrada pra uma cidade só.
 *
 * Se alguém viajar (posição fora do retângulo), os limites são liberados
 * automaticamente — ver `boundsAtivos` abaixo. Um limite que esconde a pessoa
 * justo quando ela está longe seria o pior momento possível pra ser rígido.
 */
const GOIANIA_BOUNDS = L.latLngBounds([-16.95, -49.55], [-16.35, -48.95]);
const GOIANIA_CENTER: [number, number] = [-16.6869, -49.2648];
const ZOOM_MINIMO_GOIANIA = 11;

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

/** "agora mesmo" / "há 4 min" / "há 2h" — pra não passar posição velha como atual. */
function formatUpdated(updatedAt: string): string {
  const ms = Date.now() - new Date(updatedAt).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)} dia(s)`;
}

/** Linha de status embaixo do marcador: quando chegou e com que precisão. */
function describeShare(loc: LocationShare): string {
  const partes = [formatUpdated(loc.updatedAt)];
  if (typeof loc.accuracy === 'number') partes.push(`~${Math.round(loc.accuracy)}m`);
  if (loc.expiresAt) partes.push(formatRemaining(loc.expiresAt));
  if (typeof loc.battery === 'number') partes.push(`🔋 ${Math.round(loc.battery * 100)}%`);
  return partes.join(' · ');
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
 * Aba "Mapa": mostra os dois no mapa em tempo real. O `watchPosition` e a
 * cadência adaptativa vivem no hook `useLocationSharing`, montado na Home —
 * este componente exibe o estado, os controles e a skin.
 */
export function MapView({ userProfile, locations, isSharing, shareMode, myShare, startSharing, stopSharing }: MapViewProps) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const partnerShare = locations[partner];
  const nativoDisponivel = hasNativeAlwaysOn();

  // Enquanto esta tela está aberta, avisa o servidor — o aparelho do outro sobe
  // a cadência do GPS só nesses minutos, em vez de gastar bateria o dia todo.
  useLocationWatchPing(userProfile, true);

  // Re-render periódico só pra atualizar os textos "há X min" / "restam Xmin".
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const points = ([locations.Amanda, locations.Mateus].filter(Boolean) as LocationShare[]);

  // Se alguém está fora de Goiânia (viagem), solta os limites — senão o mapa
  // se recusaria a mostrar justamente a pessoa que está longe.
  const boundsAtivos = useMemo(
    () => points.every(p => GOIANIA_BOUNDS.contains([p.lat, p.lng])),
    [points.map(p => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`).join('|')] // eslint-disable-line react-hooks/exhaustive-deps
  );

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
            className="mesinha-map-skin"
            center={[points[0].lat, points[0].lng]}
            zoom={15}
            minZoom={boundsAtivos ? ZOOM_MINIMO_GOIANIA : undefined}
            maxBounds={boundsAtivos ? GOIANIA_BOUNDS : undefined}
            maxBoundsViscosity={1.0}
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
                    <strong>{PROFILE_META[profile].label}</strong>
                    <br />
                    {describeShare(loc)}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          // Sem ninguém no mapa ainda: mostra Goiânia mesmo assim (com a skin),
          // em vez de um retângulo cinza — dá pra ver a cara do mapa antes de ligar.
          <div className="relative h-full">
            <MapContainer
              className="mesinha-map-skin"
              center={GOIANIA_CENTER}
              zoom={ZOOM_MINIMO_GOIANIA + 1}
              minZoom={ZOOM_MINIMO_GOIANIA}
              maxBounds={GOIANIA_BOUNDS}
              maxBoundsViscosity={1.0}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </MapContainer>
            <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center text-center px-6 bg-[#F3EEE8]/75 pointer-events-none">
              <MapPinned className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Ninguém está compartilhando localização agora</p>
            </div>
          </div>
        )}
      </div>

      {isSharing ? (
        <div className="space-y-3">
          <div className="text-center text-sm text-muted-foreground">
            {shareMode === 'sempre'
              ? 'Compartilhando sempre · o outro pode te ver a qualquer hora'
              : `Compartilhando sua localização${myShare?.expiresAt ? ` · ${formatRemaining(myShare.expiresAt)}` : ''}`}
          </div>
          {shareMode === 'temporario' && (
            <button
              onClick={() => startSharing('sempre')}
              className="w-full px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              Deixar ligado sempre
            </button>
          )}
          <button
            onClick={stopSharing}
            className="w-full px-6 py-3 rounded-xl border-2 border-destructive text-destructive font-medium hover:bg-destructive/10 transition-colors"
          >
            Parar de compartilhar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => startSharing('sempre')}
            className="w-full px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            Compartilhar sempre 📍
          </button>
          <button
            onClick={() => startSharing('temporario')}
            className="w-full px-6 py-3 rounded-xl border-2 border-[#E9E4DF] text-[#2B2A28] font-medium hover:bg-muted/40 transition-colors"
          >
            Só por 1 hora
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-3">
        {shareMode === 'sempre' && isSharing
          ? nativoDisponivel
            ? 'Continua funcionando com o app fechado. Pra economizar bateria, o GPS só fica no capricho quando o outro está de olho no mapa.'
            : 'Aqui no navegador só funciona com o Mesinha aberto. Instale o app pra ficar ligado o tempo todo.'
          : 'No modo de 1h, mantenha o app aberto. Para automaticamente depois de 1h.'}
      </p>
    </div>
  );
}
