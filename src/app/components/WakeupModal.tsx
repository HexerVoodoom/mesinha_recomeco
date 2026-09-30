import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Play, Square, AlertTriangle, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Profile,
  type Wakeup,
  type WakeupInput,
  type WakeupPermissions,
  DAY_LETTERS,
  WAKEUP_MAX_RING_MS,
  WAKEUP_MIN_VOLUME,
  WAKEUP_NOTE_MAX,
  describeDays,
  describeNext,
  hasNativeWakeups,
  nativeWakeupPermissions,
  nextOccurrence,
  notifyNativeWakeupsChanged,
  oneShotDateFor,
  openNativeWakeupSettings,
  targetsOf,
  wakeupApi,
} from '../utils/wakeups';
import { playWakeupTune, stopWakeupTune } from '../utils/wakeupTune';

interface WakeupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: Profile;
}

/** Evento que avisa o tocador do navegador (WakeupWebRinger) que a lista mudou. */
export const WAKEUPS_CHANGED_EVENT = 'mesinha-wakeups-changed';

const PERMISSION_TEXTS: Record<keyof WakeupPermissions, { title: string; why: string }> = {
  exact: { title: 'Alarmes e lembretes', why: 'pra tocar no minuto certo, mesmo com o celular dormindo' },
  fullScreen: { title: 'Tela cheia', why: 'pra aparecer por cima da tela de bloqueio' },
  notifications: { title: 'Notificações', why: 'sem elas o Android esconde o despertador' },
  battery: { title: 'Bateria sem restrição', why: 'algumas marcas matam o app e o despertador não toca' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function emptyForm(): WakeupInput {
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  return {
    target: 'both',
    time: `${pad(soon.getHours())}:00`,
    days: [],
    date: null,
    volume: 70,
    note: '',
    enabled: true,
  };
}

export function WakeupModal({ isOpen, onClose, userProfile }: WakeupModalProps) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const partnerPrep = partner === 'Amanda' ? 'pra Amanda' : 'pro Mateus';
  const native = hasNativeWakeups();

  const [wakeups, setWakeups] = useState<Wakeup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Wakeup | 'new' | null>(null);
  const [form, setForm] = useState<WakeupInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [perms, setPerms] = useState<WakeupPermissions | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setWakeups(await wakeupApi.list());
    } catch (_) {
      // mantém o que já estava na tela
    } finally {
      setLoading(false);
    }
  }, []);

  const changed = () => {
    notifyNativeWakeupsChanged();
    window.dispatchEvent(new Event(WAKEUPS_CHANGED_EVENT));
  };

  // Enquanto aberto: atualiza o status a cada 8s (pra ver "tocando" virar
  // "desligou" ao vivo) e relê as permissões ao voltar das configurações.
  useEffect(() => {
    if (!isOpen) return;
    load();
    setPerms(nativeWakeupPermissions());
    const poll = window.setInterval(() => { load(); setTick(t => t + 1); }, 8000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') { setPerms(nativeWakeupPermissions()); load(); }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen || !editing) { stopWakeupTune(); setPreviewing(false); }
  }, [isOpen, editing]);

  const close = () => {
    setEditing(null);
    onClose();
  };

  const openNew = () => {
    setForm(emptyForm());
    setEditing('new');
  };

  const openEdit = (w: Wakeup) => {
    setForm({ target: w.target, time: w.time, days: w.days, date: w.date, volume: w.volume, note: w.note, enabled: w.enabled });
    setEditing(w);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // "Uma vez": a data é a próxima vez que esse horário acontece.
      const input: WakeupInput = {
        ...form,
        date: form.days.length ? null : oneShotDateFor(form.time),
        volume: Math.max(WAKEUP_MIN_VOLUME, form.volume),
        enabled: true,
      };
      if (editing === 'new') {
        await wakeupApi.create(userProfile, input);
        toast.success(form.target === userProfile ? 'Despertador criado ⏰' : `Despertador criado! ${partner} vai ser avisad${partner === 'Amanda' ? 'a' : 'o'} ⏰`);
      } else if (editing) {
        await wakeupApi.update(editing.id, input);
        toast.success('Despertador atualizado ⏰');
      }
      changed();
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu pra salvar o despertador');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (w: Wakeup) => {
    const enabled = !w.enabled;
    setWakeups(list => list.map(x => (x.id === w.id ? { ...x, enabled } : x)));
    try {
      // Religando um "uma vez" que já passou: vale pra próxima vez desse horário.
      const date = !w.days.length && enabled ? oneShotDateFor(w.time) : w.date;
      await wakeupApi.update(w.id, { enabled, date });
      changed();
      load();
    } catch (_) {
      toast.error('Não deu pra mudar agora');
      load();
    }
  };

  const remove = async (w: Wakeup) => {
    if (!window.confirm(`Apagar o despertador das ${w.time}?`)) return;
    try {
      await wakeupApi.remove(w.id);
      changed();
      setEditing(null);
      await load();
    } catch (_) {
      toast.error('Não deu pra apagar agora');
    }
  };

  const togglePreview = async () => {
    if (previewing) {
      stopWakeupTune();
      setPreviewing(false);
      return;
    }
    const ok = await playWakeupTune(form.volume, true);
    setPreviewing(ok);
    if (!ok) toast.error('O navegador não deixou tocar o som');
  };

  const targetLabel = (w: Pick<Wakeup, 'target'>) =>
    w.target === 'both' ? 'pra vocês dois' : w.target === userProfile ? 'pra você' : partnerPrep;

  const missingPerms = native && perms
    ? (Object.keys(PERMISSION_TEXTS) as (keyof WakeupPermissions)[]).filter(k => perms[k] === false)
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/40 z-[60]"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-card rounded-t-3xl z-[70] border-t-2 border-[#4D989B]/10 max-h-[90vh] overflow-hidden flex flex-col"
            style={{
              maxWidth: 390,
              boxShadow: '0 -4px 20px rgba(77, 152, 155, 0.08), 0 -1px 4px rgba(77, 152, 155, 0.04)',
            }}
          >
            <div className="px-6 py-6 overflow-y-auto flex-1 font-['Quicksand',sans-serif]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  {editing && (
                    <button onClick={() => setEditing(null)} className="p-2 -ml-2 hover:bg-muted rounded-full" aria-label="Voltar">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <h2 className="text-2xl font-medium">
                    {editing === 'new' ? 'Novo despertador' : editing ? 'Editar despertador' : 'Despertador ⏰'}
                  </h2>
                </div>
                <button onClick={close} className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!editing ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Toca na hora mesmo com o Mesinha fechado. Pra desligar, tem que escolher um recadinho — que vai pro outro 💌
                  </p>

                  {missingPerms.length > 0 && (
                    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 mb-2 text-amber-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-bold text-sm">Falta liberar pra tocar certinho</span>
                      </div>
                      <div className="space-y-2">
                        {missingPerms.map(k => (
                          <div key={k} className="flex items-center gap-3">
                            <div className="flex-1 text-sm text-amber-900">
                              <span className="font-bold">{PERMISSION_TEXTS[k].title}</span>
                              <span className="block text-xs text-amber-800/80">{PERMISSION_TEXTS[k].why}</span>
                            </div>
                            <button
                              onClick={() => openNativeWakeupSettings(k)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-bold"
                            >
                              Liberar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!native && (
                    <div className="mb-4 rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                      No navegador o despertador só toca com o Mesinha aberto. Com o app Android instalado ele toca com tudo fechado, até no silencioso.
                    </div>
                  )}

                  {loading ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
                  ) : wakeups.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Nenhum despertador ainda. Que tal um pra acordar o mozão amanhã? ☀️
                    </p>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {wakeups.map(w => (
                        <WakeupCard
                          key={w.id}
                          wakeup={w}
                          userProfile={userProfile}
                          targetLabel={targetLabel(w)}
                          onEdit={() => openEdit(w)}
                          onToggle={() => toggle(w)}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    onClick={openNew}
                    className="w-full py-3 rounded-xl bg-[#4D989B] text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Novo despertador
                  </button>
                </>
              ) : (
                <div className="space-y-5 pt-2">
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => e.target.value && setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full text-center text-5xl font-bold py-3 rounded-2xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  <div>
                    <label className="text-base font-medium mb-2 block">Pra quem?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        [userProfile, 'Pra mim'],
                        [partner, partnerPrep.replace('pr', 'Pr')],
                        ['both', 'Nós dois'],
                      ] as [WakeupInput['target'], string][]).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setForm(f => ({ ...f, target: value }))}
                          className={`py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                            form.target === value ? 'bg-[#4D989B] text-white border-[#4D989B]' : 'border-border bg-input-background'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-base font-medium mb-2 block">Repetir</label>
                    <div className="flex justify-between gap-1">
                      {DAY_LETTERS.map((letter, day) => {
                        const on = form.days.includes(day);
                        return (
                          <button
                            key={day}
                            onClick={() => setForm(f => ({
                              ...f,
                              days: on ? f.days.filter(d => d !== day) : [...f.days, day].sort(),
                            }))}
                            className={`w-10 h-10 rounded-full border text-sm font-bold transition-colors ${
                              on ? 'bg-[#4D989B] text-white border-[#4D989B]' : 'border-border bg-input-background'
                            }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {form.days.length
                        ? `Toca ${describeDays({ days: form.days, date: null })}`
                        : `Sem dia marcado: toca uma vez só, ${describeDays({ days: [], date: oneShotDateFor(form.time) })}`}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-base font-medium">Volume</label>
                      <span className="text-sm font-bold text-[#4D989B]">{form.volume}%</span>
                    </div>
                    <input
                      type="range"
                      min={WAKEUP_MIN_VOLUME}
                      max={100}
                      step={5}
                      value={form.volume}
                      onChange={e => setForm(f => ({ ...f, volume: Math.max(WAKEUP_MIN_VOLUME, Number(e.target.value)) }))}
                      className="w-full accent-[#4D989B]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo de {WAKEUP_MIN_VOLUME}% — toca até no silencioso e sobe o volume sozinho se estiver baixo.
                    </p>
                  </div>

                  <button
                    onClick={togglePreview}
                    className="w-full py-2.5 rounded-xl border border-[#4D989B] text-[#4D989B] font-bold flex items-center justify-center gap-2"
                  >
                    {previewing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {previewing ? 'Parar' : 'Ouvir o toque (Abertura de Anime)'}
                  </button>

                  <div>
                    <label className="text-base font-medium mb-2 block">Recadinho (opcional)</label>
                    <input
                      type="text"
                      value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value.substring(0, WAKEUP_NOTE_MAX) }))}
                      placeholder="Aparece na tela quando tocar"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex gap-2 pb-2">
                    {editing !== 'new' && (
                      <button
                        onClick={() => remove(editing)}
                        className="px-4 rounded-xl border border-destructive/40 text-destructive flex items-center justify-center"
                        aria-label="Apagar despertador"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={save}
                      disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-[#4D989B] text-white font-bold disabled:opacity-50"
                    >
                      {saving ? 'Salvando…' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function WakeupCard({ wakeup: w, userProfile, targetLabel, onEdit, onToggle }: {
  wakeup: Wakeup;
  userProfile: Profile;
  targetLabel: string;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const next = nextOccurrence(w);
  return (
    <div
      onClick={onEdit}
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
        w.enabled ? 'border-[#4D989B]/30 bg-[#F8F6F4]' : 'border-border bg-muted/30 opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-4xl font-bold leading-none text-[#2B2A28]">{w.time}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {describeDays(w)} · {targetLabel}
            {w.createdBy !== userProfile && ` · de ${w.createdBy}`}
          </div>
          {w.note && <div className="text-sm mt-1 truncate">“{w.note}”</div>}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${w.enabled ? 'bg-[#4D989B]' : 'bg-[#E9E4DF]'}`}
          aria-label={w.enabled ? 'Desligar despertador' : 'Ligar despertador'}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${w.enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      <div className="mt-3 space-y-1">
        {targetsOf(w).map(p => (
          <RingStatus key={p} wakeup={w} person={p} userProfile={userProfile} />
        ))}
        {w.enabled && <div className="text-xs text-muted-foreground">⏭️ Próximo: {describeNext(next)}</div>}
      </div>
    </div>
  );
}

/** Status do último toque de uma pessoa: tocando / desligou (com o recado) / ninguém desligou. */
function RingStatus({ wakeup, person, userProfile }: { wakeup: Wakeup; person: Profile; userProfile: Profile }) {
  const r = wakeup.ring?.[person];
  if (!r) return null;
  const who = person === userProfile ? 'Você' : person;
  const started = new Date(r.startedAt).getTime();
  const sameDay = new Date(r.startedAt).toDateString() === new Date().toDateString();
  const when = sameDay ? '' : ` (${new Date(r.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;

  if (r.status === 'ringing') {
    if (Date.now() - started > WAKEUP_MAX_RING_MS + 5 * 60 * 1000) {
      return <div className="text-xs text-muted-foreground">❓ Tocou às {hhmm(r.startedAt)}{when} e o celular não respondeu mais</div>;
    }
    return (
      <div className="text-sm font-bold text-[#C2410C] flex items-center gap-2">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-orange-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-orange-500" />
        </span>
        🔔 Tocando agora {person === userProfile ? 'pra você' : person === 'Amanda' ? 'pra Amanda' : 'pro Mateus'}…
      </div>
    );
  }
  if (r.status === 'dismissed') {
    return (
      <div className="text-xs text-[#2B2A28]">
        ✅ {who} desligou às {hhmm(r.endedAt)}{when}{r.message ? <> — <span className="font-bold">“{r.message}”</span></> : null}
      </div>
    );
  }
  return <div className="text-xs text-muted-foreground">😴 Tocou às {hhmm(r.startedAt)}{when} e {who === 'Você' ? 'você não desligou' : `${who} não desligou`}</div>;
}
