import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, type PaymentBase, type PaymentMethod } from '../lib/api';
import { formatKz } from '../lib/format';

interface PaymentStepProps<P extends PaymentBase> {
  /** Id do pedido (reserva ou inscrição), usado nos ids do formulário. */
  orderId: string;
  amountKz: number;
  /** Telemóvel sugerido no formulário (o contacto indicado no pedido). */
  defaultPhone: string;
  /** Cria a cobrança na Vero para este pedido. */
  startPayment: (method: PaymentMethod, phone: string) => Promise<P>;
  /** Consulta o estado de uma cobrança. */
  fetchPayment: (id: string) => Promise<P>;
  /** Cobrança já iniciada (ex.: ao voltar da página de pagamento), retomada em vez de pedir outra. */
  initialPaymentId?: string;
  onPaymentChange?: (payment: P | null) => void;
  onPaid: (payment: P) => void;
  /** O pedido foi cancelado (pagamento falhou ou não foi feito a tempo): é preciso um pedido novo. */
  onCancelled: (message: string) => void;
}

/** Igual a PAYMENT_WINDOW_MS no backend: passado este tempo sem pagamento, o pedido é cancelado. */
export const PAYMENT_WINDOW_MINUTES = 5;

/**
 * Verificação do estado ao voltar da página de pagamento: rápida nos primeiros minutos
 * (Multicaixa Express confirma em segundos) e depois mais espaçada, porque uma
 * referência pode ser paga horas mais tarde.
 */
const FAST_POLL_MS = 4_000;
const SLOW_POLL_MS = 20_000;
const FAST_POLL_WINDOW_MS = 2 * 60_000;

/** Quando a cobrança acaba num destes estados o backend cancela o pedido. */
const FINAL_MESSAGES: Partial<Record<PaymentBase['status'], string>> = {
  failed: 'O pagamento foi recusado e o pedido foi cancelado. Faz um novo pedido para tentares outra vez.',
  expired: 'O prazo para pagar terminou e o pedido foi cancelado. Faz um novo pedido para tentares outra vez.',
  cancelled: 'O pagamento não foi concluído a tempo e o pedido foi cancelado. Faz um novo pedido para tentares outra vez.',
};

