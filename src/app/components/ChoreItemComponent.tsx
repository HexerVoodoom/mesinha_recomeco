import { useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Trash2, Check } from 'lucide-react';
import { ListItem } from '../utils/api';
import { Card, CardContent } from './ui/card';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Profile = 'Amanda' | 'Mateus';

interface ChoreItemComponentProps {
  item: ListItem;
  userProfile: Profile;
  onUpdate: (updates: Partial<ListItem>) => void;
  onDelete: () => void;
}

/**
 * Tarefa de casa com rodízio automático.
 *
 * O insight que os apps de tarefa (OneHaus, Homsy) apontam como o que
 * realmente resolve a treta doméstica não é a lista — é o rodízio: a mesma
 * tarefa não pode cair sempre na mesma pessoa. Ao concluir, a vez passa
 * automaticamente pro outro (quando o rodízio está ligado) e o servidor
 * notifica quem herdou.
 */
export function ChoreItemComponent({ item, userProfile, onUpdate, onDelete }: ChoreItemComponentProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const partnerName: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const assignee = (item.choreAssignee || userProfile) as Profile;
  const isMyTurn = assignee === userProfile;
  const rotates = item.choreRotates !== false; // liga por padrão

  const handleDone = () => {
    const now = new Date().toISOString();
    onUpdate({
      choreDoneCount: (item.choreDoneCount || 0) + 1,
      choreLastDoneBy: userProfile,
      choreLastDoneAt: now,
      // Rodízio: a vez passa pra quem NÃO fez agora. Girar a partir de
      // `assignee` estaria errado quando alguém adianta a tarefa fora da sua
      // vez ("Fiz eu mesmo(a)") — a vez voltaria pra quem acabou de fazer.
      // Sem rodízio, o dono continua o mesmo.
      choreAssignee: rotates ? (userProfile === 'Amanda' ? 'Mateus' : 'Amanda') : assignee,
    });
  };

  const lastDoneLabel = item.choreLastDoneAt
    ? formatDistanceToNow(parseISO(item.choreLastDoneAt), { locale: ptBR, addSuffix: true })
    : null;

  return (
    <Card variant="white" className={isMyTurn ? 'bg-[#4D989B]/5' : 'bg-white'}>
      <CardContent className="p-[18px]">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-['Quicksand',sans-serif] font-semibold text-base text-[#2B2A28]">
              {item.title}
            </div>
            {item.comment && (
              <p className="text-sm text-[#8A847D] mt-0.5">{item.comment}</p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* De quem é a vez */}
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isMyTurn
                    ? 'text-white bg-[#4D989B]'
                    : 'text-[#8A847D] bg-[#E9E4DF]'
                }`}
              >
                {isMyTurn ? 'Sua vez' : `Vez do(a) ${partnerName}`}
              </span>

              {rotates && (
                <span className="text-xs text-[#8A847D] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  reveza
                </span>
              )}

              {lastDoneLabel && (
                <span className="text-xs text-[#8A847D]">
                  {item.choreLastDoneBy} fez {lastDoneLabel}
                </span>
              )}
            </div>
          </div>

          {/* Excluir */}
          <button
            onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
            aria-label={confirmDelete ? 'Confirmar exclusão' : 'Excluir tarefa'}
          >
            <Trash2 className={`w-4 h-4 ${confirmDelete ? 'text-destructive' : 'text-[#8A847D]/70'}`} />
          </button>
        </div>

        {/* Botão de concluir */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleDone}
          className={`w-full mt-3 py-2.5 rounded-2xl font-['Quicksand',sans-serif] font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
            isMyTurn
              ? 'bg-[#4D989B] text-white hover:opacity-90'
              : 'bg-[#F8F6F4] text-[#2B2A28] border-2 border-[#E9E4DF] hover:bg-[#E9E4DF]'
          }`}
        >
          <Check className="w-4 h-4" />
          {isMyTurn ? 'Fiz!' : 'Fiz eu mesmo(a)'}
        </motion.button>
      </CardContent>
    </Card>
  );
}

interface ChoreBalanceProps {
  items: ListItem[];
  userProfile: Profile;
}

/**
 * Placar de justiça: quantas tarefas cada um já fez. A pesquisa sobre apps de
 * tarefa é explícita que o que muda o comportamento é a *visibilidade* da
 * divisão, não a cobrança — por isso é um placar, sem ranking nem punição.
 */
export function ChoreBalance({ items, userProfile }: ChoreBalanceProps) {
  const chores = items.filter(i => i.category === 'chore');
  if (chores.length === 0) return null;

  const partnerName: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const countFor = (name: Profile) =>
    chores.reduce((total, chore) => {
      // Cada tarefa guarda só o total e quem fez a última; o histórico completo
      // não é gravado, então o placar aproxima dividindo pelo dono atual.
      const done = chore.choreDoneCount || 0;
      if (done === 0) return total;
      const lastBy = chore.choreLastDoneBy;
      if (chore.choreRotates === false) return total + (lastBy === name ? done : 0);
      // Com rodízio, as conclusões alternam: metade pra cada, com o resto
      // ficando com quem fez a última.
      const half = Math.floor(done / 2);
      const extra = done % 2 === 1 && lastBy === name ? 1 : 0;
      return total + half + extra;
    }, 0);

  const mine = countFor(userProfile);
  const theirs = countFor(partnerName);
  const total = mine + theirs;
  const minePct = total === 0 ? 50 : Math.round((mine / total) * 100);
  const myTurnCount = chores.filter(c => (c.choreAssignee || userProfile) === userProfile).length;

  return (
    <div className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] p-4 mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-['Quicksand',sans-serif] font-bold text-xs uppercase tracking-tight text-[#4D989B]">
          🧹 Divisão das tarefas
        </p>
        <p className="text-xs text-muted-foreground">
          {myTurnCount === 0
            ? 'Nada na sua vez agora'
            : `${myTurnCount} na sua vez`}
        </p>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguém concluiu nada ainda — o placar aparece depois da primeira.
        </p>
      ) : (
        <>
          <div className="h-3 rounded-full bg-[#E9E4DF] overflow-hidden flex">
            <div className="bg-[#4D989B] h-full" style={{ width: `${minePct}%` }} />
            <div className="bg-[#C8A2C8] h-full" style={{ width: `${100 - minePct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs font-['Quicksand',sans-serif]">
            <span className="text-[#4D989B] font-bold">Você · {mine}</span>
            <span className="text-[#8A847D]">{partnerName} · {theirs}</span>
          </div>
        </>
      )}
    </div>
  );
}
