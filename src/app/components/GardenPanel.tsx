import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Snowflake, Sprout } from 'lucide-react';
import { api, GardenStats } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GardenPanelProps {
  userProfile: 'Amanda' | 'Mateus';
}

// Rótulos das categorias para a retrospectiva (mesmos nomes da grade).
const CATEGORY_LABELS: Record<string, string> = {
  mural: 'Mural',
  alarm: 'Lembretes',
  dates: 'Datas',
  jokes: 'Bobeiras',
  top3: 'Top 3',
  movies: 'Filmes/Séries',
  watch: 'Vídeos Curtos',
  games: 'Jogos',
  food: 'Comidas',
  places: 'Lugares',
  other: 'Outros',
  capsule: 'Cápsulas',
  chore: 'Tarefas',
  bucket: 'Sonhos',
  gratitude: 'Gratidão',
  mood: 'Humor',
  meetup: 'Encontros',
  question: 'Perguntas',
};

// O jardim vai ganhando moradores conforme o nível sobe — a metáfora de
// crescimento do Couple Tree, mas com o elenco de vocês.
const GARDEN_STAGES = [
  { at: 1, emoji: '🌱', name: 'Broto' },
  { at: 2, emoji: '🌿', name: 'Mudinha' },
  { at: 3, emoji: '🌳', name: 'Arvorezinha' },
  { at: 4, emoji: '🌳🌷', name: 'Jardim florido' },
  { at: 5, emoji: '🌳🌷🦙', name: 'A Alpaquinha chegou' },
  { at: 6, emoji: '🌳🌷🦙🐦‍⬛', name: 'O Corvinho também' },
  { at: 8, emoji: '🏡🌳🌷🦙🐦‍⬛', name: 'A casinha de vocês' },
  { at: 10, emoji: '🏡🌳🌸🦙🐦‍⬛🦋', name: 'Jardim completo' },
];

function stageFor(level: number) {
  let stage = GARDEN_STAGES[0];
  for (const s of GARDEN_STAGES) {
    if (level >= s.at) stage = s;
  }
  return stage;
}

/**
 * Nosso Jardim: sequência de dias ativos, progresso visual acumulado e
 * retrospectiva do ano — as três coisas que fazem um app de casal render com
 * o tempo em vez de só acumular conteúdo.
 */
