import { useEffect, useState } from 'react';
import { api, ApiError, type TicketType } from '../../lib/api';
import { formatKz } from '../../lib/format';

export function Precos() {
  const [types, setTypes] = useState<TicketType[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api.ticketTypes
      .listAll()
      .then((list) => {
        setTypes(list);
        setDrafts(Object.fromEntries(list.map((t) => [t.id, String(t.refPrice)])));
      })
      .catch(() => setError('Não foi possível carregar os bilhetes.'))
      .finally(() => setLoading(false));
  }, []);

  async function save(type: TicketType) {
    setError(null);
    setNotice(null);
    const value = Number(drafts[type.id]);
    if (!Number.isInteger(value) || value < 100) {
      setError('O preço tem de ser um número inteiro de Kwanzas, no mínimo 100 Kz.');
      return;
    }

    setSavingId(type.id);
    try {
      const updated = await api.ticketTypes.updatePrice(type.id, value);
      setTypes((list) => list.map((t) => (t.id === updated.id ? updated : t)));
      setNotice(`Preço do bilhete ${updated.name} alterado para ${formatKz(updated.refPrice)}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível alterar o preço.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-cream">Preços dos bilhetes</h1>
      <p className="mt-2 max-w-2xl text-sm text-cream/60">
        O novo preço aparece logo no site e aplica-se aos pagamentos iniciados a partir de agora. Quem já tem um
        pagamento em curso paga o valor com que o iniciou.
      </p>

      {error && <p className="mt-4 text-sm text-magenta-soft">{error}</p>}
      {notice && <p className="mt-4 text-sm text-emerald-400">{notice}</p>}

      {loading && <p className="mt-8 text-sm text-cream/40">A carregar…</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {types.map((type) => {
          const changed = drafts[type.id] !== String(type.refPrice);
          return (
            <form
              key={type.id}
              onSubmit={(e) => {
                e.preventDefault();
                save(type);
              }}
              className="rounded border border-cream/10 bg-ink-soft p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-cream">{type.name}</h2>
                  <p className="mt-1 text-xs text-cream/50">
                    {type.peopleCount} {type.peopleCount === 1 ? 'pessoa' : 'pessoas'} · actual {formatKz(type.refPrice)}
                  </p>
                </div>
                {!type.active && (
                  <span className="rounded bg-cream/10 px-2 py-1 text-xs font-bold uppercase text-cream/40">Inactivo</span>
                )}
              </div>

              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-cream/50" htmlFor={`price-${type.id}`}>
                Preço (Kz)
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id={`price-${type.id}`}
                  type="number"
                  inputMode="numeric"
                  min={100}
                  step={1}
                  value={drafts[type.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [type.id]: e.target.value }))}
                  className="input w-full bg-ink"
                />
                <button
                  type="submit"
                  disabled={!changed || savingId === type.id}
                  className="cut-tag bg-yellow px-5 py-2 text-xs font-extrabold uppercase text-ink disabled:opacity-40"
                >
                  {savingId === type.id ? 'A guardar…' : 'Guardar'}
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
