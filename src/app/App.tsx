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
    const initializeApp = async () => {
      console.log('[App] Initializing app...');
      try {
        await localDB.init();
        console.log('[App] Local database initialized');
      } catch (error) {
        console.error('[App] Failed to initialize local database:', error);
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