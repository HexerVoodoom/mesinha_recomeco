import { useEffect, useState } from 'react';
import { MessagesSquare, Plus, Trash2, Loader2 } from 'lucide-react';
import { api, DuplaPhrase, WIDGET_PHRASE_MAX_LEN, WIDGET_PHRASE_MAX_COUNT } from '../utils/api';
import { toast } from 'sonner';

type CharacterField = 'corvinho' | 'alpaquinha';
type Tab = 'perguntas' | 'respostas';

const LABEL: Record<CharacterField, string> = {
  corvinho: 'Corvinho 🐦‍⬛',
  alpaquinha: 'Alpaquinha 🦙',
};

function askerOf(pair: DuplaPhrase): CharacterField {
  return pair.asker === 'alpaquinha' ? 'alpaquinha' : 'corvinho';
}

function otherOf(field: CharacterField): CharacterField {
  return field === 'corvinho' ? 'alpaquinha' : 'corvinho';
}

/**
 * Editor da conversa do widget duplo, dividido em duas abas:
 * - "Perguntas": a fala de quem inicia cada par.
 * - "Respostas": a fala de quem responde nesse mesmo par.
 *
 * Cada pessoa só edita a fala do seu personagem, esteja ela perguntando ou
 * respondendo — Mateus mexe no lado do Corvinho, Amanda no da Alpaquinha. O
 * lado do outro sempre aparece travado (o servidor também garante isso).
 */
export function DuplaPhrasesEditor({ profile }: { profile: 'Amanda' | 'Mateus' }) {
  const ownField: CharacterField = profile === 'Mateus' ? 'corvinho' : 'alpaquinha';

  const [pairs, setPairs] = useState<DuplaPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('perguntas');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.getWidgetPhrases();
        if (active) setPairs(Array.isArray(data.dupla) ? data.dupla : []);
      } catch (e) {
        console.error('Falha ao carregar a conversa do widget:', e);
        if (active) toast.error('Não foi possível carregar a conversa');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateField = (i: number, field: CharacterField, value: string) => {
    setPairs((prev) =>
      prev.map((pair, idx) =>
        idx === i ? { ...pair, [field]: value.slice(0, WIDGET_PHRASE_MAX_LEN) } : pair
      )
    );
  };

  const removeAt = (i: number) => setPairs((prev) => prev.filter((_, idx) => idx !== i));

  const addPair = () => {
    if (pairs.length >= WIDGET_PHRASE_MAX_COUNT) {
      toast.info(`Máximo de ${WIDGET_PHRASE_MAX_COUNT} falas`);
      return;
    }
    // A pergunta nova nasce com o personagem de quem está adicionando; a
    // resposta fica em branco até o outro preencher a dela na aba Respostas.
    setPairs((prev) => [...prev, { corvinho: '', alpaquinha: '', asker: ownField }]);
  };

  const handleSave = async () => {
    const cleaned = pairs
      .map((p) => ({ ...p, [ownField]: p[ownField].trim() }) as DuplaPhrase)
      .filter((p) => p.corvinho.trim().length > 0 || p.alpaquinha.trim().length > 0);
    if (cleaned.length === 0) {
      toast.error('Adicione pelo menos uma fala');
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateDuplaPhrases(cleaned, profile);
      const data = await api.getWidgetPhrases();
      setPairs(Array.isArray(data.dupla) ? data.dupla : cleaned);
      toast.success(`Conversa salva! (${res.count})`);
    } catch (e) {
      console.error('Falha ao salvar a conversa:', e);
      toast.error('Falha ao salvar a conversa');
    } finally {
      setSaving(false);
    }
  };

  // field mostrado na aba atual, por par: quem pergunta ou quem responde.
  const fieldForTab = (pair: DuplaPhrase): CharacterField =>
    tab === 'perguntas' ? askerOf(pair) : otherOf(askerOf(pair));

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <MessagesSquare className="w-6 h-6" />
          <div className="text-left">
            <div className="text-base font-medium">Conversa do widget 🐦‍⬛🦙</div>
            <div className="text-sm text-muted-foreground">Editar sua parte da conversa dupla</div>
          </div>
        </div>
        <span className="text-sm text-primary font-medium">{open ? 'Fechar' : 'Abrir'}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando conversa...
            </div>
          ) : (
            <>
              <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
                <button
                  onClick={() => setTab('perguntas')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    tab === 'perguntas' ? 'bg-card shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Perguntas
                </button>
                <button
                  onClick={() => setTab('respostas')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    tab === 'respostas' ? 'bg-card shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Respostas
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                {tab === 'perguntas'
                  ? 'A fala de quem começa a conversa em cada par.'
                  : 'A fala de quem responde, no mesmo par da aba Perguntas.'}{' '}
                Cada fala tem no máximo {WIDGET_PHRASE_MAX_LEN} caracteres — você só edita a do{' '}
                {LABEL[ownField].split(' ')[0]}.
              </p>

              {pairs.map((pair, i) => {
                const field = fieldForTab(pair);
                const editable = field === ownField;
                return (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {LABEL[field]}
                      {!editable && ' (edição do outro)'}
                    </label>
                    <input
                      type="text"
                      value={pair[field]}
                      disabled={!editable}
                      maxLength={WIDGET_PHRASE_MAX_LEN}
                      onChange={(e) => editable && updateField(i, field, e.target.value)}
                      placeholder={editable ? 'Digite sua fala...' : 'Ainda sem fala...'}
                      className={
                        editable
                          ? 'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'
                          : 'w-full px-3 py-2 rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed'
                      }
                    />
                    {editable && (
                      <div className="text-[10px] text-muted-foreground text-right">
                        {pair[field].length}/{WIDGET_PHRASE_MAX_LEN}
                      </div>
                    )}

                    <button
                      onClick={() => removeAt(i)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover par
                    </button>
                  </div>
                );
              })}

              {tab === 'perguntas' && (
                <button
                  onClick={addPair}
                  className="flex items-center gap-2 text-sm text-primary font-medium py-1"
                >
                  <Plus className="w-4 h-4" /> Adicionar pergunta
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-lg bg-primary text-white font-medium transition-opacity disabled:opacity-60 mt-1"
              >
                {saving ? 'Salvando...' : 'Salvar minha parte'}
              </button>

              <p className="text-[11px] text-muted-foreground text-center">
                O widget da tela inicial pega a conversa nova em algumas horas (ou na virada do dia).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
