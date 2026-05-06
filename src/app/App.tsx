import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster, toast } from 'sonner';
import Login from './pages/Login';
import { LoadingScreen } from './components/LoadingScreen';
import { localDB } from './utils/localDB';
import { syncService } from './utils/syncService';
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [userProfile, setUserProfile] = useState<'Amanda' | 'Mateus' | null>(null);

  useEffect(() => {
    // Verificar se já existe um perfil salvo no localStorage
    const initializeApp = async () => {
      console.log('[App] Initializing app...');

      // Initialize local database
      try {
        await localDB.init();
        console.log('[App] Local database initialized');

        // Sync with Cloudflare if enabled
        const syncMode = syncService.getSyncMode();
        if (syncMode === 'cloudflare-sync') {
          console.log('[App] Syncing with Cloudflare...');
          try {
            // Perform bidirectional sync
            await syncService.syncWithCloudflare(false);
            console.log('[App] Sync completed');
          } catch (error) {
            console.log('[App] Sync failed:', error);
          }
        }

        // Check if database is still empty after sync
        const items = await localDB.getAllItems();
        if (items.length === 0) {
          console.log('[App] Local database is empty - showing restore options');
        }

        // Start auto-sync/backup only if not in local-only mode
        if (syncMode !== 'local-only') {
          // Auto-sync every 5 minutes
          syncService.startAutoBackup(5);
          console.log('[App] Auto-sync started (every 5 minutes)');
        } else {
          console.log('[App] Auto-sync disabled (local-only mode)');
        }
      } catch (error) {
        console.error('[App] Failed to initialize local database:', error);

        // Show user-friendly error message
        if (error instanceof Error) {
          if (error.message.includes('clear browser data')) {
            toast.error('Erro no banco de dados local', {
              description: 'Por favor, limpe os dados do navegador e recarregue a página',
              duration: 10000
            });
          } else {
            toast.error('Erro ao inicializar banco de dados', {
              description: 'Seus dados podem estar corrompidos. Tente restaurar do backup.',
              duration: 8000
            });
          }
        }
      }

      const profile = localStorage.getItem('userProfile') as 'Amanda' | 'Mateus' | null;
      console.log('[App] Stored profile:', profile);

      if (profile && (profile === 'Amanda' || profile === 'Mateus')) {
        console.log('[App] Profile found, setting authenticated');
        setIsAuthenticated(true);
        setUserProfile(profile);
      } else {
        console.log('[App] No valid profile found');
      }

      setIsLoading(false);
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      syncService.stopAutoBackup();
    };
  }, []);

  const handleLoginSuccess = (profile: 'Amanda' | 'Mateus') => {
    console.log('[App] Login success callback:', { profile });
    setUserProfile(profile);
    setIsAuthenticated(true);
    console.log('[App] Authentication state updated');
  };

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
  };

  // Mostrar loading screen primeiro
  if (showLoadingScreen) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  if (isLoading) {
    return null; // Não precisa mostrar nada enquanto carrega após loading screen
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </>
  );
}