export function PaymentStep<P extends PaymentBase>({
  orderId,
  amountKz,
  defaultPhone,
  startPayment,
  fetchPayment,
  initialPaymentId,
  onPaymentChange,
  onPaid,
  onCancelled,
}: PaymentStepProps<P>) {
  const [method, setMethod] = useState<PaymentMethod>('GPO');
  const [phone, setPhone] = useState(defaultPhone.includes('@') ? '' : defaultPhone);
  const [payment, setPayment] = useState<P | null>(null);
  const [restoring, setRestoring] = useState(Boolean(initialPaymentId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // As callbacks vêm do pai e mudam a cada render; só queremos reagir a mudanças da cobrança.
  const callbacks = useRef({ onPaymentChange, onPaid, onCancelled, fetchPayment });
  useEffect(() => {
    callbacks.current = { onPaymentChange, onPaid, onCancelled, fetchPayment };
  });

  function showStatus(updated: P) {
    const message = FINAL_MESSAGES[updated.status];
    if (message) {
      setPayment(null);
      callbacks.current.onCancelled(message);
    } else {
      setPayment(updated);
    }
  }

  useEffect(() => {
    if (!initialPaymentId) return;
    callbacks.current
      .fetchPayment(initialPaymentId)
      .then(showStatus)
      .catch(() => undefined)
      .finally(() => setRestoring(false));
  }, [initialPaymentId]);

  useEffect(() => {
    // O null inicial não é comunicado: apagaria a cobrança guardada antes de a retomarmos.
    if (!payment) return;
    callbacks.current.onPaymentChange?.(payment);
    if (payment.status === 'paid') callbacks.current.onPaid(payment);
  }, [payment]);

  useEffect(() => {
    if (!payment || payment.status !== 'pending') return;
    const startedAt = Date.now();
    let timer: number;
    let cancelled = false;

    function poll() {
      const delay = Date.now() - startedAt < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS;
      timer = window.setTimeout(() => {
        callbacks.current
          .fetchPayment(payment!.id)
          .then((updated) => {
            if (cancelled) return;
            if (updated.status === 'pending') poll();
            else showStatus(updated);
          })
          .catch(() => {
            if (!cancelled) poll();
          });
      }, delay);
    }

    poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [payment]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await startPayment(method, phone.trim());
      if (!created.paymentUrl) {
        setError('Não foi possível abrir a página de pagamento. Tenta novamente dentro de instantes.');
        setSubmitting(false);
        return;
      }
      // Guardar a cobrança antes de sair do site: é assim que a retomamos quando o cliente voltar.
      callbacks.current.onPaymentChange?.(created);
      window.location.assign(created.paymentUrl);
    } catch (err) {
      setSubmitting(false);
      // 410: o pedido já foi cancelado (fora de prazo ou pagamento falhado).
      if (err instanceof ApiError && err.status === 410) {
        callbacks.current.onCancelled(err.message);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Não foi possível iniciar o pagamento. Tenta novamente.');
    }
  }

  if (restoring) {
    return <p className="border-2 border-cream/15 bg-ink p-4 text-sm text-cream/60">A verificar o pagamento…</p>;
  }

  if (payment?.status === 'paid') {
    return null;
  }

  if (payment?.status === 'pending') {
    return (
      <div className="border-2 border-yellow/40 bg-ink p-4 text-sm">
        <p className="flex items-center gap-2 font-extrabold text-yellow">
          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow" aria-hidden="true" />A confirmar o teu
          pagamento
        </p>
        <p className="mt-2 text-cream/70">
          Com Multicaixa Express a confirmação chega em segundos, assim que aprovares o pedido na app.
        </p>
        <p className="mt-2 text-cream/70">
          Se escolheste referência, paga-a no ATM, no Multicaixa Express ou no Internet Banking com a entidade e a
          referência que viste na página de pagamento. O pagamento tem de ser confirmado até {PAYMENT_WINDOW_MINUTES}{' '}
          minutos depois do pedido; se não for, o pedido é cancelado e tens de fazer um novo.
        </p>
        {payment.paymentUrl && (
          <a
            href={payment.paymentUrl}
            className="focus-ring mt-4 inline-block cut-tag border-2 border-yellow px-5 py-2 text-xs font-extrabold uppercase tracking-wide text-yellow hover:bg-yellow hover:text-ink"
          >
            Voltar à página de pagamento
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-2 border-cream/15 bg-ink p-4">
      <p className="text-sm font-extrabold text-cream">Pagar {formatKz(amountKz)}</p>
      <p className="mt-1 text-xs text-cream/50">
        Vais concluir o pagamento na página segura da Vero Pays e voltar aqui no fim. Tens {PAYMENT_WINDOW_MINUTES}{' '}
        minutos desde o pedido para pagar; se o pagamento não for confirmado nesse tempo, ou se falhar, o pedido é
        cancelado.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método de pagamento">
        <MethodOption
          active={method === 'GPO'}
          onSelect={() => setMethod('GPO')}
          title="Multicaixa Express"
          hint="Aprovas na app com o PIN"
        />
        <MethodOption
          active={method === 'REF'}
          onSelect={() => setMethod('REF')}
          title="Referência"
          hint="ATM ou Internet Banking"
        />
      </div>

      <div className="mt-4">
        <label htmlFor={`pay-phone-${orderId}`} className="block text-sm font-bold text-cream/80">
          Telemóvel
        </label>
        <input
          id={`pay-phone-${orderId}`}
          required
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input mt-1.5"
          placeholder="923 456 789"
        />
        {method === 'GPO' && (
          <p className="mt-1.5 text-xs text-cream/50">Usa o número associado à tua app Multicaixa Express.</p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 border-l-4 border-magenta bg-magenta/10 px-4 py-3 text-sm text-cream">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="focus-ring mt-4 w-full cut-tag bg-magenta py-3 text-sm font-extrabold uppercase tracking-wide text-cream transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        {submitting ? 'A abrir a página de pagamento…' : 'Continuar para o pagamento'}
      </button>
    </form>
  );
}

function MethodOption({
  active,
  onSelect,
  title,
  hint,
}: {
  active: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`focus-ring border-2 p-3 text-left transition-colors ${
        active ? 'border-yellow bg-yellow/10' : 'border-cream/15 hover:border-cream/40'
      }`}
    >
      <span className="block text-sm font-extrabold text-cream">{title}</span>
      <span className="mt-0.5 block text-xs text-cream/50">{hint}</span>
    </button>
  );
}
