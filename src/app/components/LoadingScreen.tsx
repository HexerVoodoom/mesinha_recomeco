import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const INTRO_GIF = 'https://i.imgur.com/RfJIuEz.gif';

// Quanto tempo a animação fica na tela depois que o GIF realmente carregou.
const DURACAO_INTRO = 3000;
// Se a internet estiver ruim e o GIF não chegar nesse tempo, a gente desiste
// dele e vai direto pro app (melhor abrir rápido do que travar na abertura).
const ESPERA_MAXIMA_DO_GIF = 2000;

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [startFade, setStartFade] = useState(false);
  // Só mostra o <img> quando o GIF já está no cache do navegador — assim a
  // animação começa do primeiro quadro em vez de aparecer pela metade.
  const [gifPronto, setGifPronto] = useState(false);
  const finalizado = useRef(false);

  // Pré-carrega o GIF e só então começa a contar o tempo da intro.
  useEffect(() => {
    let cancelado = false;

    const comecarIntro = () => {
      if (cancelado || finalizado.current) return;
      finalizado.current = true;
      setTimeout(() => setStartFade(true), DURACAO_INTRO);
    };

    const img = new Image();
    img.decoding = 'async';
    img.src = INTRO_GIF;

    const aoCarregar = () => {
      if (cancelado) return;
      setGifPronto(true);
      comecarIntro();
    };

    if (img.complete) {
      aoCarregar();
    } else {
      img.onload = aoCarregar;
      img.onerror = () => {
        // Sem GIF, não faz sentido segurar a tela: passa direto.
        if (!cancelado) setStartFade(true);
      };
    }

    // Rede ruim: não deixa a abertura travando esperando o GIF.
    const desistir = setTimeout(() => {
      if (cancelado || finalizado.current) return;
      finalizado.current = true;
      setStartFade(true);
    }, ESPERA_MAXIMA_DO_GIF);

    return () => {
      cancelado = true;
      clearTimeout(desistir);
      img.onload = null;
      img.onerror = null;
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
      transition={{ duration: 1, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (startFade) {
          onComplete();
        }
      }}
      onClick={handleSkip}
    >
      {/* Background com GIF animado */}
      <div 
        className="absolute inset-0 w-full h-full"
      >
        {gifPronto && (
          <img 
            src={INTRO_GIF}
            alt="Background"
            className="w-full h-full object-cover"
            style={{ 
              imageRendering: 'auto',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
