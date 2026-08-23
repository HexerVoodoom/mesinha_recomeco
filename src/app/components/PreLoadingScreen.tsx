import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ninho from '../../assets/ninho-recomeco.png';

interface PreLoadingScreenProps {
  onComplete: () => void;
}

const HOLD_DURATION = 10000; // 10 segundos segurando pra passar

/**
 * Tela de abertura (antes do vídeo). Fica travada: só passa se a pessoa
 * segurar o dedo (ou o mouse) pressionado por 10 segundos seguidos. O bypass
 * é secreto: nenhuma instrução ou feedback aparece na tela.
 */
export function PreLoadingScreen({ onComplete }: PreLoadingScreenProps) {
  const [done, setDone] = useState(false);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const stopHold = useCallback(() => {
    if (done) return;
    startRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, [done]);

  const startHold = useCallback(() => {
    if (done || startRef.current !== null) return;
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (startRef.current === null) return;
      if (now - startRef.current >= HOLD_DURATION) {
        startRef.current = null;
        frameRef.current = null;
        setDone(true);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [done]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-white select-none touch-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: done ? 0 : 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (done) onComplete();
      }}
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
    >
      <img
        src={ninho}
        alt="Ninho"
        draggable={false}
        className="w-full max-w-md px-6 pointer-events-none"
      />
    </motion.div>
  );
}
