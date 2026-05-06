import { useState, useEffect } from 'react';
import { syncService, SyncMode } from '../utils/syncService';
import { googleDriveBackup } from '../utils/googleDriveBackup';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner';
import {
  Cloud,
  HardDrive,
  Download,
  Upload,
  Settings,
  RefreshCw,
  LogOut,
  Check,
  AlertCircle,
  X,
  Database,
} from 'lucide-react';

export function BackupSettings() {
  const [syncMode, setSyncMode] = useState<SyncMode>(syncService.getSyncMode());
  const [googleClientId, setGoogleClientId] = useState(
    localStorage.getItem('google_client_id') || '305705048348-jbfvtamh0llghkfiuntt9bqlc48vhukc.apps.googleusercontent.com'
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    googleDriveBackup.isAuthenticated()
  );
  const [lastBackupTime, setLastBackupTime] = useState(
    syncService.getLastBackupTime()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(
    !localStorage.getItem('backup_help_dismissed')
  );
  const [supabaseBackupInfo, setSupabaseBackupInfo] = useState<{
    totalItems: number;
    loading: boolean;
  }>({ totalItems: 109, loading: false });
  const [lastSyncTime, setLastSyncTime] = useState(
    syncService.getLastSyncTime()
  );

  useEffect(() => {
    // Auto-save the default client ID if not already saved
    if (!localStorage.getItem('google_client_id') && googleClientId) {
      localStorage.setItem('google_client_id', googleClientId);
    }

    const interval = setInterval(() => {
      setLastBackupTime(syncService.getLastBackupTime());
      setLastSyncTime(syncService.getLastSyncTime());
      setIsAuthenticated(googleDriveBackup.isAuthenticated());
    }, 5000);

    return () => clearInterval(interval);
  }, [googleClientId]);

  const handleManualSync = async () => {
    try {
      await syncService.syncWithGoogleDrive(true);
      setLastSyncTime(syncService.getLastSyncTime());
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Nunca';

    const diff = Date.now() - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} dia${days > 1 ? 's' : ''} atrás`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
    return 'Agora mesmo';
  };

  const handleSaveClientId = () => {
    localStorage.setItem('google_client_id', googleClientId);
    toast.success('Google Client ID salvo!');
  };

  const dismissHelp = () => {
    localStorage.setItem('backup_help_dismissed', 'true');
    setShowHelp(false);
  };

  const copyToClipboard = (text: string) => {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success('URI copiada!'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    // Fallback for when Clipboard API is blocked
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('URI copiada!');
      } else {
        toast.error('Não foi possível copiar. Copie manualmente.');
      }
    } catch (err) {
      console.log('Fallback copy failed:', err);
      toast.error('Não foi possível copiar. Copie manualmente.');
    }

    document.body.removeChild(textArea);
  };

  const handleChangeSyncMode = (mode: SyncMode) => {
    setSyncMode(mode);
    syncService.setSyncMode(mode);
    toast.success('Modo de sincronização alterado!');

    // Restart auto-backup
    if (mode !== 'local-only') {
      syncService.startAutoBackup();
    } else {
      syncService.stopAutoBackup();
    }
  };

  const handleAuthenticateGoogle = async () => {
    try {
      console.log('[BackupSettings] Starting Google Drive authentication');
      await googleDriveBackup.authenticate();
      setIsAuthenticated(true);
      toast.success('Autenticado com Google Drive!');
    } catch (error) {
      console.error('[BackupSettings] Authentication failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('popup') || error.message.includes('blocker') || error.message.includes('authentication window')) {
          toast.error('Bloqueador de popup ativo!', {
            duration: 5000,
            description: 'Desabilite o bloqueador de popup nas configurações do navegador e tente novamente'
          });
        } else if (error.message.includes('cancelled') || error.message.includes('canceled')) {
          toast.error('Autenticação cancelada pelo usuário');
        } else if (error.message.includes('load') || error.message.includes('connection')) {
          toast.error('Erro de conexão', {
            description: 'Verifique sua conexão com a internet'
          });
        } else {
          toast.error(`Erro: ${error.message}`);
        }
      } else {
        toast.error('Erro ao autenticar com Google Drive');
      }
    }
  };

  const handleLogoutGoogle = () => {
    googleDriveBackup.logout();
    setIsAuthenticated(false);
    toast.success('Desconectado do Google Drive');
  };

  const handleManualBackup = async () => {
    setIsSaving(true);
    try {
      await syncService.performBackup(true);
      setLastBackupTime(syncService.getLastBackupTime());
    } catch (error) {
      console.error('Backup error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    try {
      await syncService.restoreFromGoogleDrive();
    } catch (error) {
      console.error('Restore error:', error);
    }
  };

  const handleRestoreFromSupabase = async () => {
    try {
      await syncService.restoreFromSupabase();
    } catch (error) {
      console.error('Supabase restore error:', error);
    }
  };

  const handleExportLocal = async () => {
    try {
      const blob = await syncService.exportLocalBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `couple-app-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exportado!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar backup');
    }
  };

  const handleImportLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await syncService.importLocalBackup(file);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const formatLastBackup = () => {
    if (!lastBackupTime) return 'Nunca';

    const diff = Date.now() - lastBackupTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} dia${days > 1 ? 's' : ''} atrás`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
    return 'Agora mesmo';
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configurações de Backup</h2>
        <p className="text-sm text-gray-600">
          Gerencie como seus dados são salvos e sincronizados
        </p>
      </div>

      {/* Sync Status Card */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 mb-2">
              Status da Sincronização
            </h3>
            <div className="text-sm text-purple-800 space-y-1">
              {syncMode === 'local-only' && (
                <p>✅ <strong>Modo Local:</strong> Dados salvos apenas no navegador</p>
              )}
              {syncMode === 'local-with-drive' && isAuthenticated && (
                <div className="space-y-1">
                  <p>✅ <strong>Sincronização Ativa:</strong> Dados sincronizando com Google Drive</p>
                  <p className="text-xs">• Backup automático ao salvar itens (2s de atraso)</p>
                  <p className="text-xs">• Sincronização bidirecional a cada 5 minutos</p>
                  <p className="text-xs">• Última sincronização: {formatLastSync()}</p>
                  <button
                    onClick={handleManualSync}
                    className="text-xs text-purple-700 hover:text-purple-900 underline mt-1"
                  >
                    🔄 Sincronizar agora
                  </button>
                </div>
              )}
              {syncMode === 'local-with-drive' && !isAuthenticated && (
                <p>⚠️ <strong>Google Drive configurado mas não autenticado</strong></p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Help Card */}
      {showHelp && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-blue-900">
                  📋 Como configurar Google Drive
                </h3>
                <button
                  onClick={dismissHelp}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>1.</strong> Acesse:{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Google Cloud Console
                  </a>
                </p>
                <p>
                  <strong>2.</strong> Crie ou edite credenciais OAuth 2.0
                </p>
                <p>
                  <strong>3.</strong> Em "URIs de redirecionamento autorizados", adicione <strong>TODAS</strong> estas URIs:
                </p>
                <div className="bg-blue-100 p-2 rounded text-xs space-y-2">
                  <div>
                    <div className="font-medium mb-1">URI Atual (obrigatória):</div>
                    <code className="block break-all bg-white p-1 rounded">
                      {window.location.origin}/oauth-callback.html
                    </code>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/oauth-callback.html`)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                    >
                      📋 Copiar URI Atual
                    </button>
                  </div>
                  <div>
                    <div className="font-medium mb-1">URIs Alternativas (recomendado adicionar todas):</div>
                    <code className="block break-all bg-white p-1 rounded mb-1">
                      https://stack-chrome-89765457.figma.site/oauth-callback.html
                    </code>
                    <code className="block break-all bg-white p-1 rounded mb-1">
                      http://localhost:5173/oauth-callback.html
                    </code>
                    <button
                      onClick={() => {
                        const uris = [
                          `${window.location.origin}/oauth-callback.html`,
                          'https://stack-chrome-89765457.figma.site/oauth-callback.html',
                          'http://localhost:5173/oauth-callback.html'
                        ].join('\n');
                        copyToClipboard(uris);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      📋 Copiar Todas as URIs
                    </button>
                  </div>
                </div>
                <p>
                  <strong>4.</strong> Copie o Client ID e cole abaixo
                </p>
                <p>
                  <strong>5.</strong> Clique em "Conectar com Google Drive"
                </p>
                <p>
                  <strong>6.</strong> Ative o modo "Local + Google Drive"
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Google Drive Setup */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Google Drive - Sincronização Automática</h3>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800 font-medium mb-1">
            ✨ Configure para sincronização automática em tempo real
          </p>
          <p className="text-xs text-green-700">
            Seus dados serão salvos automaticamente no Google Drive sempre que você criar, editar ou excluir algo
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Google Client ID
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="Cole seu Google Client ID aqui (opcional)"
                className="flex-1"
              />
              <Button onClick={handleSaveClientId} variant="outline" disabled={!googleClientId}>
                Salvar
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Opcional:</strong> Configure apenas se quiser usar backup no Google Drive.{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                Obter Client ID
              </a>
            </p>
          </div>

          {googleClientId && (
            <div>
              {isAuthenticated ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Conectado ao Google Drive</span>
                  </div>
                  <Button
                    onClick={handleLogoutGoogle}
                    variant="outline"
                    size="sm"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Desconectar
                  </Button>
                </div>
              ) : (
                <Button onClick={handleAuthenticateGoogle} className="w-full">
                  <Cloud className="w-4 h-4 mr-2" />
                  Conectar com Google Drive
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Sync Mode */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Modo de Sincronização</h3>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleChangeSyncMode('local-only')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              syncMode === 'local-only'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5" />
              <div>
                <div className="font-semibold">Apenas Local (Recomendado)</div>
                <div className="text-sm text-gray-600">
                  Dados salvos no navegador. Use "Restaurar do Supabase" para recuperar dados.
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleChangeSyncMode('local-with-drive')}
            disabled={!googleClientId || !isAuthenticated}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              syncMode === 'local-with-drive'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5" />
              <div>
                <div className="font-semibold">Local + Google Drive</div>
                <div className="text-sm text-gray-600">
                  Local com backup automático no Google Drive
                  {(!googleClientId || !isAuthenticated) && (
                    <span className="block text-xs text-yellow-600 mt-1">
                      ⚠️ Requer configuração do Google Drive acima
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        </div>
      </Card>

      {/* Manual Backup */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Backup Manual</h3>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Último backup: <span className="font-medium">{formatLastBackup()}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleManualBackup}
              disabled={isSaving || syncMode === 'local-only'}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Backup Agora'}
            </Button>

            <Button
              onClick={handleRestoreFromDrive}
              disabled={syncMode === 'local-only' || !isAuthenticated}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Restaurar
            </Button>
          </div>
        </div>
      </Card>

      {/* Supabase Restore */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">Restaurar do Supabase</h3>
        </div>

        <div className="space-y-3">
          <div className="bg-white/70 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Backup disponível:</span>
              {supabaseBackupInfo.loading ? (
                <span className="text-sm text-gray-500">Verificando...</span>
              ) : (
                <span className="text-lg font-bold text-green-600">
                  {supabaseBackupInfo.totalItems} itens
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600">
              Seus dados estão seguros no servidor Supabase!
            </p>
          </div>
          <p className="text-sm text-gray-700">
            Clique no botão abaixo para restaurar todos os dados salvos no servidor Supabase
            para o armazenamento local do navegador.
          </p>
          <Button
            onClick={handleRestoreFromSupabase}
            variant="default"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={supabaseBackupInfo.loading || supabaseBackupInfo.totalItems === 0}
          >
            <Database className="w-4 h-4 mr-2" />
            Restaurar {supabaseBackupInfo.totalItems > 0 ? `${supabaseBackupInfo.totalItems} itens` : ''} do Supabase
          </Button>
        </div>
      </Card>

      {/* Local Export/Import */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Backup Local</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleExportLocal} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>

          <div className="w-full">
            <input
              type="file"
              accept=".json"
              onChange={handleImportLocal}
              className="hidden"
              id="backup-import-input"
            />
            <label htmlFor="backup-import-input">
              <Button variant="outline" className="w-full cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </span>
              </Button>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
}
