import { useEffect, useState } from 'react';
import { MessagesSquare, Plus, Trash2, Loader2 } from 'lucide-react';
import { api, DuplaPhrase, WIDGET_PHRASE_MAX_LEN, WIDGET_PHRASE_MAX_COUNT } from '../utils/api';
import { toast } from 'sonner';

/**
 * Editor da conversa do widget duplo (Corvinho + Alpaquinha na mesma tela).
 * Cada par tem uma fala de cada personagem, mas cada pessoa só edita a sua:
 * Mateus mexe no lado do Corvinho, Amanda no lado da Alpaquinha — o lado do
 * outro aparece travado (o servidor também garante isso, nunca confiando no
 * que vier do cliente pro campo alheio).
 */
export function DuplaPhrasesEditor({ profile }: { profile: 'Amanda' | 'Mateus' }) {
  const ownField: keyof DuplaPhrase = profile === 'Mateus' ? 'corvinho' : 'alpaquinha';
  const otherField: keyof DuplaPhrase = ownField === 'corvinho' ? 'alpaquinha' : 'corvinho';
  const ownLabel = ownField === 'corvinho' ? 'Corvinho 🐦‍⬛' : 'Alpaquinha 🦙';
  const otherLabel = otherField === 'corvinho' ? 'Corvinho 🐦‍⬛' : 'Alpaquinha 🦙';

  const [pairs, setPairs] = useState<DuplaPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

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

  const updateOwn = (i: number, value: string) => {
    setPairs((prev) =>
      prev.map((pair, idx) =>
        idx === i ? { ...pair, [ownField]: value.slice(0, WIDGET_PHRASE_MAX_LEN) } : pair
      )
    );
  };

  const removeAt = (i: number) => setPairs((prev) => prev.filter((_, idx) => idx !== i));

  const addPair = () => {
    if (pairs.length >= WIDGET_PHRASE_MAX_COUNT) {
      toast.info(`Máximo de ${WIDGET_PHRASE_MAX_COUNT} falas`);
      return;
    }
    setPairs((prev) => [...prev, { corvinho: '', alpaquinha: '' }]);
  };

  const handleSave = async () => {
    const cleaned = pairs
      .map((p) => ({ ...p, [ownField]: p[ownField].trim() }) as DuplaPhrase)
      .filter((p) => p[ownField].length > 0 || p[otherField].trim().length > 0);
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
              <p className="text-xs text-muted-foreground">
                Cada fala tem no máximo {WIDGET_PHRASE_MAX_LEN} caracteres. Você só edita a fala do{' '}
                {ownLabel.split(' ')[0]}; a do {otherLabel.split(' ')[0]} fica travada aqui, pra edição
                do outro.
              </p>

              {pairs.map((pair, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {ownLabel}
                    </label>
                    <input
                      type="text"
                      value={pair[ownField]}
                      maxLength={WIDGET_PHRASE_MAX_LEN}
                      onChange={(e) => updateOwn(i, e.target.value)}
                      placeholder="Digite sua fala..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                      {pair[ownField].length}/{WIDGET_PHRASE_MAX_LEN}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {otherLabel} (edição do outro)
                    </label>
                    <input
                      type="text"
                      value={pair[otherField]}
                      disabled
                      placeholder="Ainda sem fala..."
                      className="w-full px-3 py-2 rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <button
                    onClick={() => removeAt(i)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover par
                  </button>
                </div>
              ))}

              <button
                onClick={addPair}
                className="flex items-center gap-2 text-sm text-primary font-medium py-1"
              >
                <Plus className="w-4 h-4" /> Adicionar par de falas
              </button>

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
