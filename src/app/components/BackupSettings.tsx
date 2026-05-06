import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Cloud, HardDrive, RefreshCw, Upload, Download, Database, Check } from 'lucide-react';
import { syncService, SyncMode } from '../utils/syncService';
import { toast } from 'sonner';
import { api } from '../utils/api';

export default function BackupSettings() {
  const [syncMode, setSyncMode] = useState<SyncMode>('local-only');
  const [isSaving, setIsSaving] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<number>(0);
  const [supabaseBackupInfo, setSupabaseBackupInfo] = useState({
    totalItems: 0,
    lastChecked: '',
    loading: true
  });

  useEffect(() => {
    // Carregar configurações locais
    setSyncMode(syncService.getSyncMode());
    setLastBackupTime(syncService.getLastBackupTime());

    // Verificar backup no Supabase
    checkSupabaseBackup();

    // Listen to sync updates
    const handleSyncComplete = () => {
      setLastBackupTime(syncService.getLastSyncTime());
      checkSupabaseBackup();
    };
    
    window.addEventListener('sync_completed', handleSyncComplete);
    return () => window.removeEventListener('sync_completed', handleSyncComplete);
  }, []);

  const checkSupabaseBackup = async () => {
    try {
      const data = await api.getBackupStats();
      setSupabaseBackupInfo({
        totalItems: data.stats.totalItems,
        lastChecked: data.stats.lastChecked,
        loading: false
      });
    } catch (error) {
      console.error('Failed to check Supabase backup:', error);
      setSupabaseBackupInfo(prev => ({ ...prev, loading: false }));
    }
  };

  const handleChangeSyncMode = (mode: SyncMode) => {
    syncService.setSyncMode(mode);
    setSyncMode(mode);
    toast.success(`Modo de sincronização alterado`);
    
    if (mode === 'supabase-sync') {
      syncService.syncWithSupabase(true);
    }
  };

  const handleManualSync = async () => {
    setIsSaving(true);
    try {
      await syncService.syncWithSupabase(true);
      setLastBackupTime(syncService.getLastSyncTime());
      await checkSupabaseBackup();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreFromSupabase = async () => {
    // Puxa tudo forçadamente substituindo e atualizando o cache
    setIsSaving(true);
    try {
      await syncService.syncWithSupabase(true);
      setLastBackupTime(syncService.getLastSyncTime());
      toast.success('Restauração/Sincronização concluída!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Supabase restore error:', error);
    } finally {
      setIsSaving(false);
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
    <div className="space-y-6 p-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configurações de Backup</h2>
        <p className="text-gray-600">
          Gerencie como seus dados são salvos e sincronizados com a nuvem
        </p>
      </div>

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
                <div className="font-semibold">Apenas Local</div>
                <div className="text-sm text-gray-600">
                  Dados ficam salvos apenas neste dispositivo.
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleChangeSyncMode('supabase-sync')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              syncMode === 'supabase-sync'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5" />
              <div>
                <div className="font-semibold">Local + Supabase Sync (Recomendado)</div>
                <div className="text-sm text-gray-600">
                  Auto-sincronização bidirecional em segundo plano.
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
          <h3 className="text-lg font-semibold">Sincronização Manual</h3>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Última sincronização: <span className="font-medium">{formatLastBackup()}</span>
          </div>

          <Button
            onClick={handleManualSync}
            disabled={isSaving || syncMode === 'local-only'}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Sincronizando...' : 'Sincronizar com Supabase'}
          </Button>
        </div>
      </Card>

      {/* Supabase Restore */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">Dados do Supabase</h3>
        </div>

        <div className="space-y-3">
          <div className="bg-white/70 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Backup na Nuvem:</span>
              {supabaseBackupInfo.loading ? (
                <span className="text-sm text-gray-500">Verificando...</span>
              ) : (
                <span className="text-lg font-bold text-green-600">
                  {supabaseBackupInfo.totalItems} itens
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-700">
            Clique no botão abaixo caso precise forçar o download de tudo do servidor
            para o seu armazenamento local.
          </p>
          <Button
            onClick={handleRestoreFromSupabase}
            variant="default"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={supabaseBackupInfo.loading || isSaving}
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Tudo do Supabase
          </Button>
        </div>
      </Card>

      {/* Local Export/Import */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Backup Local (Arquivo)</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleExportLocal} variant="outline" className="w-full">
            <Upload className="w-4 h-4 mr-2" />
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
                  <Download className="w-4 h-4 mr-2" />
                  Importar .json
                </span>
              </Button>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
}
