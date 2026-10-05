import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  api,
  ApiError,
  type AdminTournament,
  type EntryStatus,
  type TournamentEntry,
  type TournamentInput,
  type TournamentPayment,
} from '../../lib/api';
import { formatEventDay, formatKz } from '../../lib/format';
import { tournamentWhen } from '../../lib/tournaments';
import { saveBlob } from '../../lib/download';

const STATUS_LABELS: Record<EntryStatus, string> = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmada',
  CANCELADO: 'Cancelada',
};

const STATUS_STYLES: Record<EntryStatus, string> = {
  PENDENTE: 'bg-yellow/20 text-yellow',
  CONFIRMADO: 'bg-emerald-500/20 text-emerald-400',
  CANCELADO: 'bg-magenta/20 text-magenta-soft',
};

const CANCEL_REASONS = {
  PAGAMENTO_EXPIRADO: 'Pagamento fora de prazo',
  PAGAMENTO_FALHOU: 'Pagamento falhou',
};

const PAYMENT_LABELS: Record<TournamentPayment['status'], string> = {
  pending: 'Pendente',
  paid: 'Pago',
  expired: 'Expirado',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

type Draft = {
  name: string;
  game: string;
  platform: string;
  description: string;
  eventDay: string;
  startTime: string;
  entryFeeKz: string;
  maxPlayers: string;
  registrationOpen: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  game: '',
  platform: '',
  description: '',
  eventDay: '',
  startTime: '',
  entryFeeKz: '',
  maxPlayers: '32',
  registrationOpen: false,
};

function toDraft(t: AdminTournament): Draft {
  return {
    name: t.name,
    game: t.game,
    platform: t.platform ?? '',
    description: t.description ?? '',
    eventDay: t.eventDay ?? '',
    startTime: t.startTime ?? '',
    entryFeeKz: String(t.entryFeeKz),
    maxPlayers: String(t.maxPlayers),
    registrationOpen: t.registrationOpen,
  };
}

function toInput(d: Draft): TournamentInput {
  return {
    name: d.name.trim(),
    game: d.game.trim(),
    platform: d.platform.trim() || null,
    description: d.description.trim() || null,
    eventDay: d.eventDay || null,
    startTime: d.startTime || null,
    entryFeeKz: Number(d.entryFeeKz),
    maxPlayers: Number(d.maxPlayers),
    registrationOpen: d.registrationOpen,
  };
}

export function TorneiosAdmin() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [eventDays, setEventDays] = useState<string[]>([]);
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  /** null: formulário fechado; 'new': torneio novo; outro valor: id do torneio em edição. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadTournaments = useCallback(
    () =>
      api.tournaments
        .admin()
        .then(({ eventDays, tournaments }) => {
          setEventDays(eventDays);
          setTournaments(tournaments);
        })
        .catch(() => setError('Não foi possível carregar os torneios.'))
        .finally(() => setLoading(false)),
    [],
  );

  const loadEntries = useCallback(() => {
    setLoadingEntries(true);
    return api.tournamentEntries
      .list(filter || undefined)
      .then(setEntries)
      .catch(() => setError('Não foi possível carregar as inscrições.'))
      .finally(() => setLoadingEntries(false));
  }, [filter]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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

  function openForm(t?: AdminTournament) {
    setEditing(t ? t.id : 'new');
    setDraft(t ? toDraft(t) : EMPTY_DRAFT);
    setConfirmDelete(null);
    setError(null);
    setNotice(null);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    run(async () => {
      if (editing === 'new') {
        await api.tournaments.create(toInput(draft));
        setNotice('Torneio criado.');
      } else {
        await api.tournaments.update(editing, toInput(draft));
        setNotice('Torneio atualizado.');
      }
      setEditing(null);
      await loadTournaments();
    }, 'Não foi possível guardar o torneio.');
  }

  function toggleOpen(t: AdminTournament) {
    run(async () => {
      await api.tournaments.update(t.id, { ...toInput(toDraft(t)), registrationOpen: !t.registrationOpen });
      setNotice(t.registrationOpen ? `Inscrições fechadas: ${t.name}.` : `Inscrições abertas: ${t.name}.`);
      await loadTournaments();
    }, 'Não foi possível alterar as inscrições.');
  }

  function remove(t: AdminTournament) {
    run(async () => {
      await api.tournaments.remove(t.id);
      setConfirmDelete(null);
      if (filter === t.id) setFilter('');
      setNotice('Torneio removido.');
      await loadTournaments();
    }, 'Não foi possível remover o torneio.');
  }

  function updateStatus(entry: TournamentEntry, status: EntryStatus) {
    run(async () => {
      await api.tournamentEntries.updateStatus(entry.id, status);
      setNotice(status === 'CONFIRMADO' ? 'Inscrição confirmada.' : 'Inscrição cancelada.');
      await Promise.all([loadEntries(), loadTournaments()]);
    }, 'Não foi possível alterar a inscrição.');
  }

  function syncPayments(entry: TournamentEntry) {
    run(async () => {
      const updated = await api.tournamentEntries.sync(entry.id);
      setNotice(
        updated.status === 'CONFIRMADO'
          ? 'Pagamento confirmado: inscrição confirmada.'
          : 'Pagamento verificado: ainda sem confirmação.',
      );
      await Promise.all([loadEntries(), loadTournaments()]);
    }, 'Não foi possível verificar o pagamento.');
  }

  function exportCsv() {
    run(async () => {
      saveBlob(await api.tournamentEntries.exportCsv(filter || undefined), 'inscricoes-torneios-kwamikon.csv');
    }, 'Não foi possível exportar as inscrições.');
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-cream">Torneios</h1>
        <button
          type="button"
          onClick={() => openForm()}
          disabled={busy}
          className="cut-tag bg-yellow px-5 py-2 text-xs font-extrabold uppercase text-ink disabled:opacity-40"
        >
          Novo torneio
        </button>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-cream/60">
        Os torneios aparecem na página Torneios do site. Uma inscrição só ocupa vaga quando está confirmada ou à espera
        de pagamento (durante 5 minutos). Um torneio com inscrições não pode ser apagado: fecha as inscrições.
      </p>

      {error && <p className="mt-4 text-sm text-magenta-soft">{error}</p>}
      {notice && <p className="mt-4 text-sm text-emerald-400">{notice}</p>}

      {editing && (
        <form onSubmit={save} className="mt-6 space-y-4 rounded border border-cream/10 bg-ink-soft p-5">
          <h2 className="font-extrabold text-cream">{editing === 'new' ? 'Novo torneio' : 'Editar torneio'}</h2>
          <TournamentFields value={draft} onChange={setDraft} eventDays={eventDays} />
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
              onClick={() => setEditing(null)}
              className="rounded border border-cream/20 px-3 py-1.5 text-xs text-cream/70 hover:text-cream"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading && <p className="mt-8 text-sm text-cream/40">A carregar…</p>}
      {!loading && tournaments.length === 0 && (
        <p className="mt-8 text-sm text-cream/40">Ainda não há torneios.</p>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {tournaments.map((t) => (
          <div key={t.id} className="rounded border border-cream/10 bg-ink-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-cream/40">
                  {t.platform ? `${t.game} · ${t.platform}` : t.game}
                </p>
                <p className="mt-1 font-extrabold text-cream">{t.name}</p>
                <p className="mt-1 text-sm text-cream/60">
                  {tournamentWhen(t) ?? 'Dia e hora por definir'} · {formatKz(t.entryFeeKz)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-1 text-xs font-bold uppercase ${
                  t.registrationOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cream/10 text-cream/50'
                }`}
              >
                {t.registrationOpen ? 'Abertas' : 'Fechadas'}
              </span>
            </div>
            <p className="mt-3 text-sm text-cream/70">
              <span className="font-bold text-cream">{t.confirmed}</span> confirmadas ·{' '}
              <span className="font-bold text-cream">{t.pending}</span> pendentes ·{' '}
              <span className="font-bold text-cream">{t.spotsLeft}</span> de {t.maxPlayers} vagas livres
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              <SmallButton onClick={() => openForm(t)} disabled={busy}>
                Editar
              </SmallButton>
              <SmallButton onClick={() => toggleOpen(t)} disabled={busy}>
                {t.registrationOpen ? 'Fechar inscrições' : 'Abrir inscrições'}
              </SmallButton>
              <SmallButton onClick={() => setFilter(t.id)} disabled={busy}>
                Ver inscrições
              </SmallButton>
              {t.confirmed + t.pending === 0 &&
                (confirmDelete === t.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => remove(t)}
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
                    onClick={() => setConfirmDelete(t.id)}
                    disabled={busy}
                    className="rounded bg-magenta/20 px-2 py-1 text-xs font-bold text-magenta-soft hover:bg-magenta/30"
                  >
                    Remover
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-cream">Inscrições</h2>
        <div className="flex flex-wrap gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto bg-ink-soft">
            <option value="">Todos os torneios</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={busy}
            className="cut-tag bg-yellow px-5 py-2 text-xs font-extrabold uppercase text-ink disabled:opacity-40"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[840px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-cream/10 text-left text-xs uppercase tracking-widest text-cream/40">
              <th className="py-3 pr-4">Nome</th>
              <th className="py-3 pr-4">Jogador</th>
              <th className="py-3 pr-4">Contacto</th>
              <th className="py-3 pr-4">Torneio</th>
              <th className="py-3 pr-4">Estado</th>
              <th className="py-3 pr-4">Pagamento</th>
              <th className="py-3 pr-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loadingEntries && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-cream/40">
                  A carregar…
                </td>
              </tr>
            )}
            {!loadingEntries && entries.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-cream/40">
                  Sem inscrições.
                </td>
              </tr>
            )}
            {!loadingEntries &&
              entries.map((entry) => {
                const payment = entry.payments?.[0];
                return (
                  <tr key={entry.id} className="border-b border-cream/5">
                    <td className="py-3 pr-4 font-semibold text-cream">{entry.fullName}</td>
                    <td className="py-3 pr-4 text-cream/70">{entry.gamerTag}</td>
                    <td className="py-3 pr-4 text-cream/70">
                      {entry.contact}
                      <span className="block text-xs text-cream/40">{entry.email}</span>
                    </td>
                    <td className="py-3 pr-4 text-cream/70">{entry.tournament.name}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${STATUS_STYLES[entry.status]}`}>
                        {STATUS_LABELS[entry.status]}
                      </span>
                      {entry.status === 'CANCELADO' && entry.cancelReason && (
                        <span className="mt-1 block text-xs text-cream/50">{CANCEL_REASONS[entry.cancelReason]}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-cream/70">
                      {payment ? (
                        <span title={payment.customerPhone ? `Telemóvel: ${payment.customerPhone}` : undefined}>
                          <span className={payment.status === 'paid' ? 'font-bold text-emerald-400' : undefined}>
                            {PAYMENT_LABELS[payment.status]} · {formatKz(payment.amountKz)}
                          </span>
                          <span className="block text-cream/40">
                            {payment.method === 'GPO' ? 'Multicaixa Express' : 'Referência'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-cream/30">Sem pagamento</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {entry.status !== 'CONFIRMADO' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(entry, 'CONFIRMADO')}
                            disabled={busy}
                            className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30"
                          >
                            Confirmar
                          </button>
                        )}
                        {entry.payments?.some((p) => p.status !== 'paid') && entry.status !== 'CONFIRMADO' && (
                          <button
                            type="button"
                            onClick={() => syncPayments(entry)}
                            disabled={busy}
                            className="rounded bg-yellow/20 px-2 py-1 text-xs font-bold text-yellow hover:bg-yellow/30"
                          >
                            Verificar pagamento
                          </button>
                        )}
                        {entry.status !== 'CANCELADO' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(entry, 'CANCELADO')}
                            disabled={busy}
                            className="rounded bg-magenta/20 px-2 py-1 text-xs font-bold text-magenta-soft hover:bg-magenta/30"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TournamentFields({
  value,
  onChange,
  eventDays,
}: {
  value: Draft;
  onChange: (value: Draft) => void;
  eventDays: string[];
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Labeled label="Nome do torneio" htmlFor="t-name">
        <input
          id="t-name"
          required
          minLength={3}
          maxLength={80}
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          className="input mt-1 w-full bg-ink"
          placeholder="Torneio EA SPORTS FC 26"
        />
      </Labeled>
      <Labeled label="Jogo" htmlFor="t-game">
        <input
          id="t-game"
          required
          minLength={2}
          maxLength={80}
          value={value.game}
          onChange={(e) => set({ game: e.target.value })}
          className="input mt-1 w-full bg-ink"
          placeholder="EA SPORTS FC 26"
        />
      </Labeled>
      <Labeled label="Plataforma (opcional)" htmlFor="t-platform">
        <input
          id="t-platform"
          maxLength={40}
          value={value.platform}
          onChange={(e) => set({ platform: e.target.value })}
          className="input mt-1 w-full bg-ink"
          placeholder="Ex.: PS5"
        />
      </Labeled>
      <div className="grid grid-cols-2 gap-4">
        <Labeled label="Dia" htmlFor="t-day">
          <select
            id="t-day"
            value={value.eventDay}
            onChange={(e) => set({ eventDay: e.target.value })}
            className="input mt-1 w-full bg-ink"
          >
            <option value="">Por definir</option>
            {eventDays.map((day) => (
              <option key={day} value={day}>
                {formatEventDay(day)}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Hora" htmlFor="t-time">
          <input
            id="t-time"
            type="time"
            value={value.startTime}
            onChange={(e) => set({ startTime: e.target.value })}
            className="input mt-1 w-full bg-ink"
          />
        </Labeled>
      </div>
      <Labeled label="Taxa de inscrição (Kz)" htmlFor="t-fee">
        <input
          id="t-fee"
          type="number"
          required
          min={100}
          step={1}
          value={value.entryFeeKz}
          onChange={(e) => set({ entryFeeKz: e.target.value })}
          className="input mt-1 w-full bg-ink"
        />
      </Labeled>
      <Labeled label="Vagas" htmlFor="t-max">
        <input
          id="t-max"
          type="number"
          required
          min={2}
          max={1024}
          step={1}
          value={value.maxPlayers}
          onChange={(e) => set({ maxPlayers: e.target.value })}
          className="input mt-1 w-full bg-ink"
        />
      </Labeled>
      <div className="sm:col-span-2">
        <Labeled label="Descrição (opcional)" htmlFor="t-desc">
          <textarea
            id="t-desc"
            maxLength={1000}
            value={value.description}
            onChange={(e) => set({ description: e.target.value })}
            className="input mt-1 min-h-[80px] w-full bg-ink"
            placeholder="Formato, regras, o que o jogador deve trazer…"
          />
        </Labeled>
      </div>
      <label className="flex items-center gap-2 text-sm text-cream/80 sm:col-span-2">
        <input
          type="checkbox"
          checked={value.registrationOpen}
          onChange={(e) => set({ registrationOpen: e.target.checked })}
        />
        Inscrições abertas no site
      </label>
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

function SmallButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-cream/20 px-2 py-1 text-xs text-cream/70 hover:text-cream disabled:opacity-30"
    >
      {children}
    </button>
  );
}
