import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SectionHeading } from '../components/SectionHeading';
import { CheckoutStepper } from '../components/CheckoutStepper';
import { api, ApiError, type PurchasedTicket } from '../lib/api';
import { formatKz } from '../lib/format';
import { EVENT } from '../lib/site-content';
import { loadCheckout, saveCheckout } from '../lib/checkout';

/** Enquanto o pagamento está por confirmar: rápido nos primeiros minutos, depois mais espaçado. */
const FAST_POLL_MS = 4_000;
const SLOW_POLL_MS = 20_000;
const FAST_POLL_WINDOW_MS = 2 * 60_000;
/** O email sai logo a seguir à confirmação; verificamos mais algumas vezes para o mostrar como enviado. */
const EMAIL_CHECKS = 5;

/**
 * Página para onde o endpoint de acknowledge (/api/payments/return/:reserva) envia o
 * cliente depois da página de pagamento. Só mostra o bilhete quando o pagamento está
 * confirmado pelo backend, nunca apenas por o cliente ter chegado aqui.
 */
export function BilheteSucesso() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reserva');
  const [ticket, setTicket] = useState<PurchasedTicket | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!reservationId) return;
    const startedAt = Date.now();
    let emailChecks = 0;
    let timer: number;
    let cancelled = false;

    function schedule(delay: number) {
      timer = window.setTimeout(load, delay);
    }

    function load() {
      api.payments
        .ticket(reservationId!)
        .then((current) => {
          if (cancelled) return;
          setTicket(current);
          const confirmed = current.status === 'CONFIRMADO' || current.status === 'UTILIZADO';
          if (confirmed) {
            // Compra concluída: o checkout guardado na sessão já não é preciso.
            if (loadCheckout()?.reservation.id === current.id) saveCheckout(null);
            if (!current.ticketEmailSent && current.email && emailChecks++ < EMAIL_CHECKS) {
              schedule(FAST_POLL_MS);
            }
          } else if (current.paymentStatus === 'pending') {
            schedule(Date.now() - startedAt < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
          else schedule(SLOW_POLL_MS);
        });
    }

    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reservationId]);

  if (!reservationId || notFound) {
    return (
      <Shell step={1}>
        <p className="mt-10 text-cream/70">Não encontrámos esta compra.</p>
        <BackToCheckout label="Ir para os bilhetes" />
      </Shell>
    );
  }

  if (!ticket) {
    return (
      <Shell step={4}>
        <p className="mt-10 text-cream/60">A confirmar a tua compra…</p>
      </Shell>
    );
  }

  const confirmed = ticket.status === 'CONFIRMADO' || ticket.status === 'UTILIZADO';

  if (!confirmed && ticket.paymentStatus === 'pending') {
    return (
      <Shell step={3}>
        <div className="mt-10 max-w-2xl border-2 border-yellow/40 bg-ink-soft p-6">
          <p className="flex items-center gap-2 font-extrabold text-yellow">
            <span className="h-2 w-2 animate-pulse rounded-full bg-yellow" aria-hidden="true" />A confirmar o teu
            pagamento
          </p>
          <p className="mt-3 text-sm text-cream/70">
            Assim que a confirmação chegar, mostramos aqui o teu bilhete e enviamo-lo para {ticket.email ?? 'o teu email'}.
            Se escolheste pagar por referência, a confirmação só chega depois de a pagares no ATM, no Multicaixa Express
            ou no Internet Banking. Podes fechar esta página: o bilhete chega por email.
          </p>
        </div>
      </Shell>
    );
  }

  if (!confirmed) {
    return (
      <Shell step={3}>
        <div role="alert" className="mt-10 max-w-2xl border-l-4 border-magenta bg-magenta/10 p-5 text-sm text-cream">
          O pagamento não foi concluído, por isso o bilhete ainda não está ativo. Podes voltar ao pagamento e tentar
          novamente.
        </div>
        <BackToCheckout label="Voltar ao pagamento" />
      </Shell>
    );
  }

  return (
    <Shell step={4}>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="inline-block -rotate-2 cut-tag bg-yellow px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-ink">
            Bilhete comprado
          </span>
          <h2 className="mt-6 text-3xl font-extrabold text-cream sm:text-4xl">
            Vemo-nos no Nexus, {ticket.fullName.split(' ')[0]}!
          </h2>

          <div className="mt-8 space-y-3 border-2 border-cream/15 bg-ink-soft p-6">
            <Row label="Bilhete" value={`${ticket.ticketType} × ${ticket.quantity}`} />
            <Row label="Total pago" value={formatKz(ticket.amountKz)} />
            <Row label="Quando" value={`${EVENT.dateLabel}, ${EVENT.timeLabel}`} />
            <Row label="Onde" value={EVENT.venue} />
          </div>

          {ticket.email && (
            <p className="mt-6 border-l-4 border-emerald-400 bg-emerald-400/10 p-4 text-sm text-cream/85">
              {ticket.ticketEmailSent
                ? `Enviámos o bilhete com o QR code para ${ticket.email}. Se não o encontrares, vê a pasta de spam.`
                : `Estamos a enviar o bilhete com o QR code para ${ticket.email}.`}
            </p>
          )}

          <p className="mt-6 text-sm text-cream/60">
            O QR code cobre toda a reserva e vale uma entrada por dia, a {EVENT.dateLabel}: se saíres, só voltas a
            entrar no dia seguinte. Para qualquer dúvida contacta a {EVENT.orgName} pelo {EVENT.orgPhone}.
          </p>

          <Link
            to="/bilhetes"
            className="focus-ring mt-8 inline-block text-sm font-bold text-cream/60 underline underline-offset-4 hover:text-cream"
          >
            Comprar outro bilhete
          </Link>
        </div>

        {ticket.qrDataUrl && (
          <aside className="rot-1 h-fit border-2 border-cream/15 bg-ink-soft p-6 text-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-magenta">O teu bilhete</h3>
            <div className="mt-4 bg-cream p-3">
              <img src={ticket.qrDataUrl} alt="QR code do bilhete" className="mx-auto w-full max-w-[280px]" />
            </div>
            <p className="mt-3 text-xs text-cream/50">Apresenta este QR code à entrada, no telemóvel ou impresso.</p>
            <a
              href={ticket.qrDataUrl}
              download="bilhete-kwamikon-nexus.png"
              className="focus-ring mt-4 inline-block cut-tag border-2 border-yellow px-5 py-2 text-xs font-extrabold uppercase tracking-wide text-yellow hover:bg-yellow hover:text-ink"
            >
              Guardar QR code
            </a>
          </aside>
        )}
      </div>
    </Shell>
  );
}

function Shell({ step, children }: { step: 1 | 3 | 4; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Bilhetes" title="Garante o teu lugar no Nexus" tone="magenta" />
      <CheckoutStepper current={step} />
      {children}
    </div>
  );
}

function BackToCheckout({ label }: { label: string }) {
  return (
    <Link
      to="/bilhetes"
      className="focus-ring mt-6 inline-block cut-tag bg-magenta px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-cream"
    >
      {label}
    </Link>
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
