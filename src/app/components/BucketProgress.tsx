import { motion } from 'motion/react';
import { ListItem } from '../utils/api';

interface BucketProgressProps {
  items: ListItem[];
}

/**
 * Barra de progresso da lista de sonhos. O que falta na categoria "Outros"
 * usada como bucket list é justamente isso: ver o quanto já foi realizado.
 */
export function BucketProgress({ items }: BucketProgressProps) {
  const bucket = items.filter(i => i.category === 'bucket');
  if (bucket.length === 0) return null;

  const done = bucket.filter(i => i.status === 'done').length;
  const total = bucket.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] p-4 mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-['Quicksand',sans-serif] font-bold text-xs uppercase tracking-tight text-[#4D989B]">
          ✨ Sonhos realizados
        </p>
        <p className="font-['Quicksand',sans-serif] text-sm font-bold text-[#2B2A28]">
          {done} de {total}
        </p>
      </div>

      <div className="h-3 rounded-full bg-[#E9E4DF] overflow-hidden">
        <motion.div
          className="h-full bg-[#4D989B] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-1.5">
        {done === 0
          ? 'Bora riscar o primeiro?'
          : done === total
          ? 'Vocês realizaram todos! Hora de sonhar mais alto 💫'
          : `Faltam ${total - done} pra completar a lista.`}
      </p>
    </div>
  );
}
