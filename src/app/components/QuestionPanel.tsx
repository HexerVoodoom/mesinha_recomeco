import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Send, Plus, Trash2, Sparkles, Lock } from 'lucide-react';
import { api, QuestionOfTheDay, HIDDEN_ANSWER } from '../utils/api';
import { toast } from 'sonner';

interface QuestionPanelProps {
  userProfile: 'Amanda' | 'Mateus';
}

/**
 * Pergunta do Dia: uma pergunta por dia, igual pros dois. Cada um responde sem
 * ver a do outro — o servidor só revela quando os DOIS responderam.
 *
 * O banco de perguntas é escrito por vocês: é o que resolve estruturalmente a
 * reclamação nº 1 contra Paired/Couply ("as perguntas acabam e repetem"), já
 * que um app comercial precisa de conteúdo genérico e esse aqui não.
 */
export function QuestionPanel({ userProfile }: QuestionPanelProps) {
  const [question, setQuestion] = useState<QuestionOfTheDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Banco de perguntas
  const [showBank, setShowBank] = useState(false);
  const [bank, setBank] = useState<string[]>([]);
  const [bankPending, setBankPending] = useState(0);
  const [newQuestion, setNewQuestion] = useState('');

  const partnerName = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const myAnswer = userProfile === 'Amanda' ? question?.answerAmanda : question?.answerMateus;
  const partnerAnswer = userProfile === 'Amanda' ? question?.answerMateus : question?.answerAmanda;
  const partnerAnswered = !!partnerAnswer;
  const partnerHidden = partnerAnswer === HIDDEN_ANSWER;

  useEffect(() => {
    api.getQuestionOfTheDay(userProfile)
      .then(setQuestion)
      .catch(() => toast.error('Não deu pra carregar a pergunta de hoje'))
      .finally(() => setLoading(false));
  }, [userProfile]);

  const loadBank = () => {
    api.getQuestionBank()
      .then(r => { setBank(r.questions); setBankPending(r.pending); })
      .catch(() => toast.error('Não deu pra carregar o banco de perguntas'));
  };

  const toggleBank = () => {
    const next = !showBank;
    setShowBank(next);
    if (next && bank.length === 0) loadBank();
  };

  const submitAnswer = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const updated = await api.answerQuestionOfTheDay(userProfile, draft);
      setQuestion(updated);
      setDraft('');
      toast.success(updated.revealed ? 'Respondido! As duas respostas foram reveladas 💬' : `Respondido! Agora é a vez do ${partnerName}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu pra enviar a resposta');
    } finally {
      setSending(false);
    }
  };

  const addQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      const result = await api.addQuestionToBank(userProfile, newQuestion);
      setBank(prev => [...prev, newQuestion.trim()]);
      setBankPending(p => p + 1);
      setNewQuestion('');
      toast.success(`Pergunta guardada! ${result.count} no banco de vocês.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu pra guardar a pergunta');
    }
  };

  const removeQuestion = async (q: string) => {
    try {
      await api.removeQuestionFromBank(q);
      setBank(prev => prev.filter(item => item !== q));
      setBankPending(p => Math.max(0, p - 1));
    } catch {
      toast.error('Não deu pra remover');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground px-6">Carregando a pergunta de hoje...</div>;
  }

  return (
    <div className="px-6 pb-24">
      {/* A pergunta */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] p-5 mb-4"
      >
        <p className="font-['Quicksand',sans-serif] font-bold text-xs uppercase tracking-tight text-[#4D989B] mb-2">
          💭 Pergunta de hoje
        </p>
        <p className="font-['Quicksand',sans-serif] font-bold text-lg text-[#2B2A28] leading-snug">
          {question?.question}
        </p>
      </motion.div>

      {/* Minha resposta */}
      {myAnswer && myAnswer !== HIDDEN_ANSWER ? (
        <div className="rounded-2xl border-2 border-[#4D989B]/30 bg-white p-4 mb-3">
          <p className="text-xs font-bold uppercase tracking-tight text-[#4D989B] mb-1">Você respondeu</p>
          <p className="font-['Quicksand',sans-serif] text-[#2B2A28] whitespace-pre-wrap">{myAnswer}</p>
        </div>
      ) : (
        <div className="mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreve sua resposta..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <button
            onClick={submitAnswer}
            disabled={sending || !draft.trim()}
            className="mt-2 w-full py-3 rounded-2xl bg-[#4D989B] text-white font-['Quicksand',sans-serif] font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          >
            <Send className="w-4 h-4" />
            Responder
          </button>
        </div>
      )}

      {/* Resposta do parceiro */}
      <div className="rounded-2xl border-2 border-[#E9E4DF] bg-white p-4 mb-6">
        <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-1">
          {partnerName}
        </p>
        {partnerHidden ? (
          <p className="font-['Quicksand',sans-serif] text-[#8A847D] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#4D989B]" />
            Já respondeu! Responde também pra revelar as duas.
          </p>
        ) : partnerAnswered ? (
          <p className="font-['Quicksand',sans-serif] text-[#2B2A28] whitespace-pre-wrap">{partnerAnswer}</p>
        ) : (
          <p className="font-['Quicksand',sans-serif] text-[#8A847D]">
            Ainda não respondeu hoje.
          </p>
        )}
      </div>

      {/* Banco de perguntas de vocês */}
      <button
        onClick={toggleBank}
        className="w-full rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] px-4 py-3 flex items-center gap-3 hover:bg-[#E9E4DF]/50 transition-colors"
      >
        <Sparkles className="w-5 h-5 text-[#4D989B]" strokeWidth={1.5} />
        <div className="flex-1 text-left">
          <p className="font-['Quicksand',sans-serif] font-bold text-sm text-[#2B2A28]">
            Perguntas de vocês
          </p>
          <p className="text-xs text-muted-foreground">
            Escreva perguntas que vão aparecer nos próximos dias
          </p>
        </div>
        {bankPending > 0 && (
          <span className="text-xs font-bold text-[#4D989B] bg-[#4D989B]/10 px-2 py-0.5 rounded-full">
            {bankPending} na fila
          </span>
        )}
      </button>

      {showBank && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value.substring(0, 200))}
              onKeyDown={(e) => { if (e.key === 'Enter') addQuestion(); }}
              placeholder={`Ex: o que você mais gosta em nós dois?`}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
            <button
              onClick={addQuestion}
              disabled={!newQuestion.trim()}
              className="px-4 rounded-xl bg-[#4D989B] text-white disabled:opacity-40 flex items-center justify-center"
              aria-label="Adicionar pergunta"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {bank.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Banco vazio — por enquanto entram as perguntas padrão.
              </p>
            ) : (
              bank.map(q => (
                <div key={q} className="flex items-center gap-2 rounded-xl border border-[#E9E4DF] bg-white px-3 py-2">
                  <p className="flex-1 text-sm font-['Quicksand',sans-serif] text-[#2B2A28]">{q}</p>
                  <button
                    onClick={() => removeQuestion(q)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label="Remover pergunta"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
