import type { Reservation } from './api';

/**
 * A reserva e a cobrança em curso ficam guardadas na sessão do browser: se a página
 * recarregar a meio, ou quando o cliente volta da página de pagamento da Vero, o
 * checkout é retomado em vez de ficar bloqueado pela validação de contacto duplicado.
 */
const CHECKOUT_KEY = 'kwamikon_checkout';

export interface StoredCheckout {
  reservation: Reservation;
  paymentId?: string;
}

export function loadCheckout(): StoredCheckout | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_KEY);
    return raw ? (JSON.parse(raw) as StoredCheckout) : null;
  } catch {
    return null;
  }
}

export function saveCheckout(value: StoredCheckout | null) {
  try {
    if (value) sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(CHECKOUT_KEY);
  } catch {
    // sessionStorage indisponível (modo privado, etc.): o fluxo continua sem retoma.
  }
}
