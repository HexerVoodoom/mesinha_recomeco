import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, Download, Upload, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { api, Settings as SettingsType, ListItem } from '../utils/api';
import { syncApi } from '../utils/syncApi';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { toast } from 'sonner';
import { BackupSettings } from '../components/BackupSettings';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsType>({
    coupleName: 'Você & Partner',
    themeColor: '#81D8D0',
    notificationsEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [showAdvancedBackup, setShowAdvancedBackup] = useState(false);

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

  const handleExportBackup = async () => {
    try {
      toast.loading('Gerando backup...', { id: 'backup' });
      
      const backupData = await api.exportBackup();
      
      // Create a blob and download it
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      link.download = `mesinha-backup-${date}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Backup exportado! ${backupData.stats.totalItems} itens salvos.`, { id: 'backup' });
    } catch (error) {
      console.error('Failed to export backup:', error);
      toast.error('Falha ao exportar backup', { id: 'backup' });
    }
  };

  const handleImportBackup = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Importando backup...', { id: 'import' });
      
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      // Validate backup structure
      if (!backupData.data || !backupData.data.items || !backupData.data.settings) {
        throw new Error('Formato de backup inválido');
      }

      // Import settings
      if (backupData.data.settings) {
        await syncApi.updateSettings(backupData.data.settings);
        setSettings(backupData.data.settings);
      }

      // Import items
      if (backupData.data.items && Array.isArray(backupData.data.items)) {
        // Delete all existing items first
        const existingItems = await api.getItems();
        for (const item of existingItems) {
          await syncApi.deleteItem(item.id);
        }

        // Create all items from backup
        for (const item of backupData.data.items) {
          await syncApi.createItem(item);
        }
      }

      toast.success(`Backup importado! ${backupData.data.items.length} itens restaurados.`, { id: 'import' });
      
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (error) {
      console.error('Failed to import backup:', error);
      toast.error('Falha ao importar backup. Verifique o arquivo.', { id: 'import' });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

          {/* Backup Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-2">Backup de Dados</h3>

            {/* Export Backup */}
            <button 
              onClick={handleExportBackup}
              className="w-full bg-card rounded-xl p-6 border border-border hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Download className="w-6 h-6" />
                <div>
                  <div className="text-base font-medium">Salvar Backup</div>
                  <div className="text-sm text-muted-foreground">Exportar todos os dados</div>
                </div>
              </div>
            </button>

            {/* Import Backup */}
            <button 
              onClick={handleImportBackup}
              className="w-full bg-card rounded-xl p-6 border border-border hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6" />
                <div>
                  <div className="text-base font-medium">Carregar Backup</div>
                  <div className="text-sm text-muted-foreground">Restaurar dados salvos</div>
                </div>
              </div>
            </button>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Advanced Backup Settings */}
          <div className="space-y-3">
            <button
              onClick={() => setShowAdvancedBackup(!showAdvancedBackup)}
              className="w-full bg-card rounded-xl p-4 border border-border hover:bg-muted/30 transition-colors flex items-center justify-between"
            >
              <h3 className="text-base font-medium">Configurações Avançadas de Backup</h3>
              {showAdvancedBackup ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>

            {showAdvancedBackup && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <BackupSettings />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
