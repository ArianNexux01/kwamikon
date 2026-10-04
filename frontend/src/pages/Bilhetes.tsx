import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SectionHeading } from '../components/SectionHeading';
import { TicketCardBody } from '../components/TicketCardBody';
import { PaymentStep } from '../components/PaymentStep';
import { CheckoutStepper, type CheckoutStep } from '../components/CheckoutStepper';
import { api, ApiError, type Payment, type Reservation, type TicketType } from '../lib/api';
import { formatKz } from '../lib/format';
import { EVENT } from '../lib/site-content';
import { loadCheckout, saveCheckout } from '../lib/checkout';

export function Bilhetes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [stored] = useState(loadCheckout);

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [step, setStep] = useState<CheckoutStep>(stored ? 3 : 1);
  const [ticketTypeId, setTicketTypeId] = useState(stored?.reservation.ticketTypeId ?? '');
  const [quantity, setQuantity] = useState(stored?.reservation.quantity ?? 1);
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelledNotice, setCancelledNotice] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(stored?.reservation ?? null);
  const [paymentId, setPaymentId] = useState(stored?.paymentId);
  // Voltou da página de pagamento da Vero mas esta sessão do browser já não tem a reserva.
  const returnedWithoutCheckout = !stored && searchParams.has('pagamento');

  useEffect(() => {
    api.ticketTypes
      .list()
      .then((types) => {
        setTicketTypes(types);
        if (stored) return;
        // Vindo de um cartão da Home (/bilhetes?pacote=<id>) o pacote já está escolhido.
        const preselected = types.find((t) => t.id === searchParams.get('pacote'));
        if (preselected) {
          setTicketTypeId(preselected.id);
          setStep(2);
        } else if (types[0]) {
          setTicketTypeId(types[0].id);
        }
      })
      .catch(() => setError('Não foi possível carregar os tipos de bilhete. Tenta novamente mais tarde.'))
      .finally(() => setLoadingTypes(false));
  }, [searchParams, stored]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const selectedType = reservation?.ticketType ?? ticketTypes.find((t) => t.id === ticketTypeId);

  function goToDetails(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ticketTypeId) {
      setError('Escolhe um tipo de bilhete.');
      return;
    }
    setStep(2);
  }

  async function createReservation(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.reservations.create({
        fullName: fullName.trim(),
        contact: contact.trim(),
        email: email.trim(),
        ticketTypeId,
        quantity,
        notes: notes.trim() || undefined,
      });
      setReservation(created);
      saveCheckout({ reservation: created });
      setStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível submeter a reserva. Verifica a ligação e tenta novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handlePaymentChange(payment: Payment | null) {
    if (!reservation) return;
    setPaymentId(payment?.id);
    saveCheckout({ reservation, paymentId: payment?.id });
  }

  /** O pedido foi cancelado no backend: recomeça o checkout com o mesmo pacote. */
  function handleCancelled(message: string) {
    saveCheckout(null);
    setReservation(null);
    setPaymentId(undefined);
    setCancelledNotice(message);
    setStep(1);
  }

  function handlePaid() {
    if (!reservation) return;
    navigate(`/bilhetes/sucesso?reserva=${reservation.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Bilhetes" title="Garante o teu lugar no Nexus" tone="magenta" />
      <p className="mt-4 max-w-2xl text-cream/70">
        Escolhe o pacote, indica os teus dados e paga por Multicaixa Express ou por referência. Assim que o
        pagamento é confirmado, o teu bilhete com QR code fica ativo.
      </p>

      <CheckoutStepper current={step} />

      {cancelledNotice && step === 1 && (
        <div role="alert" className="mt-8 border-l-4 border-magenta bg-magenta/10 p-4 text-sm text-cream">
          {cancelledNotice}
        </div>
      )}

      {returnedWithoutCheckout && !cancelledNotice && step === 1 && (
        <div role="status" className="mt-8 border-l-4 border-yellow bg-yellow/10 p-4 text-sm text-cream/85">
          O pagamento não foi concluído e o pedido foi cancelado. Se achas que pagaste, contacta a {EVENT.orgName} pelo {EVENT.orgPhone}
          com o telemóvel que usaste na reserva.
        </div>
      )}

      {step === 1 && (
        <form onSubmit={goToDetails} className="mt-10">
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

          <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-cream/10 pt-6">
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

            <div className="text-right">
              <p className="text-xs text-cream/50">Total</p>
              <p className="text-2xl font-extrabold text-yellow">
                {formatKz(selectedType ? selectedType.refPrice * quantity : 0)}
              </p>
            </div>
          </div>

          <ErrorMessage message={error} />

          <div className="mt-8 flex justify-end">
            <PrimaryButton type="submit" disabled={loadingTypes || !ticketTypeId}>
              Continuar
            </PrimaryButton>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={createReservation}>
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
                  autoFocus
                />
              </Field>

              <Field label="Telemóvel" htmlFor="contact">
                <input
                  id="contact"
                  required
                  minLength={9}
                  maxLength={20}
                  inputMode="tel"
                  autoComplete="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="input"
                  placeholder="923 456 789"
                />
              </Field>

              <Field label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  required
                  maxLength={160}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="email@exemplo.com"
                />
                <p className="mt-1.5 text-xs text-cream/50">É para aqui que enviamos o bilhete com QR code.</p>
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

            <ErrorMessage message={error} />

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <BackButton
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
              />
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? 'A reservar…' : 'Reservar e pagar'}
              </PrimaryButton>
            </div>
          </form>

          <Summary type={selectedType} quantity={quantity} />
        </div>
      )}

      {step === 3 && reservation && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm text-cream/70">
              Reserva registada em nome de{' '}
              <span className="font-bold text-cream">{reservation.fullName}</span>. Falta só o pagamento.
            </p>
            <div className="mt-5">
              <PaymentStep
                reservation={reservation}
                initialPaymentId={paymentId}
                onPaymentChange={handlePaymentChange}
                onPaid={handlePaid}
                onCancelled={handleCancelled}
              />
            </div>
          </div>

          <Summary type={reservation.ticketType} quantity={reservation.quantity} contact={reservation.contact} />
        </div>
      )}

    </div>
  );
}

function Summary({ type, quantity, contact }: { type?: TicketType; quantity: number; contact?: string }) {
  return (
    <aside className="rot-1 h-fit border-2 border-cream/15 bg-ink-soft p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-magenta">Resumo</h3>
      {type ? (
        <div className="mt-4 space-y-2 text-sm text-cream/80">
          <p className="text-lg font-extrabold text-cream">{type.name}</p>
          <p>{type.description}</p>
          <p className="pt-3 text-2xl font-extrabold text-yellow">{formatKz(type.refPrice * quantity)}</p>
          <p className="text-xs text-cream/50">
            {quantity} × {formatKz(type.refPrice)}
          </p>
          {contact && <p className="pt-2 text-xs text-cream/50">Contacto: {contact}</p>}
        </div>
      ) : (
        <p className="mt-4 text-sm text-cream/50">Escolhe um tipo de bilhete para veres o resumo.</p>
      )}
    </aside>
  );
}

function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      {...props}
      className="focus-ring cut-tag rotate-1 bg-magenta px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-cream transition-transform hover:-rotate-1 hover:scale-105 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring text-sm font-bold text-cream/60 underline underline-offset-4 hover:text-cream"
    >
      Voltar
    </button>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-4 border-l-4 border-magenta bg-magenta/10 px-4 py-3 text-sm text-cream">
      {message}
    </p>
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
