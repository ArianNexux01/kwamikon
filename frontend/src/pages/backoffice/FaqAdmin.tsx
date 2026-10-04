import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type FaqItem } from '../../lib/api';

/** Iguais aos limites do backend. */
const MAX_QUESTION = 200;
const MAX_ANSWER = 2000;

type Draft = { question: string; answer: string };

export function FaqAdmin() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ question: '', answer: '' });
  const [newItem, setNewItem] = useState<Draft>({ question: '', answer: '' });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api.faq
      .list()
      .then(setItems)
      .catch(() => setError('Não foi possível carregar as perguntas.'))
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

  function startEdit(item: FaqItem) {
    setEditingId(item.id);
    setDraft({ question: item.question, answer: item.answer });
    setConfirmDelete(null);
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    run(async () => {
      const updated = await api.faq.update(editingId, {
        question: draft.question.trim(),
        answer: draft.answer.trim(),
      });
      setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)));
      setEditingId(null);
      setNotice('Pergunta atualizada.');
    }, 'Não foi possível guardar a pergunta.');
  }

  function create(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const created = await api.faq.create({
        question: newItem.question.trim(),
        answer: newItem.answer.trim(),
      });
      setItems((list) => [...list, created]);
      setNewItem({ question: '', answer: '' });
      setNotice('Pergunta adicionada no fim da lista.');
    }, 'Não foi possível adicionar a pergunta.');
  }

  function remove(id: string) {
    run(async () => {
      await api.faq.remove(id);
      setItems((list) => list.filter((i) => i.id !== id));
      setConfirmDelete(null);
      setNotice('Pergunta removida.');
    }, 'Não foi possível remover a pergunta.');
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    run(async () => {
      setItems(await api.faq.reorder(reordered.map((i) => i.id)));
    }, 'Não foi possível mudar a ordem.');
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-cream">Perguntas frequentes</h1>
      <p className="mt-2 max-w-2xl text-sm text-cream/60">
        As alterações aparecem logo na página FAQ do site, pela ordem desta lista. Uma linha em branco na resposta
        separa parágrafos.
      </p>

      {error && <p className="mt-4 text-sm text-magenta-soft">{error}</p>}
      {notice && <p className="mt-4 text-sm text-emerald-400">{notice}</p>}

      {loading && <p className="mt-8 text-sm text-cream/40">A carregar…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-8 text-sm text-cream/40">Ainda não há perguntas. A página FAQ do site fica vazia.</p>
      )}

      <ol className="mt-8 space-y-3">
        {items.map((item, i) => (
          <li key={item.id} className="rounded border border-cream/10 bg-ink-soft p-4">
            {editingId === item.id ? (
              <form onSubmit={saveEdit} className="space-y-3">
                <FaqFields value={draft} onChange={setDraft} idPrefix={`edit-${item.id}`} />
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
                    <span className="mr-2 text-cream/30">{i + 1}.</span>
                    {item.question}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-cream/60">{item.answer}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <SmallButton onClick={() => move(i, -1)} disabled={busy || i === 0} label="Subir">
                    ↑
                  </SmallButton>
                  <SmallButton onClick={() => move(i, 1)} disabled={busy || i === items.length - 1} label="Descer">
                    ↓
                  </SmallButton>
                  <SmallButton onClick={() => startEdit(item)} disabled={busy}>
                    Editar
                  </SmallButton>
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
                      <SmallButton onClick={() => setConfirmDelete(null)}>Não</SmallButton>
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

      <form onSubmit={create} className="mt-8 space-y-3 rounded border border-cream/10 bg-ink-soft p-5">
        <h2 className="font-extrabold text-cream">Nova pergunta</h2>
        <FaqFields value={newItem} onChange={setNewItem} idPrefix="new" />
        <button
          type="submit"
          disabled={busy || !newItem.question.trim() || !newItem.answer.trim()}
          className="cut-tag bg-yellow px-5 py-2 text-xs font-extrabold uppercase text-ink disabled:opacity-40"
        >
          Adicionar pergunta
        </button>
      </form>
    </div>
  );
}

function FaqFields({
  value,
  onChange,
  idPrefix,
}: {
  value: Draft;
  onChange: (value: Draft) => void;
  idPrefix: string;
}) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-question`} className="block text-xs font-bold text-cream/70">
          Pergunta
        </label>
        <input
          id={`${idPrefix}-question`}
          required
          minLength={3}
          maxLength={MAX_QUESTION}
          value={value.question}
          onChange={(e) => onChange({ ...value, question: e.target.value })}
          className="input mt-1 w-full bg-ink"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-answer`} className="block text-xs font-bold text-cream/70">
          Resposta
        </label>
        <textarea
          id={`${idPrefix}-answer`}
          required
          minLength={3}
          maxLength={MAX_ANSWER}
          value={value.answer}
          onChange={(e) => onChange({ ...value, answer: e.target.value })}
          className="input mt-1 min-h-[110px] w-full bg-ink"
        />
      </div>
    </>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded border border-cream/20 px-2 py-1 text-xs text-cream/70 hover:text-cream disabled:opacity-30"
    >
      {children}
    </button>
  );
}
