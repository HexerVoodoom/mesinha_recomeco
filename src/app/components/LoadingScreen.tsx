import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import introVideo from '../../assets/intro-abertura.mp4';

interface LoadingScreenProps {
  onComplete: () => void;
}

// Quanto tempo a animação fica na tela antes do fade.
const DURACAO_INTRO = 3000;
// O primeiro segundo do vídeo é parado, então a intro começa depois dele.
const COMECO_DO_VIDEO = 1;
// Se o vídeo não começar a tocar nesse tempo (aparelho/rede lentos), a gente
// vai direto pro app — melhor abrir rápido do que travar na abertura.
const ESPERA_MAXIMA = 2000;

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [startFade, setStartFade] = useState(false);
  // O vídeo só aparece depois que já está rodando: enquanto ele está parado,
  // a WebView desenha o botão de "play" por cima, e era isso que piscava na
  // tela por um segundo no começo.
  const [tocando, setTocando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const contando = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    // Pula a parte estática do começo assim que dá pra posicionar o vídeo.
    const pularParteParada = () => {
      if (video && video.currentTime < COMECO_DO_VIDEO) {
        video.currentTime = COMECO_DO_VIDEO;
      }
    };
    if (video && video.readyState >= 1) {
      pularParteParada();
    } else {
      video?.addEventListener('loadedmetadata', pularParteParada, { once: true });
    }

    // Só começa a contar os 3s quando o vídeo realmente começou a rodar, pra
    // animação ser vista do começo.
    const aoComecar = () => {
      setTocando(true);
      if (contando.current) return;
      contando.current = true;
      timerRef.current = setTimeout(() => setStartFade(true), DURACAO_INTRO);
    };

    video?.addEventListener('playing', aoComecar);
    // Alguns navegadores engasgam no autoplay do atributo; pedir na mão ajuda.
    video?.play().catch(() => {
      // autoplay bloqueado: não trava a abertura, segue pro app
      setStartFade(true);
    });

    // Rede ruim: não segura a abertura esperando o vídeo.
    const desistir = setTimeout(() => {
      if (contando.current) return;
      contando.current = true;
      setStartFade(true);
    }, ESPERA_MAXIMA);

    return () => {
      video?.removeEventListener('playing', aoComecar);
      video?.removeEventListener('loadedmetadata', pularParteParada);
      clearTimeout(desistir);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Função para pular a intro ao clicar
  const handleSkip = () => {
    setStartFade(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden cursor-pointer bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: startFade ? 0 : 1 }}
      transition={{ duration: 1, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (startFade) {
          onComplete();
        }
      }}
      onClick={handleSkip}
    >
      {/* Esconde o botão de play e os controles que a WebView/iOS desenham
          por cima do vídeo enquanto ele não está tocando. */}
      <style>{`
        .intro-video::-webkit-media-controls,
        .intro-video::-webkit-media-controls-panel,
        .intro-video::-webkit-media-controls-start-playback-button,
        .intro-video::-webkit-media-controls-overlay-play-button {
          display: none !important;
          -webkit-appearance: none;
        }
      `}</style>
      <video
        ref={videoRef}
        src={introVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        className="intro-video absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200"
        style={{ opacity: tocando ? 1 : 0 }}
        // Se o vídeo falhar por qualquer motivo, passa direto pro app.
        onError={() => setStartFade(true)}
      />
    </motion.div>
  );
}
