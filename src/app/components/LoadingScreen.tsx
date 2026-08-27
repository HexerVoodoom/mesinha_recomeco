import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import introVideo from '../../assets/intro-abertura.mp4';

interface LoadingScreenProps {
  onComplete: () => void;
}

// Quanto tempo a animação fica na tela antes do fade.
const DURACAO_INTRO = 3000;
// Se o vídeo não estiver pronto nesse tempo (rede/aparelho lento), a gente vai
// direto pro app — melhor abrir rápido do que travar na abertura.
const ESPERA_MAXIMA = 2000;

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [startFade, setStartFade] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const contando = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Só começa a contar os 3s quando o vídeo tem quadro pra mostrar, pra
  // animação rodar do começo e não aparecer pela metade.
  useEffect(() => {
    const comecarIntro = () => {
      if (contando.current) return;
      contando.current = true;
      timerRef.current = setTimeout(() => setStartFade(true), DURACAO_INTRO);
    };

    const video = videoRef.current;
    if (video && video.readyState >= 2) {
      comecarIntro();
    } else {
      video?.addEventListener('loadeddata', comecarIntro, { once: true });
    }

    // Rede ruim: não segura a abertura esperando o vídeo.
    const desistir = setTimeout(() => {
      if (contando.current) return;
      contando.current = true;
      setStartFade(true);
    }, ESPERA_MAXIMA);

    return () => {
      video?.removeEventListener('loadeddata', comecarIntro);
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
      <video
        ref={videoRef}
        src={introVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        // Sem loop: 3s é bem menos que o vídeo, então ele nunca chega ao fim.
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        // Se o vídeo falhar por qualquer motivo, passa direto pro app.
        onError={() => setStartFade(true)}
      />
    </motion.div>
  );
}
