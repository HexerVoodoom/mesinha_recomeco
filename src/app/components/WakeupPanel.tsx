import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Play, Square, BellRing, Volume1, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Profile,
  type Wakeup,
  type WakeupInput,
  type WakeupDevice,
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
  isEffectivelyOn,
  isInsideAndroidApp,
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
  autostart: { title: 'Início automático', why: 'sem isso o celular não deixa a Mesinha acordar sozinha pra tocar' },
};

type Devices = Partial<Record<Profile, WakeupDevice>>;

const noCelular = (p: Profile, userProfile: Profile) =>
  p === userProfile ? 'no seu celular' : p === 'Amanda' ? 'no celular da Amanda' : 'no celular do Mateus';

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
  const native = hasNativeWakeups();

  const [wakeups, setWakeups] = useState<Wakeup[]>([]);
  const [devices, setDevices] = useState<Devices>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Wakeup | 'new' | null>(null);
  const [perms, setPerms] = useState<WakeupPermissions | null>(null);
  const [, setTick] = useState(0);

  /** Devolve true se conseguiu baixar a lista. */
  const load = useCallback(async (): Promise<boolean> => {
    try {
      const res = await wakeupApi.listWithDevices();
      setWakeups(res.wakeups);
      setDevices(res.devices);
      return true;
    } catch (_) {
      return false; // mantém o que já estava na tela
    } finally {
      setLoading(false);
    }
  }, []);

  const changed = useCallback(() => {
    notifyNativeWakeupsChanged();
    window.dispatchEvent(new Event(WAKEUPS_CHANGED_EVENT));
    load();
  }, [load]);

  // Status ao vivo: a cada 5s pergunta só o carimbo de versão (leitura
  // baratinha) e rebaixa a lista quando algo mudou — "tocando" vira
  // "desligou" sem martelar o banco. Pausa com o app em segundo plano.
  useEffect(() => {
    let version = -1;
    const poll = async () => {
      setTick(t => t + 1); // atualiza "hoje/amanhã", "tocando há X"
      if (document.visibilityState !== 'visible') return;
      try {
        const v = await wakeupApi.version();
        // O carimbo só é "gasto" se a lista veio mesmo; senão tenta de novo.
        if (v !== version && (await load())) version = v;
      } catch (_) { /* sem internet: fica com o que tem */ }
    };
    poll();
    setPerms(nativeWakeupPermissions());
    const timer = window.setInterval(poll, 5000);
    // O tocador do navegador avisa quando alguém desliga/muda: atualiza na hora.
    const onChanged = () => { load(); };
    window.addEventListener(WAKEUPS_CHANGED_EVENT, onChanged);
    const onVisible = () => {
      if (document.visibilityState === 'visible') { setPerms(nativeWakeupPermissions()); poll(); }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(WAKEUPS_CHANGED_EVENT, onChanged);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const toggle = async (w: Wakeup) => {
    // Um "uma vez" que já tocou aparece desligado: tocar liga pra próxima vez.
    const enabled = !isEffectivelyOn(w);
    const date = !w.days.length && enabled ? oneShotDateFor(w.time) : w.date;
    setWakeups(list => list.map(x => (x.id === w.id ? { ...x, enabled, date } : x)));
    try {
      await wakeupApi.update(w.id, { enabled, date }, userProfile);
      changed();
    } catch (_) {
      toast.error('Não deu pra mudar agora');
      load();
    }
  };

  const missingPerms = native && perms
    ? (Object.keys(PERMISSION_TEXTS) as (keyof WakeupPermissions)[]).filter(k => perms[k] === false)
    : [];

  return (
    <div className="px-6 pb-24 font-['Quicksand',sans-serif]">
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
        <div className="rounded-2xl border-2 border-[#F6C177] bg-[#FFF8EC] p-4 mb-4 flex gap-3 items-start">
          <span className="text-lg">📵</span>
          <p className="text-xs text-[#8A847D] leading-relaxed">
            {isInsideAndroidApp()
              ? 'Esse app da Mesinha está desatualizado: aqui o despertador só toca com ela aberta. Atualiza pela Play Store pra tocar com tudo fechado.'
              : 'Aqui no navegador o despertador só toca com a Mesinha aberta. No app Android ele toca com tudo fechado.'}
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Dando corda no despertador...</div>
      ) : (
        <div className="space-y-3 mb-4">
          {wakeups.map(w => (
            <WakeupCard key={w.id} wakeup={w} devices={devices} userProfile={userProfile} onEdit={() => setEditing(w)} onToggle={() => toggle(w)} />
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

function WakeupCard({ wakeup: w, devices, userProfile, onEdit, onToggle }: {
  wakeup: Wakeup;
  devices: Devices;
  userProfile: Profile;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const next = nextOccurrence(w);
  const on = isEffectivelyOn(w);
  const targets = targetsOf(w);
  const ringing = targets.some(p => isRinging(w, p));
  const targetLabel = w.target === 'both' ? 'pra vocês dois' : w.target === userProfile ? 'pra você' : toPrep(w.target);

  return (
    <motion.div
      layout
      onClick={onEdit}
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
        ringing ? 'border-[#4D989B] bg-[#81D8D0]/15'
          : on ? 'border-[#E9E4DF] bg-white'
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
          className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${on ? 'bg-[#4D989B]' : 'bg-[#E9E4DF]'}`}
          aria-label={on ? 'Desligar despertador' : 'Ligar despertador'}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
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
        {on && !ringing && (
          <span className="text-[11px] font-bold text-[#4D989B] bg-[#4D989B]/10 px-2.5 py-1 rounded-full">
            ⏰ {describeNext(next)}
          </span>
        )}
        {on && !ringing && targets.map(p => (
          <DeviceStatus key={`dev-${p}`} wakeup={w} person={p} device={devices[p]} userProfile={userProfile} />
        ))}
        {w.createdBy !== userProfile && (
          <span className="text-[11px] font-bold text-[#8A847D] bg-[#E9E4DF]/60 px-2.5 py-1 rounded-full">
            feito {w.createdBy === 'Amanda' ? 'pela Amanda' : 'pelo Mateus'} 💌
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Chegou mesmo no celular? Cada app Android manda um recibo do que tem
 * agendado depois de sincronizar — sem ele, o despertador pode estar certinho
 * aqui e o celular nem saber que existe.
 */
function DeviceStatus({ wakeup: w, person, device, userProfile }: {
  wakeup: Wakeup;
  person: Profile;
  device?: WakeupDevice;
  userProfile: Profile;
}) {
  const pill = 'text-[11px] font-bold px-2.5 py-1 rounded-xl leading-snug';
  const onde = noCelular(person, userProfile);
  if (!device) {
    return (
      <span className={`${pill} text-[#B7791F] bg-[#FFF8EC]`}>
        ⚠️ Ainda não chegou {onde} — abre a Mesinha atualizada lá
      </span>
    );
  }
  const faltando = (Object.keys(PERMISSION_TEXTS) as (keyof WakeupPermissions)[])
    .filter(k => device.perms?.[k] === false)
    .map(k => PERMISSION_TEXTS[k].title);
  const agendado = device.ids?.includes(w.id);
  return (
    <>
      {agendado ? (
        <span className={`${pill} text-[#2B2A28] bg-[#81D8D0]/30`}>📱 Agendado {onde}</span>
      ) : new Date(device.at).getTime() < new Date(w.updatedAt).getTime() ? (
        <span className={`${pill} text-[#8A847D] bg-[#E9E4DF]/60`}>⏳ Esperando chegar {onde}…</span>
      ) : (
        <span className={`${pill} text-[#B7791F] bg-[#FFF8EC]`}>⚠️ Não está agendado {onde} — abre a Mesinha lá</span>
      )}
      {faltando.length > 0 && (
        <span className={`${pill} text-[#B7791F] bg-[#FFF8EC]`}>
          ⚠️ {onde.replace(/^no /, 'No ')}, falta liberar: {faltando.join(', ')}
        </span>
      )}
    </>
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

  // Só para o som se for a prévia DESTE editor tocando — nunca o despertador
  // do navegador, que usa o mesmo tocador.
  const previewingRef = useRef(false);
  previewingRef.current = previewing;

  useEffect(() => {
    if (editing === 'new') setForm(emptyForm());
    else if (editing) {
      const { target, time, days, date, volume, note, enabled } = editing;
      setForm({ target, time, days, date, volume, note, enabled });
    }
    if (!editing && previewingRef.current) { stopWakeupTune(); setPreviewing(false); }
  }, [editing]);

  useEffect(() => () => { if (previewingRef.current) stopWakeupTune(); }, []);

  const save = async () => {
    if (saving || !editing) return;
    setSaving(true);
    try {
      // "Uma vez": a data é a próxima vez que esse horário acontece.
      // Editando: mantém ligado/desligado (só o recadinho mudou, por exemplo) e
      // a data do "uma vez", a não ser que horário ou dias tenham mudado.
      const before = editing !== 'new' ? editing : null;
      const timingChanged = !before || before.time !== form.time || before.days.join() !== form.days.join();
      const input: WakeupInput = {
        ...form,
        date: form.days.length ? null : (!timingChanged && before?.date ? before.date : oneShotDateFor(form.time)),
        volume: Math.max(WAKEUP_MIN_VOLUME, form.volume),
        enabled: before && !timingChanged ? before.enabled : true,
      };
      if (editing === 'new') {
        await wakeupApi.create(userProfile, input);
        toast.success(form.target === userProfile
          ? 'Despertador criado ⏰'
          : `Despertador criado! ${partner === 'Amanda' ? 'A Amanda' : 'O Mateus'} já vai ficar sabendo ⏰💌`);
      } else {
        await wakeupApi.update(editing.id, input, userProfile);
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
    if (ok === null) return;
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
