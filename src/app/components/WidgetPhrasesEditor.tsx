import { useEffect, useState } from 'react';
import { MessageCircle, Plus, Trash2, Loader2 } from 'lucide-react';
import { api, WIDGET_PHRASE_MAX_LEN, WIDGET_PHRASE_MAX_COUNT } from '../utils/api';
import { toast } from 'sonner';

/**
 * Editor das falas do widget. Cada pessoa edita só as suas:
 * - Mateus edita as falas do Corvinho (lista "mateus")
 * - Amanda edita as falas da Alpaquinha (lista "amanda")
 *
 * As falas são salvas no servidor e o widget da tela inicial pega a lista nova
 * automaticamente (em até algumas horas / na virada do dia).
 */
export function WidgetPhrasesEditor({ profile }: { profile: 'Amanda' | 'Mateus' }) {
  const list: 'amanda' | 'mateus' = profile === 'Amanda' ? 'amanda' : 'mateus';
  const personagem = profile === 'Amanda' ? 'Alpaquinha' : 'Corvinho';
  const emoji = profile === 'Amanda' ? '🦙' : '🐦‍⬛';

  const [phrases, setPhrases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.getWidgetPhrases();
        if (active) setPhrases(Array.isArray(data[list]) ? data[list] : []);
      } catch (e) {
        console.error('Falha ao carregar falas do widget:', e);
        if (active) toast.error('Não foi possível carregar as falas');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [list]);

  const updateAt = (i: number, value: string) => {
    setPhrases((prev) => prev.map((p, idx) => (idx === i ? value.slice(0, WIDGET_PHRASE_MAX_LEN) : p)));
  };

  const removeAt = (i: number) => setPhrases((prev) => prev.filter((_, idx) => idx !== i));

  const addPhrase = () => {
    if (phrases.length >= WIDGET_PHRASE_MAX_COUNT) {
      toast.info(`Máximo de ${WIDGET_PHRASE_MAX_COUNT} falas`);
      return;
    }
    setPhrases((prev) => [...prev, '']);
  };

  const handleSave = async () => {
    const cleaned = phrases.map((p) => p.trim()).filter((p) => p.length > 0);
    if (cleaned.length === 0) {
      toast.error('Adicione pelo menos uma fala');
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateWidgetPhrases(list, cleaned, profile);
      setPhrases(cleaned);
      toast.success(`Falas do ${personagem} salvas! (${res.count})`);
    } catch (e) {
      console.error('Falha ao salvar falas:', e);
      toast.error('Falha ao salvar as falas');
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
          <MessageCircle className="w-6 h-6" />
          <div className="text-left">
            <div className="text-base font-medium">Falas do {personagem} {emoji}</div>
            <div className="text-sm text-muted-foreground">Editar o que aparece no seu widget</div>
          </div>
        </div>
        <span className="text-sm text-primary font-medium">{open ? 'Fechar' : 'Abrir'}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando falas...
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Cada fala tem no máximo {WIDGET_PHRASE_MAX_LEN} caracteres. O widget mostra uma por dia.
              </p>

              {phrases.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={p}
                      maxLength={WIDGET_PHRASE_MAX_LEN}
                      onChange={(e) => updateAt(i, e.target.value)}
                      placeholder="Digite uma fala..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                      {p.length}/{WIDGET_PHRASE_MAX_LEN}
                    </div>
                  </div>
                  <button
                    onClick={() => removeAt(i)}
                    className="p-2 mt-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remover fala"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={addPhrase}
                className="flex items-center gap-2 text-sm text-primary font-medium py-1"
              >
                <Plus className="w-4 h-4" /> Adicionar fala
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-lg bg-primary text-white font-medium transition-opacity disabled:opacity-60 mt-1"
              >
                {saving ? 'Salvando...' : 'Salvar falas'}
              </button>

              <p className="text-[11px] text-muted-foreground text-center">
                O widget da tela inicial pega as falas novas em algumas horas (ou na virada do dia).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