export function GardenPanel({ userProfile }: GardenPanelProps) {
  const [stats, setStats] = useState<GardenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const partnerName = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';

  useEffect(() => {
    api.getGarden()
      .then(setStats)
      .catch(() => { /* jardim é bônus — não vira erro na cara de ninguém */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground px-6">Regando o jardim...</div>;
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground px-6">
        Não deu pra carregar o jardim agora. Tenta de novo daqui a pouco 🌱
      </div>
    );
  }

  const stage = stageFor(stats.level);
  const progressToNext = Math.min(100, Math.round((stats.itemsCounted / stats.nextLevelAt) * 100));
  const topCategories = Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const mine = stats.byPerson[userProfile] || 0;
  const theirs = stats.byPerson[partnerName] || 0;
  const bothTotal = mine + theirs;

  return (
    <div className="px-6 pb-24">
      {/* O jardim */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border-2 border-[#E9E4DF] bg-gradient-to-b from-[#F8F6F4] to-[#EDF4F3] p-6 text-center mb-4"
      >
        <div className="text-5xl leading-none mb-2">{stage.emoji}</div>
        <p className="font-['Quicksand',sans-serif] font-bold text-lg text-[#2B2A28]">
          {stage.name}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Nível {stats.level} · {stats.itemsCounted} momentos plantados
        </p>

        <div className="h-2.5 rounded-full bg-[#E9E4DF] overflow-hidden">
          <motion.div
            className="h-full bg-[#4D989B] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressToNext}%` }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Faltam {Math.max(0, stats.nextLevelAt - stats.itemsCounted)} pro nível {stats.level + 1}
        </p>
      </motion.div>

      {/* Sequência */}
      <div className="rounded-2xl border-2 border-[#E9E4DF] bg-white p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            stats.streak.current > 0 ? 'bg-[#4D989B]/10' : 'bg-[#F8F6F4]'
          }`}>
            {stats.streak.frozen && stats.streak.current > 0 ? (
              <Snowflake className="w-6 h-6 text-[#4D989B]" />
            ) : (
              <Flame className={`w-6 h-6 ${stats.streak.current > 0 ? 'text-[#4D989B]' : 'text-[#C5C0BA]'}`} />
            )}
          </div>
          <div className="flex-1">
            <p className="font-['Quicksand',sans-serif] font-bold text-lg text-[#2B2A28] leading-tight">
              {stats.streak.current} {stats.streak.current === 1 ? 'dia' : 'dias'} seguidos
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.streak.current === 0
                ? 'Faz qualquer coisa no app hoje pra começar 🌱'
                : stats.streak.frozen
                ? 'Congelada: hoje ainda não teve nada, mas a sequência tá salva'
                : 'Sequência viva! Recorde de ' + stats.streak.longest + ' dias'}
            </p>
          </div>
        </div>
        {stats.streak.frozen && stats.streak.current > 0 && (
          <p className="text-[11px] text-[#8A847D] mt-2 pl-15">
            Pular um dia nunca zera a sequência aqui — só dois dias seguidos.
          </p>
        )}
      </div>

      {/* Quem plantou o quê */}
      {bothTotal > 0 && (
        <div className="rounded-2xl border-2 border-[#E9E4DF] bg-white p-4 mb-4">
          <p className="font-['Quicksand',sans-serif] font-bold text-xs uppercase tracking-tight text-[#4D989B] mb-2">
            🫱🏻‍🫲🏽 Quem plantou
          </p>
          <div className="h-3 rounded-full bg-[#E9E4DF] overflow-hidden flex">
            <div className="bg-[#4D989B] h-full" style={{ width: `${Math.round((mine / bothTotal) * 100)}%` }} />
            <div className="bg-[#C8A2C8] h-full" style={{ width: `${Math.round((theirs / bothTotal) * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs font-['Quicksand',sans-serif]">
            <span className="text-[#4D989B] font-bold">Você · {mine}</span>
            <span className="text-[#8A847D]">{partnerName} · {theirs}</span>
          </div>
        </div>
      )}

      {/* Retrospectiva do ano */}
      <div className="rounded-2xl border-2 border-[#E9E4DF] bg-white p-4 mb-4">
        <p className="font-['Quicksand',sans-serif] font-bold text-xs uppercase tracking-tight text-[#4D989B] mb-3">
          📊 Retrospectiva de {stats.thisYear.year}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl bg-[#F8F6F4] p-3">
            <p className="font-['Quicksand',sans-serif] font-bold text-2xl text-[#2B2A28] leading-none">
              {stats.thisYear.total}
            </p>
            <p className="text-xs text-muted-foreground mt-1">momentos esse ano</p>
          </div>
          <div className="rounded-xl bg-[#F8F6F4] p-3">
            <p className="font-['Quicksand',sans-serif] font-bold text-2xl text-[#2B2A28] leading-none">
              {stats.activeDays}
            </p>
            <p className="text-xs text-muted-foreground mt-1">dias com registro</p>
          </div>
        </div>

        {stats.thisYear.busiestMonth && (
          <p className="text-sm font-['Quicksand',sans-serif] text-[#2B2A28] mb-3">
            O mês mais movimentado foi{' '}
            <strong className="text-[#4D989B]">
              {format(parseISO(`${stats.thisYear.busiestMonth.month}-01`), 'MMMM', { locale: ptBR })}
            </strong>{' '}
            com {stats.thisYear.busiestMonth.count} registros.
          </p>
        )}

        {/* Top categorias */}
        <div className="space-y-1.5">
          {topCategories.map(([category, count]) => {
            const max = topCategories[0][1];
            return (
              <div key={category} className="flex items-center gap-2">
                <span className="w-24 text-xs font-['Quicksand',sans-serif] text-[#2B2A28] truncate">
                  {CATEGORY_LABELS[category] || category}
                </span>
                <div className="flex-1 h-2 rounded-full bg-[#E9E4DF] overflow-hidden">
                  <div
                    className="h-full bg-[#4D989B]/70 rounded-full"
                    style={{ width: `${Math.round((count / max) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <Sprout className="w-3.5 h-3.5" />
        O jardim cresce sozinho com tudo que vocês fazem no app
      </p>
    </div>
  );
}
