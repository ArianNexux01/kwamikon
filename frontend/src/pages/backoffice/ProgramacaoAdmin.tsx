import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type ProgramItem, type ProgramItemInput } from '../../lib/api';
import { formatEventDay } from '../../lib/format';

type Draft = {
  eventDay: string;
  startTime: string;
  endTime: string;
  title: string;
  zone: string;
  description: string;
};

function emptyDraft(day = ''): Draft {
  return { eventDay: day, startTime: '', endTime: '', title: '', zone: '', description: '' };
}

function toDraft(item: ProgramItem): Draft {
  return {
    eventDay: item.eventDay,
    startTime: item.startTime,
    endTime: item.endTime ?? '',
    title: item.title,
    zone: item.zone ?? '',
    description: item.description ?? '',
  };
}

function toInput(d: Draft): ProgramItemInput {
  return {
    eventDay: d.eventDay,
    startTime: d.startTime,
    endTime: d.endTime || null,
    title: d.title.trim(),
    zone: d.zone.trim() || null,
    description: d.description.trim() || null,
  };
}

/** Mesma ordem da API: dia, depois hora de início. */
function sortItems(list: ProgramItem[]) {
  return [...list].sort((a, b) => a.eventDay.localeCompare(b.eventDay) || a.startTime.localeCompare(b.startTime));
}

