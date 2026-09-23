import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Reservation } from '../../lib/api';
import { formatKz } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS: Record<Reservation['status'], string> = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  UTILIZADO: 'Utilizado',
};

const STATUS_STYLES: Record<Reservation['status'], string> = {
  PENDENTE: 'bg-yellow/20 text-yellow',
  CONFIRMADO: 'bg-emerald-500/20 text-emerald-400',
  CANCELADO: 'bg-cream/10 text-cream/40',
  UTILIZADO: 'bg-magenta/20 text-magenta-soft',
};

export function Reservas() {
  const { user } = useAuth();
  const isOrganizador = user?.role === 'ORGANIZADOR';

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<Reservation | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{ total: number; byStatus: { status: string; reservas: number; pessoas: number }[] } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.reservations
      .list({ status: statusFilter || undefined, search: search || undefined })
      .then(setReservations)
      .catch(() => setError('Não foi possível carregar as reservas.'))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isOrganizador) {
      api.reservations.metrics().then(setMetrics).catch(() => undefined);
    }
  }, [isOrganizador, reservations.length]);

  async function updateStatus(id: string, status: 'CONFIRMADO' | 'CANCELADO') {
    setError(null);
    try {
      await api.reservations.updateStatus(id, status);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar a reserva.');
    }
  }

  async function openQr(reservation: Reservation) {
    setQrFor(reservation);
    setQrDataUrl(null);
    try {
      const { dataUrl } = await api.reservations.qrCode(reservation.id);
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-cream">Reservas</h1>
        {isOrganizador && (
          <a
            href={api.reservations.exportUrl()}
            className="cut-tag bg-yellow px-5 py-2 text-xs font-extrabold uppercase text-ink"
          >
            Exportar CSV
          </a>
        )}
      </div>

      {metrics && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard label="Total de reservas" value={String(metrics.total)} />
          {metrics.byStatus.map((s) => (
            <MetricCard key={s.status} label={STATUS_LABELS[s.status as Reservation['status']] ?? s.status} value={`${s.reservas} · ${s.pessoas} pessoas`} />
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto bg-ink-soft"
        >
          <option value="">Todos os estados</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Procurar por nome ou contacto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-64 bg-ink-soft"
        />
      </div>

      {error && <p className="mt-4 text-sm text-magenta-soft">{error}</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-cream/10 text-left text-xs uppercase tracking-widest text-cream/40">
              <th className="py-3 pr-4">Nome</th>
              <th className="py-3 pr-4">Contacto</th>
              <th className="py-3 pr-4">Bilhete</th>
              <th className="py-3 pr-4">Qtd</th>
              <th className="py-3 pr-4">Total</th>
              <th className="py-3 pr-4">Estado</th>
              <th className="py-3 pr-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-cream/40">A carregar…</td>
              </tr>
            )}
            {!loading && reservations.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-cream/40">Sem reservas para os filtros escolhidos.</td>
              </tr>
            )}
            {reservations.map((r) => (
              <tr key={r.id} className="border-b border-cream/5">
                <td className="py-3 pr-4 font-semibold text-cream">{r.fullName}</td>
                <td className="py-3 pr-4 text-cream/70">{r.contact}</td>
                <td className="py-3 pr-4 text-cream/70">{r.ticketType.name}</td>
                <td className="py-3 pr-4 text-cream/70">{r.quantity}</td>
                <td className="py-3 pr-4 text-cream/70">{formatKz(r.ticketType.refPrice * r.quantity)}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {isOrganizador && (
                    <div className="flex flex-wrap gap-2">
                      {r.status === 'PENDENTE' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(r.id, 'CONFIRMADO')}
                          className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30"
                        >
                          Confirmar
                        </button>
                      )}
                      {(r.status === 'PENDENTE' || r.status === 'CONFIRMADO') && (
                        <button
                          type="button"
                          onClick={() => updateStatus(r.id, 'CANCELADO')}
                          className="rounded bg-magenta/20 px-2 py-1 text-xs font-bold text-magenta-soft hover:bg-magenta/30"
                        >
                          Cancelar
                        </button>
                      )}
                      {(r.status === 'CONFIRMADO' || r.status === 'UTILIZADO') && (
                        <button
                          type="button"
                          onClick={() => openQr(r)}
                          className="rounded bg-cream/10 px-2 py-1 text-xs font-bold text-cream/70 hover:bg-cream/20"
                        >
                          Ver QR
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setQrFor(null)}
        >
          <div className="w-full max-w-xs bg-ink-soft p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-extrabold text-cream">{qrFor.fullName}</p>
            <p className="text-sm text-cream/50">{qrFor.ticketType.name} × {qrFor.quantity}</p>
            <div className="mt-4 bg-cream p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code do bilhete" className="mx-auto w-full" />
              ) : (
                <p className="py-16 text-sm text-ink/50">A gerar…</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setQrFor(null)}
              className="mt-4 cut-tag bg-magenta px-5 py-2 text-xs font-extrabold uppercase text-cream"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-cream/15 bg-ink-soft p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-cream/40">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-cream">{value}</p>
    </div>
  );
}
