import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import { LoadingScreen } from './components/LoadingScreen';
import { PreLoadingScreen } from './components/PreLoadingScreen';

// Liga/desliga a tela de abertura do ninho (a do tap and hold secreto de 10s).
// Pra desligar de novo é só trocar pra `false`.
const TELA_DE_ABERTURA_ATIVA = true;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreLoading, setShowPreLoading] = useState(TELA_DE_ABERTURA_ATIVA);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [userProfile, setUserProfile] = useState<'Amanda' | 'Mateus' | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      const profile = localStorage.getItem('userProfile') as 'Amanda' | 'Mateus' | null;

      if (profile && (profile === 'Amanda' || profile === 'Mateus')) {
        setIsAuthenticated(true);
        setUserProfile(profile);
      }

      setIsLoading(false);
    };

    initializeApp();
  }, []);

  // Informa o app Android nativo (WebView) quem está logado, para registrar o
  // token de notificação (FCM) sob o perfil certo. No navegador é no-op.
  useEffect(() => {
    if (isAuthenticated && userProfile) {
      try {
        (window as any).MesinhaNative?.setProfile?.(userProfile);
      } catch (_) {
        // sem ponte nativa (navegador comum)
      }
    }
  }, [isAuthenticated, userProfile]);

  const handleLoginSuccess = (profile: 'Amanda' | 'Mateus') => {
    setUserProfile(profile);
    setIsAuthenticated(true);
  };

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
  };

  // Tela de abertura travada (tap and hold) vem antes de tudo
  if (showPreLoading) {
    return <PreLoadingScreen onComplete={() => setShowPreLoading(false)} />;
  }

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