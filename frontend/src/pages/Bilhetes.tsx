import { useEffect, useState, type FormEvent } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { TicketCardBody } from '../components/TicketCardBody';
import { api, ApiError, type Reservation, type TicketType } from '../lib/api';
import { formatKz } from '../lib/format';
import { EVENT, PAYMENT_INSTRUCTIONS_PLACEHOLDER } from '../lib/site-content';

export function Bilhetes() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Reservation | null>(null);

  useEffect(() => {
    api.ticketTypes
      .list()
      .then((types) => {
        setTicketTypes(types);
        if (types[0]) setTicketTypeId(types[0].id);
      })
      .catch(() => setError('Não foi possível carregar os tipos de bilhete. Tenta novamente mais tarde.'))
      .finally(() => setLoadingTypes(false));
  }, []);

  const selectedType = ticketTypes.find((t) => t.id === ticketTypeId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!ticketTypeId) {
      setError('Escolhe um tipo de bilhete.');
      return;
    }

    setSubmitting(true);
    try {
      const reservation = await api.reservations.create({
        fullName: fullName.trim(),
        contact: contact.trim(),
        ticketTypeId,
        quantity,
        notes: notes.trim() || undefined,
      });
      setResult(reservation);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Não foi possível submeter a reserva. Verifica a ligação e tenta novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        <span className="inline-block -rotate-2 cut-tag bg-yellow px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-ink">
          Reserva recebida
        </span>
        <h1 className="mt-6 text-3xl font-extrabold text-cream sm:text-4xl">Falta pouco, {result.fullName.split(' ')[0]}!</h1>

        <div className="mt-8 space-y-3 border-2 border-cream/15 bg-ink-soft p-6">
          <Row label="Bilhete" value={`${result.ticketType.name} × ${result.quantity}`} />
          <Row label="Total de referência" value={formatKz(result.ticketType.refPrice * result.quantity)} />
          <Row label="Contacto" value={result.contact} />
          <Row label="Estado" value="Pendente de pagamento" />
        </div>

        <div className="mt-6 border-l-4 border-magenta bg-ink-soft p-5 text-sm text-cream/85">
          {PAYMENT_INSTRUCTIONS_PLACEHOLDER}
        </div>

        <p className="mt-6 text-sm text-cream/50">
          Guarda o contacto que usaste ({result.contact}) — é através dele que a organização confirma o teu
          pagamento e ativa o teu bilhete com QR code.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Bilhetes" title="Reserva o teu lugar no Nexus" tone="magenta" />
      <p className="mt-4 max-w-2xl text-cream/70">
        Esta é uma reserva, não um pagamento. Depois de submeteres, a {EVENT.orgName} confirma o pagamento
        manualmente e o teu bilhete com QR code fica ativo.
      </p>

      <form onSubmit={handleSubmit} className="mt-10">
        <fieldset disabled={loadingTypes}>
          <legend className="text-sm font-bold uppercase tracking-widest text-yellow">Escolhe o teu pacote</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ticketTypes.map((type, i) => {
              const active = type.id === ticketTypeId;
              return (
                <label
                  key={type.id}
                  className={`${i % 2 === 0 ? 'rot-1' : '-rotate-1'} group relative flex cursor-pointer flex-col border-2 bg-ink-soft transition-all focus-within:ring-2 focus-within:ring-yellow hover:-translate-y-1 hover:rotate-0 ${
                    active ? 'border-yellow shadow-[6px_6px_0_0_#FFD527]' : 'border-cream/15 hover:border-cream/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="ticketType"
                    value={type.id}
                    checked={active}
                    onChange={() => setTicketTypeId(type.id)}
                    className="sr-only"
                  />
                  <TicketCardBody type={type} selected={active} />
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="grid gap-5">
            <Field label="Nome completo" htmlFor="fullName">
              <input
                id="fullName"
                required
                minLength={3}
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                placeholder="O teu nome completo"
              />
            </Field>

            <Field label="Contacto (telefone ou e-mail)" htmlFor="contact">
              <input
                id="contact"
                required
                minLength={6}
                maxLength={120}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="input"
                placeholder="912 345 678 ou email@exemplo.com"
              />
            </Field>

            <Field label="Quantidade" htmlFor="quantity">
              <input
                id="quantity"
                type="number"
                required
                min={1}
                max={20}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="input w-28"
              />
            </Field>

            <Field label="Observações (opcional)" htmlFor="notes">
              <textarea
                id="notes"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[90px]"
                placeholder="Alguma informação extra para a organização"
              />
            </Field>
          </div>

          {error && (
            <p role="alert" className="mt-4 border-l-4 border-magenta bg-magenta/10 px-4 py-3 text-sm text-cream">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || loadingTypes}
            className="focus-ring mt-8 cut-tag rotate-1 bg-magenta px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-cream transition-transform hover:-rotate-1 hover:scale-105 disabled:opacity-50"
          >
            {submitting ? 'A submeter…' : 'Submeter reserva'}
          </button>
        </div>

        <aside className="rot-1 h-fit border-2 border-cream/15 bg-ink-soft p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-magenta">Resumo</h3>
          {selectedType ? (
            <div className="mt-4 space-y-2 text-sm text-cream/80">
              <p className="text-lg font-extrabold text-cream">{selectedType.name}</p>
              <p>{selectedType.description}</p>
              <p className="pt-3 text-2xl font-extrabold text-yellow">
                {formatKz(selectedType.refPrice * quantity)}
              </p>
              <p className="text-xs text-cream/50">
                {quantity} × {formatKz(selectedType.refPrice)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-cream/50">Escolhe um tipo de bilhete para veres o resumo.</p>
          )}

          <p className="mt-6 text-xs text-cream/40">
            Pagamento manual (transferência ou Multicaixa Express) confirmado pela organização após a submissão.
          </p>
        </aside>
        </div>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-bold text-cream/80">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-cream/10 pb-2 text-sm">
      <span className="text-cream/50">{label}</span>
      <span className="font-semibold text-cream">{value}</span>
    </div>
  );
}
