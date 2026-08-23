import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ninho from '../../assets/ninho-recomeco.png';

interface PreLoadingScreenProps {
  onComplete: () => void;
}

const HOLD_DURATION = 10000; // 10 segundos segurando pra passar

/**
 * Tela de abertura (antes do vídeo). Fica travada: só passa se a pessoa
 * segurar o dedo (ou o mouse) pressionado por 10 segundos seguidos.
 */
export function PreLoadingScreen({ onComplete }: PreLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
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
    setHolding(false);
    setProgress(0);
  }, [done]);

  const startHold = useCallback(() => {
    if (done || startRef.current !== null) return;
    setHolding(true);
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (startRef.current === null) return;
      const elapsed = now - startRef.current;
      const pct = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(pct);

      if (pct >= 1) {
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

      <div className="mt-10 flex w-full max-w-xs flex-col items-center gap-3 px-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-neutral-500 transition-[width] duration-75 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-center text-xs tracking-wide text-neutral-400">
          {holding
            ? `segura mais um pouquinho… ${Math.ceil((1 - progress) * (HOLD_DURATION / 1000))}s`
            : 'segure a tela por 10 segundos para continuar'}
        </p>
      </div>
    </motion.div>
  );
}
