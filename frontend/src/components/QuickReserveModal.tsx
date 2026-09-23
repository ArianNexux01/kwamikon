import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type Reservation, type TicketType } from '../lib/api';
import { formatKz } from '../lib/format';
import { PAYMENT_INSTRUCTIONS_PLACEHOLDER } from '../lib/site-content';
import { packageStyle } from '../lib/packages';

interface QuickReserveModalProps {
  type: TicketType | null;
  onClose: () => void;
}

export function QuickReserveModal({ type, onClose }: QuickReserveModalProps) {
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Reservation | null>(null);

  useEffect(() => {
    if (type) {
      setFullName('');
      setContact('');
      setQuantity(1);
      setNotes('');
      setError(null);
      setResult(null);
    }
  }, [type]);

  useEffect(() => {
    if (!type) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [type]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!type) return null;

  const style = packageStyle(type.name);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!type) return;
    setError(null);
    setSubmitting(true);
    try {
      const reservation = await api.reservations.create({
        fullName: fullName.trim(),
        contact: contact.trim(),
        ticketTypeId: type.id,
        quantity,
        notes: notes.trim() || undefined,
      });
      setResult(reservation);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível submeter a reserva. Tenta novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Reservar ${type.name}`}
      onClick={onClose}
    >
      <div
        className="grain relative max-h-full w-full max-w-md overflow-y-auto border-2 border-cream/15 bg-ink-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="focus-ring absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 text-lg text-cream/70 hover:text-cream"
        >
          ×
        </button>

        <div className={`cut-tag flex items-center justify-between gap-3 py-3 pl-5 pr-12 ${style.bg} ${style.text}`}>
          <span className="text-base font-extrabold uppercase tracking-wide">{type.name}</span>
          <span className="text-sm font-bold">{formatKz(type.refPrice)}</span>
        </div>

        {result ? (
          <div className="p-6">
            <span className="inline-block -rotate-2 cut-tag bg-yellow px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-ink">
              Reserva recebida
            </span>
            <h3 className="mt-4 text-xl font-extrabold text-cream">
              Falta pouco, {result.fullName.split(' ')[0]}!
            </h3>

            <div className="mt-5 space-y-2 border-2 border-cream/15 bg-ink p-4 text-sm">
              <Row label="Bilhete" value={`${result.ticketType.name} × ${result.quantity}`} />
              <Row label="Total de referência" value={formatKz(result.ticketType.refPrice * result.quantity)} />
              <Row label="Contacto" value={result.contact} />
            </div>

            <p className="mt-4 border-l-4 border-magenta bg-ink p-4 text-xs leading-relaxed text-cream/80">
              {PAYMENT_INSTRUCTIONS_PLACEHOLDER}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="focus-ring mt-6 w-full cut-tag bg-magenta py-3 text-sm font-extrabold uppercase tracking-wide text-cream"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <p className="text-xs text-cream/50">{type.description}</p>

            <div className="mt-5 grid gap-4">
              <div>
                <label htmlFor="qr-fullName" className="block text-sm font-bold text-cream/80">
                  Nome completo
                </label>
                <input
                  id="qr-fullName"
                  required
                  minLength={3}
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input mt-1.5"
                  placeholder="O teu nome completo"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="qr-contact" className="block text-sm font-bold text-cream/80">
                  Contacto (telefone ou e-mail)
                </label>
                <input
                  id="qr-contact"
                  required
                  minLength={6}
                  maxLength={120}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="input mt-1.5"
                  placeholder="912 345 678 ou email@exemplo.com"
                />
              </div>

              <div>
                <label htmlFor="qr-quantity" className="block text-sm font-bold text-cream/80">
                  Quantidade de passes {type.name}
                </label>
                <input
                  id="qr-quantity"
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="input mt-1.5 w-28"
                />
              </div>

              <div>
                <label htmlFor="qr-notes" className="block text-sm font-bold text-cream/80">
                  Observações (opcional)
                </label>
                <textarea
                  id="qr-notes"
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input mt-1.5 min-h-[70px]"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-cream/10 pt-4">
              <span className="text-xs text-cream/50">Total</span>
              <span className="text-xl font-extrabold text-yellow">{formatKz(type.refPrice * quantity)}</span>
            </div>

            {error && (
              <p role="alert" className="mt-4 border-l-4 border-magenta bg-magenta/10 px-4 py-3 text-sm text-cream">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="focus-ring mt-6 w-full cut-tag bg-magenta py-3 text-sm font-extrabold uppercase tracking-wide text-cream transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? 'A confirmar…' : 'Confirmar reserva'}
            </button>
          </form>
        )}
      </div>
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
