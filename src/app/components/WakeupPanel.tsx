import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Play, Square, BellRing, Volume1, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Profile,
  type Wakeup,
  type WakeupInput,
  type WakeupPermissions,
  CHARACTER,
  DAY_LETTERS,
  WAKEUPS_CHANGED_EVENT,
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
  toPrep,
  wakeupApi,
} from '../utils/wakeups';
import { playWakeupTune, stopWakeupTune } from '../utils/wakeupTune';

// Despertador: painel na mesma linguagem da Pergunta do Dia e do Jardim —
// cards creme com borda bege, selinhos em caixa alta e o elenco da casa
// (Corvinho = Mateus, Alpaquinha = Amanda) falando nos balõezinhos.

const PERMISSION_TEXTS: Record<keyof WakeupPermissions, { title: string; why: string }> = {
  exact: { title: 'Alarmes e lembretes', why: 'pra tocar no minutinho certo, mesmo com o celular dormindo' },
  fullScreen: { title: 'Tela cheia', why: 'pra aparecer por cima da tela de bloqueio' },
  notifications: { title: 'Notificações', why: 'sem elas o Android esconde o despertador' },
  battery: { title: 'Bateria sem restrição', why: 'algumas marcas desligam a Mesinha e aí não toca' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Carinha do Corvinho/Alpaquinha (pixel art — sem borrar ao aumentar). */
export function CharacterFace({ profile, className = 'w-10 h-10' }: { profile: Profile; className?: string }) {
  return (
    <img
      src={CHARACTER[profile].img}
      alt={CHARACTER[profile].name}
      className={`${className} object-contain select-none`}
      style={{ imageRendering: 'pixelated' }}
      draggable={false}
    />
  );
}

/** Balãozinho de fala, com a cor do personagem (igual aos widgets). */
export function SpeechBubble({ profile, children, side = 'left' }: { profile: Profile; children: React.ReactNode; side?: 'left' | 'right' }) {
  return (
    <div
      className={`px-3 py-2 text-white text-sm font-['Quicksand',sans-serif] font-bold leading-snug ${
        side === 'left' ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl rounded-br-sm'
      }`}
      style={{ background: CHARACTER[profile].bubble }}
    >
      {children}
    </div>
  );
}

function emptyForm(): WakeupInput {
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  return { target: 'both', time: `${pad(soon.getHours())}:00`, days: [], date: null, volume: 70, note: '', enabled: true };
}

interface WakeupPanelProps {
  userProfile: Profile;
}

export function WakeupPanel({ userProfile }: WakeupPanelProps) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const native = hasNativeWakeups();

  const [wakeups, setWakeups] = useState<Wakeup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Wakeup | 'new' | null>(null);
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

  const changed = useCallback(() => {
    notifyNativeWakeupsChanged();
    window.dispatchEvent(new Event(WAKEUPS_CHANGED_EVENT));
    load();
  }, [load]);

  // Status ao vivo: a cada 8s (pra ver "tocando" virar "desligou") e ao
  // voltar das configurações do Android (relê as permissões).
  useEffect(() => {
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
  }, [load]);

  const toggle = async (w: Wakeup) => {
    const enabled = !w.enabled;
    setWakeups(list => list.map(x => (x.id === w.id ? { ...x, enabled } : x)));
    try {
      // Religando um "uma vez" que já passou: vale pra próxima vez desse horário.
      const date = !w.days.length && enabled ? oneShotDateFor(w.time) : w.date;
      await wakeupApi.update(w.id, { enabled, date });
      changed();
    } catch (_) {
      toast.error('Não deu pra mudar agora');
      load();
    }
  };

  const missingPerms = native && perms
    ? (Object.keys(PERMISSION_TEXTS) as (keyof WakeupPermissions)[]).filter(k => perms[k] === false)
    : [];

  const ringingNow = wakeups.some(w => targetsOf(w).some(p => isRinging(w, p)));

  return (
    <div className="px-6 pb-24 font-['Quicksand',sans-serif]">
      {/* Cabeçalho: os dois dormindo, esperando o despertador */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] p-5 mb-4"
      >
        <p className="font-bold text-xs uppercase tracking-tight text-[#4D989B] mb-3">
          {ringingNow ? '🔔 Tem despertador tocando!' : 'Despertador'}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-end shrink-0">
            <motion.div animate={ringingNow ? { rotate: [-6, 6, -6] } : { y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: ringingNow ? 0.3 : 2.4 }}>
              <CharacterFace profile="Amanda" className="w-12 h-12" />
            </motion.div>
            <motion.div animate={ringingNow ? { rotate: [6, -6, 6] } : { y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: ringingNow ? 0.3 : 2.4, delay: 0.4 }}>
              <CharacterFace profile="Mateus" className="w-12 h-12" />
            </motion.div>
          </div>
          <p className="font-bold text-lg text-[#2B2A28] leading-snug">Acordar juntinho ☀️</p>
        </div>
        <p className="text-sm text-[#8A847D] leading-snug mt-3">
          Toca mesmo com a Mesinha fechada. Pra desligar, tem que mandar um recadinho pro outro 💌
        </p>
      </motion.div>

      {missingPerms.length > 0 && (
        <div className="rounded-2xl border-2 border-[#F6C177] bg-[#FFF8EC] p-4 mb-4">
          <p className="font-bold text-xs uppercase tracking-tight text-[#B7791F] mb-2">Falta liberar pra tocar certinho</p>
          <div className="space-y-3">
            {missingPerms.map(k => (
              <div key={k} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-bold text-sm text-[#2B2A28]">{PERMISSION_TEXTS[k].title}</p>
                  <p className="text-xs text-[#8A847D]">{PERMISSION_TEXTS[k].why}</p>
                </div>
                <button
                  onClick={() => openNativeWakeupSettings(k)}
                  className="px-3 py-1.5 rounded-full bg-[#F6C177] text-[#2B2A28] text-xs font-bold"
                >
                  Liberar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!native && (
        <div className="rounded-2xl border-2 border-[#E9E4DF] bg-white p-4 mb-4 flex gap-3 items-start">
          <span className="text-lg">📱</span>
          <p className="text-xs text-[#8A847D] leading-relaxed">
            No navegador o despertador só toca com a Mesinha aberta. No app Android ele toca com tudo fechado — até no silencioso.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Dando corda no despertador...</div>
      ) : wakeups.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E9E4DF] p-6 mb-4 flex flex-col items-center text-center">
          <div className="flex items-start gap-2 mb-3">
            <CharacterFace profile={userProfile} className="w-12 h-12" />
            <SpeechBubble profile={userProfile}>Bora criar um pra acordar {partner === 'Amanda' ? 'a Amanda' : 'o Mateus'} amanhã? ☀️</SpeechBubble>
          </div>
          <p className="text-sm text-[#8A847D]">Nenhum despertador ainda.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {wakeups.map(w => (
            <WakeupCard key={w.id} wakeup={w} userProfile={userProfile} onEdit={() => setEditing(w)} onToggle={() => toggle(w)} />
          ))}
        </div>
      )}

      <button
        onClick={() => setEditing('new')}
        className="w-full py-3 rounded-2xl bg-[#4D989B] text-white font-bold flex items-center justify-center gap-2 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
      >
        <Plus className="w-5 h-5" /> Novo despertador
      </button>

      <WakeupEditorSheet
        editing={editing}
        userProfile={userProfile}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); changed(); }}
      />
    </div>
  );
}

function isRinging(w: Wakeup, p: Profile): boolean {
  const r = w.ring?.[p];
  return r?.status === 'ringing' && Date.now() - new Date(r.startedAt).getTime() < WAKEUP_MAX_RING_MS + 5 * 60 * 1000;
}

function WakeupCard({ wakeup: w, userProfile, onEdit, onToggle }: {
  wakeup: Wakeup;
  userProfile: Profile;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const next = nextOccurrence(w);
  const targets = targetsOf(w);
  const ringing = targets.some(p => isRinging(w, p));
  const targetLabel = w.target === 'both' ? 'pra vocês dois' : w.target === userProfile ? 'pra você' : toPrep(w.target);

  return (
    <motion.div
      layout
      onClick={onEdit}
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
        ringing ? 'border-[#4D989B] bg-[#81D8D0]/15'
          : w.enabled ? 'border-[#E9E4DF] bg-white'
          : 'border-[#E9E4DF] bg-[#F8F6F4] opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex -space-x-3 shrink-0">
          {targets.map(p => (
            <motion.div key={p} animate={isRinging(w, p) ? { rotate: [-8, 8, -8] } : {}} transition={{ repeat: Infinity, duration: 0.3 }}>
              <CharacterFace profile={p} className="w-11 h-11" />
            </motion.div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[34px] font-bold leading-none text-[#2B2A28] tracking-tight">{w.time}</div>
          <div className="text-xs text-[#8A847D] mt-1 leading-snug">
            {describeDays(w)} · {targetLabel}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${w.enabled ? 'bg-[#4D989B]' : 'bg-[#E9E4DF]'}`}
          aria-label={w.enabled ? 'Desligar despertador' : 'Ligar despertador'}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${w.enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {w.note && (
        <div className="flex items-start gap-2 mt-3">
          <CharacterFace profile={w.createdBy} className="w-9 h-9 shrink-0" />
          <SpeechBubble profile={w.createdBy}>{w.note}</SpeechBubble>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {targets.map(p => <RingStatus key={p} wakeup={w} person={p} userProfile={userProfile} />)}
        {w.enabled && !ringing && (
          <span className="text-[11px] font-bold text-[#4D989B] bg-[#4D989B]/10 px-2.5 py-1 rounded-full">
            ⏰ {describeNext(next)}
          </span>
        )}
        {w.createdBy !== userProfile && (
          <span className="text-[11px] font-bold text-[#8A847D] bg-[#E9E4DF]/60 px-2.5 py-1 rounded-full">
            feito {w.createdBy === 'Amanda' ? 'pela Amanda' : 'pelo Mateus'} 💌
          </span>
        )}
      </div>
    </motion.div>
  );
}

/** Status do último toque de uma pessoa, como um selinho. */
function RingStatus({ wakeup, person, userProfile }: { wakeup: Wakeup; person: Profile; userProfile: Profile }) {
  const r = wakeup.ring?.[person];
  if (!r) return null;
  const who = person === userProfile ? 'Você' : person;
  const sameDay = new Date(r.startedAt).toDateString() === new Date().toDateString();
  const when = sameDay ? '' : ` (${new Date(r.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;
  const pill = 'text-[11px] font-bold px-2.5 py-1 rounded-xl leading-snug';

  if (r.status === 'ringing') {
    if (!isRinging(wakeup, person)) {
      return <span className={`${pill} text-[#8A847D] bg-[#E9E4DF]/60`}>❓ Tocou às {hhmm(r.startedAt)}{when}, sem resposta do celular</span>;
    }
    return (
      <span className={`${pill} text-white bg-[#4D989B] flex items-center gap-1.5`}>
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
        </span>
        Tocando agora {person === userProfile ? 'pra você' : toPrep(person)}…
      </span>
    );
  }
  if (r.status === 'dismissed') {
    return (
      <span className={`${pill} text-[#2B2A28] bg-[#81D8D0]/30`}>
        ✅ {who} desligou às {hhmm(r.endedAt)}{when}{r.message ? ` · “${r.message}”` : ''}
      </span>
    );
  }
  return (
    <span className={`${pill} text-[#8A847D] bg-[#E9E4DF]/60`}>
      😴 {who === 'Você' ? 'Você não desligou' : `${who} não desligou`} ({hhmm(r.startedAt)}{when})
    </span>
  );
}

/** Criar/editar — bottom sheet no mesmo formato dos outros da Mesinha. */
function WakeupEditorSheet({ editing, userProfile, onClose, onSaved }: {
  editing: Wakeup | 'new' | null;
  userProfile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const partner: Profile = userProfile === 'Amanda' ? 'Mateus' : 'Amanda';
  const [form, setForm] = useState<WakeupInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (editing === 'new') setForm(emptyForm());
    else if (editing) {
      const { target, time, days, date, volume, note, enabled } = editing;
      setForm({ target, time, days, date, volume, note, enabled });
    }
    if (!editing) { stopWakeupTune(); setPreviewing(false); }
  }, [editing]);

  useEffect(() => () => stopWakeupTune(), []);

  const save = async () => {
    if (saving || !editing) return;
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
        toast.success(form.target === userProfile
          ? 'Despertador criado ⏰'
          : `Despertador criado! ${partner === 'Amanda' ? 'A Amanda' : 'O Mateus'} já vai ficar sabendo ⏰💌`);
      } else {
        await wakeupApi.update(editing.id, input);
        toast.success('Despertador atualizado ⏰');
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu pra salvar o despertador');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    if (!window.confirm(`Apagar o despertador das ${editing.time}?`)) return;
    try {
      await wakeupApi.remove(editing.id);
      toast.success('Despertador apagado');
      onSaved();
    } catch (_) {
      toast.error('Não deu pra apagar agora');
    }
  };

  const togglePreview = async () => {
    if (previewing) { stopWakeupTune(); setPreviewing(false); return; }
    const ok = await playWakeupTune(form.volume, true);
    setPreviewing(ok);
    if (!ok) toast.error('O navegador não deixou tocar o som');
  };

  const targetOptions: { value: WakeupInput['target']; label: string; faces: Profile[] }[] = [
    { value: userProfile, label: 'Pra mim', faces: [userProfile] },
    { value: partner, label: partner === 'Amanda' ? 'Pra Amanda' : 'Pro Mateus', faces: [partner] },
    { value: 'both', label: 'Nós dois', faces: ['Amanda', 'Mateus'] },
  ];

  const sectionLabel = 'font-bold text-xs uppercase tracking-tight text-[#4D989B] mb-2 block';

  return (
    <AnimatePresence>
      {editing && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60]"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-card rounded-t-3xl z-[70] border-t-2 border-[#4D989B]/10 max-h-[90vh] overflow-hidden flex flex-col"
            style={{ maxWidth: 390, boxShadow: '0 -4px 20px rgba(77, 152, 155, 0.08), 0 -1px 4px rgba(77, 152, 155, 0.04)' }}
          >
            <div className="px-6 py-6 overflow-y-auto flex-1 font-['Quicksand',sans-serif]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-medium flex items-center gap-2">
                  <BellRing className="w-6 h-6 text-[#4D989B]" strokeWidth={1.5} />
                  {editing === 'new' ? 'Novo despertador' : 'Editar despertador'}
                </h2>
                <button onClick={onClose} className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border-2 border-[#E9E4DF] bg-[#F8F6F4] px-4 py-3">
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => e.target.value && setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full text-center text-5xl font-bold text-[#2B2A28] bg-transparent focus:outline-none"
                  />
                </div>

                <div>
                  <span className={sectionLabel}>Pra quem?</span>
                  <div className="grid grid-cols-3 gap-2">
                    {targetOptions.map(opt => {
                      const on = form.target === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setForm(f => ({ ...f, target: opt.value }))}
                          className={`rounded-2xl border-2 py-2 flex flex-col items-center gap-1 transition-colors ${
                            on ? 'border-[#4D989B] bg-[#81D8D0]/20' : 'border-[#E9E4DF] bg-white'
                          }`}
                        >
                          <div className="flex -space-x-2">
                            {opt.faces.map(p => <CharacterFace key={p} profile={p} className="w-9 h-9" />)}
                          </div>
                          <span className={`text-xs font-bold ${on ? 'text-[#4D989B]' : 'text-[#2B2A28]'}`}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className={sectionLabel}>Repetir</span>
                  <div className="flex justify-between gap-1">
                    {DAY_LETTERS.map((letter, day) => {
                      const on = form.days.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => setForm(f => ({ ...f, days: on ? f.days.filter(d => d !== day) : [...f.days, day].sort() }))}
                          className={`w-10 h-10 rounded-full border-2 text-sm font-bold transition-colors ${
                            on ? 'bg-[#4D989B] text-white border-[#4D989B]' : 'border-[#E9E4DF] bg-white text-[#2B2A28]'
                          }`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#8A847D] mt-2">
                    {form.days.length
                      ? `Toca ${describeDays({ days: form.days, date: null })}`
                      : `Nenhum dia marcado: toca uma vez só, ${describeDays({ days: [], date: oneShotDateFor(form.time) })}`}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={sectionLabel + ' !mb-0'}>Volume</span>
                    <span className="text-xs font-bold text-[#4D989B] bg-[#4D989B]/10 px-2 py-0.5 rounded-full">{form.volume}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume1 className="w-5 h-5 text-[#8A847D]" strokeWidth={1.5} />
                    <input
                      type="range"
                      min={WAKEUP_MIN_VOLUME}
                      max={100}
                      step={5}
                      value={form.volume}
                      onChange={e => setForm(f => ({ ...f, volume: Math.max(WAKEUP_MIN_VOLUME, Number(e.target.value)) }))}
                      className="flex-1 accent-[#4D989B]"
                    />
                    <Volume2 className="w-5 h-5 text-[#8A847D]" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-[#8A847D] mt-1">
                    Nunca menos que {WAKEUP_MIN_VOLUME}% — toca até no silencioso e sobe o volume sozinho.
                  </p>
                </div>

                <button
                  onClick={togglePreview}
                  className={`w-full rounded-2xl border-2 px-4 py-3 flex items-center gap-3 transition-colors ${
                    previewing ? 'border-[#4D989B] bg-[#81D8D0]/20' : 'border-[#E9E4DF] bg-[#F8F6F4]'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-[#4D989B] text-white flex items-center justify-center shrink-0">
                    {previewing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block font-bold text-sm text-[#2B2A28]">Abertura de Anime 🎌</span>
                    <span className="block text-xs text-[#8A847D]">{previewing ? 'tocando… toca de novo pra parar' : 'toque dos anos 90 — ouvir'}</span>
                  </span>
                </button>

                <div>
                  <span className={sectionLabel}>Recadinho (opcional)</span>
                  <input
                    type="text"
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value.substring(0, WAKEUP_NOTE_MAX) }))}
                    placeholder="Aparece na tela quando tocar"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {form.note.trim() && (
                    <div className="flex items-start gap-2 mt-3">
                      <CharacterFace profile={userProfile} className="w-8 h-8 shrink-0" />
                      <SpeechBubble profile={userProfile}>{form.note}</SpeechBubble>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pb-2">
                  {editing !== 'new' && (
                    <button
                      onClick={remove}
                      className="px-4 rounded-2xl border-2 border-[#E9E4DF] text-[#8A847D] hover:text-destructive flex items-center justify-center"
                      aria-label="Apagar despertador"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl bg-[#4D989B] text-white font-bold disabled:opacity-50"
                  >
                    {saving ? 'Salvando…' : 'Salvar despertador'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
