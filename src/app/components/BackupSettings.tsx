import { useState, useEffect } from 'react';
import { syncService, SyncMode } from '../utils/syncService';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import {
  Cloud,
  HardDrive,
  Download,
  Upload,
  Settings,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export function BackupSettings() {
  const [syncMode, setSyncMode] = useState<SyncMode>(syncService.getSyncMode());
  const [lastSyncTime, setLastSyncTime] = useState(syncService.getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastSyncTime(syncService.getLastSyncTime());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncService.syncWithCloudflare(true);
      setLastSyncTime(syncService.getLastSyncTime());
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleChangeSyncMode = (mode: SyncMode) => {
    setSyncMode(mode);
    syncService.setSyncMode(mode);
    toast.success('Modo de sincronização alterado!');

    if (mode === 'cloudflare-sync') {
      syncService.startAutoBackup();
    } else {
      syncService.stopAutoBackup();
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

  const handleExportLocal = async () => {
    try {
      const blob = await syncService.exportLocalBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mesinha-backup-${new Date().toISOString().split('T')[0]}.json`;
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configurações de Sincronização</h2>
        <p className="text-sm text-gray-600">
          Gerencie como seus dados são salvos e sincronizados
        </p>
      </div>

      <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 mb-2">
              Status Atual
            </h3>
            <div className="text-sm text-purple-800 space-y-1">
              {syncMode === 'local-only' && (
                <p>✅ <strong>Modo Local:</strong> Dados salvos apenas no navegador</p>
              )}
              {syncMode === 'cloudflare-sync' && (
                <div className="space-y-1">
                  <p>✅ <strong>Sincronização Cloudflare Ativa:</strong> Dados em nuvem.</p>
                  <p className="text-xs">• Sincronização automática em segundo plano</p>
                  <p className="text-xs">• Última sincronização: {formatLastSync()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

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
                <div className="font-semibold">Apenas Local</div>
                <div className="text-sm text-gray-600">
                  Dados salvos apenas no seu dispositivo. Nenhuma internet necessária.
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleChangeSyncMode('cloudflare-sync')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              syncMode === 'cloudflare-sync'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5" />
              <div>
                <div className="font-semibold">Cloudflare Sync (Automático)</div>
                <div className="text-sm text-gray-600">
                  Backup automático na nuvem. Sincroniza com outros aparelhos usando a conta.
                </div>
              </div>
            </div>
          </button>
        </div>
      </Card>

      {syncMode === 'cloudflare-sync' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Sincronização Manual</h3>
          </div>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Última sincronização: <span className="font-medium">{formatLastSync()}</span>
            </div>
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Backup de Segurança Manual</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleExportLocal} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Exportar .json
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
