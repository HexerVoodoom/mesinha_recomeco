import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, Calendar, Search, Download, Heart } from 'lucide-react';
import { api, Settings as SettingsType } from '../utils/api';
import { syncApi } from '../utils/syncApi';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { toast } from 'sonner';
import { WidgetPhrasesEditor } from '../components/WidgetPhrasesEditor';

// URL fixa: sempre baixa o APK da GitHub Release mais recente (gerada
// automaticamente pelo workflow "Build & Publish Release AAB" a cada merge
// em main que mexe em android/**). Funciona tanto no navegador quanto dentro
// do app nativo (a WebView já sabe lidar com o download, ver MainActivity.kt).
const LATEST_APK_URL = 'https://github.com/HexerVoodoom/mesinha_recomeco/releases/latest/download/app-release.apk';

// Dias completos desde a data (YYYY-MM-DD), no fuso local.
function daysTogether(since: string): number {
  const [y, m, d] = since.split('-').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatBrDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function Settings() {
  const navigate = useNavigate();
  const userProfile = (localStorage.getItem('userProfile') === 'Amanda' ? 'Amanda' : 'Mateus') as 'Amanda' | 'Mateus';
  const [settings, setSettings] = useState<SettingsType>({
    coupleName: 'Você & Partner',
    themeColor: '#81D8D0',
    notificationsEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  // Realtime Sync para configurações
  useRealtimeSync({
    onSync: (event) => {
      if (event.type === 'settings_updated') {
        setSettings(event.data);
        toast.info('Configurações atualizadas pelo parceiro! 💕');
      }
    },
    enabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  // Calculate days remaining from start date (March 29, 2026)
  useEffect(() => {
    const calculateDays = () => {
      // Start date: March 29, 2026 (500 days countdown)
      const startDate = new Date('2026-03-29T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - startDate.getTime();
      const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const remaining = 500 - daysPassed;

      setDaysRemaining(remaining);
    };

    calculateDays();

    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    // Set timer to update at midnight
    const midnightTimer = setTimeout(() => {
      calculateDays();
      // Set interval for subsequent days
      const dailyInterval = setInterval(calculateDays, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimer);
  }, []);

  const loadSettings = async () => {
    try {
      const fetchedSettings = await api.getSettings();
      setSettings(fetchedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Falha ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<SettingsType>) => {
    setSaving(true);
    try {
      const updatedSettings = await syncApi.updateSettings({ ...settings, ...updates });
      setSettings(updatedSettings);
      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ maxWidth: 390, margin: '0 auto' }}>
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-medium">Configurações</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-muted"></div>
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 space-y-6">
          {/* Couple Name Header */}
          <div className="text-center py-6">
            <div className="text-5xl mb-2">💕</div>
            <h2 className="text-2xl font-medium text-foreground">Amanda & Mateus</h2>
            <p className="text-base text-muted-foreground mt-1">Juntos compartilhando tudo</p>
          </div>

          {/* Days Counter */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">Dias restantes</div>
                <div className="text-3xl font-bold text-primary mb-2">{daysRemaining}</div>
                <div className="text-xs text-muted-foreground">Início: 29 de março de 2026</div>
              </div>
            </div>
          </div>

          {/* Juntos há X dias — contador vivo a partir da data configurada */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
            <div className="flex items-start gap-3">
              <Heart className="w-6 h-6 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">Juntos há</div>
                {settings.togetherSince ? (
                  <>
                    <div className="text-3xl font-bold text-primary mb-2">
                      {daysTogether(settings.togetherSince)} dias
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      Desde {formatBrDate(settings.togetherSince)} 💗
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground mb-3">
                    Configura a data de vocês pra ver o contador
                  </div>
                )}
                <input
                  type="date"
                  value={settings.togetherSince || ''}
                  onChange={(e) => handleSave({ togetherSince: e.target.value || null })}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Baixar a versão mais recente do app (APK direto, sem Play Store) */}
          <a
            href={LATEST_APK_URL}
            className="w-full bg-card rounded-xl p-6 border border-border flex items-center gap-3 hover:bg-muted/30 transition-colors"
          >
            <Download className="w-6 h-6" />
            <div className="flex-1 text-left">
              <div className="text-base font-medium">Baixar versão mais recente</div>
              <div className="text-sm text-muted-foreground">Instala o APK mais atual direto no celular</div>
            </div>
          </a>

          {/* Busca: movida para cá, dentro do menu oculto */}
          <button
            onClick={() => navigate('/', { state: { openSearch: true } })}
            className="w-full bg-card rounded-xl p-6 border border-border flex items-center gap-3 hover:bg-muted/30 transition-colors"
          >
            <Search className="w-6 h-6" />
            <div className="flex-1 text-left">
              <div className="text-base font-medium">Buscar</div>
              <div className="text-sm text-muted-foreground">Procurar itens por tag</div>
            </div>
          </button>

          {/* Notifications */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6" />
                <div>
                  <div className="text-base font-medium">Notificações</div>
                  <div className="text-sm text-muted-foreground">Receber lembretes e atualizações</div>
                </div>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => handleSave({ notificationsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-muted peer-checked:bg-primary rounded-full transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
              </label>
            </div>
          </div>

          {/* Editor de falas do widget (cada um edita o seu personagem) */}
          <WidgetPhrasesEditor profile={userProfile} />

        </div>
      )}
    </div>
  );
}