export function ProgramacaoAdmin() {
  const [eventDays, setEventDays] = useState<string[]>([]);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [newItem, setNewItem] = useState<Draft>(emptyDraft());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api.program
      .list()
      .then((data) => {
        setEventDays(data.eventDays);
        setItems(data.items);
        setNewItem(emptyDraft(data.eventDays[0]));
      })
      .catch(() => setError('Não foi possível carregar a programação.'))
      .finally(() => setLoading(false));
  }, []);

  async function run(action: () => Promise<void>, fallback: string) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function create(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const created = await api.program.create(toInput(newItem));
      setItems((list) => sortItems([...list, created]));
      // Mantém o dia escolhido: normalmente lançam-se várias atividades do mesmo dia seguidas.
      setNewItem(emptyDraft(newItem.eventDay));
      setNotice('Atividade adicionada.');
    }, 'Não foi possível adicionar a atividade.');
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    run(async () => {
      const updated = await api.program.update(editingId, toInput(draft));
      setItems((list) => sortItems(list.map((i) => (i.id === updated.id ? updated : i))));
      setEditingId(null);
      setNotice('Atividade atualizada.');
    }, 'Não foi possível guardar a atividade.');
  }

  function remove(id: string) {
    run(async () => {
      await api.program.remove(id);
      setItems((list) => list.filter((i) => i.id !== id));
      setConfirmDelete(null);
      setNotice('Atividade removida.');
    }, 'Não foi possível remover a atividade.');
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-cream">Programação</h1>
      <p className="mt-2 max-w-2xl text-sm text-cream/60">
        As atividades aparecem na página Programação do site, por dia e por hora. Enquanto não houver nenhuma, o site
        mostra "Programação brevemente disponível".
      </p>

      {error && <p className="mt-4 text-sm text-magenta-soft">{error}</p>}
      {notice && <p className="mt-4 text-sm text-emerald-400">{notice}</p>}

      <form onSubmit={create} className="mt-6 space-y-4 rounded border border-cream/10 bg-ink-soft p-5">
        <h2 className="font-extrabold text-cream">Nova atividade</h2>
        <ItemFields value={newItem} onChange={setNewItem} eventDays={eventDays} idPrefix="new" />
        <button
          type="submit"
          disabled={busy || !newItem.title.trim() || !newItem.startTime || !newItem.eventDay}
          className="cut-tag bg-yellow px-5 py-2 text-xs font-extrabold uppercase text-ink disabled:opacity-40"
        >
          Adicionar atividade
        </button>
      </form>

      {loading && <p className="mt-8 text-sm text-cream/40">A carregar…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-8 text-sm text-cream/40">Ainda não há atividades.</p>
      )}

      {eventDays.map((day, dayIndex) => {
        const dayItems = items.filter((i) => i.eventDay === day);
        if (dayItems.length === 0) return null;
        return (
          <section key={day} className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-magenta">
              Dia {dayIndex + 1}, {formatEventDay(day)}
            </h2>
            <ol className="mt-3 space-y-3">
              {dayItems.map((item) => (
                <li key={item.id} className="rounded border border-cream/10 bg-ink-soft p-4">
                  {editingId === item.id ? (
                    <form onSubmit={saveEdit} className="space-y-3">
                      <ItemFields value={draft} onChange={setDraft} eventDays={eventDays} idPrefix={`edit-${item.id}`} />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={busy}
                          className="cut-tag bg-yellow px-5 py-2 text-xs font-extrabold uppercase text-ink disabled:opacity-40"
                        >
                          {busy ? 'A guardar…' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded border border-cream/20 px-3 py-1.5 text-xs text-cream/70 hover:text-cream"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-bold text-cream">
                          <span className="mr-3 text-yellow">
                            {item.startTime}
                            {item.endTime && `–${item.endTime}`}
                          </span>
                          {item.title}
                        </p>
                        {item.zone && (
                          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-cream/40">{item.zone}</p>
                        )}
                        {item.description && <p className="mt-1 text-sm text-cream/60">{item.description}</p>}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setDraft(toDraft(item));
                            setConfirmDelete(null);
                          }}
                          disabled={busy}
                          className="rounded border border-cream/20 px-2 py-1 text-xs text-cream/70 hover:text-cream disabled:opacity-30"
                        >
                          Editar
                        </button>
                        {confirmDelete === item.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => remove(item.id)}
                              disabled={busy}
                              className="rounded bg-magenta px-2 py-1 text-xs font-bold text-cream"
                            >
                              Remover
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(null)}
                              className="rounded border border-cream/20 px-2 py-1 text-xs text-cream/70 hover:text-cream"
                            >
                              Não
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(item.id)}
                            disabled={busy}
                            className="rounded bg-magenta/20 px-2 py-1 text-xs font-bold text-magenta-soft hover:bg-magenta/30"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function ItemFields({
  value,
  onChange,
  eventDays,
  idPrefix,
}: {
  value: Draft;
  onChange: (value: Draft) => void;
  eventDays: string[];
  idPrefix: string;
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
      <Labeled label="Dia" htmlFor={`${idPrefix}-day`}>
        <select
          id={`${idPrefix}-day`}
          required
          value={value.eventDay}
          onChange={(e) => set({ eventDay: e.target.value })}
          className="input mt-1 w-full bg-ink"
        >
          {eventDays.map((day, i) => (
            <option key={day} value={day}>
              Dia {i + 1}, {formatEventDay(day)}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled label="Início" htmlFor={`${idPrefix}-start`}>
        <input
          id={`${idPrefix}-start`}
          type="time"
          required
          value={value.startTime}
          onChange={(e) => set({ startTime: e.target.value })}
          className="input mt-1 w-full bg-ink"
        />
      </Labeled>
      <Labeled label="Fim (opcional)" htmlFor={`${idPrefix}-end`}>
        <input
          id={`${idPrefix}-end`}
          type="time"
          value={value.endTime}
          onChange={(e) => set({ endTime: e.target.value })}
          className="input mt-1 w-full bg-ink"
        />
      </Labeled>
      <div className="sm:col-span-2">
        <Labeled label="Atividade" htmlFor={`${idPrefix}-title`}>
          <input
            id={`${idPrefix}-title`}
            required
            minLength={3}
            maxLength={120}
            value={value.title}
            onChange={(e) => set({ title: e.target.value })}
            className="input mt-1 w-full bg-ink"
            placeholder="Ex.: Desfile de cosplay"
          />
        </Labeled>
      </div>
      <Labeled label="Zona (opcional)" htmlFor={`${idPrefix}-zone`}>
        <input
          id={`${idPrefix}-zone`}
          maxLength={60}
          value={value.zone}
          onChange={(e) => set({ zone: e.target.value })}
          className="input mt-1 w-full bg-ink"
          placeholder="Ex.: Palco principal"
        />
      </Labeled>
      <div className="sm:col-span-3">
        <Labeled label="Descrição (opcional)" htmlFor={`${idPrefix}-desc`}>
          <textarea
            id={`${idPrefix}-desc`}
            maxLength={500}
            value={value.description}
            onChange={(e) => set({ description: e.target.value })}
            className="input mt-1 min-h-[70px] w-full bg-ink"
          />
        </Labeled>
      </div>
    </div>
  );
}

function Labeled({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-bold text-cream/70">
        {label}
      </label>
      {children}
    </div>
  );
}
