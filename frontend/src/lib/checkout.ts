import type { Reservation, TournamentEntry } from './api';

/**
 * O pedido e a cobrança em curso ficam guardados na sessão do browser: se a página
 * recarregar a meio, ou quando o cliente volta da página de pagamento da Vero, o
 * checkout é retomado em vez de ficar bloqueado pela validação de contacto duplicado.
 */
function sessionStore<T>(key: string) {
  return {
    load(): T | null {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    },
    save(value: T | null) {
      try {
        if (value) sessionStorage.setItem(key, JSON.stringify(value));
        else sessionStorage.removeItem(key);
      } catch {
        // sessionStorage indisponível (modo privado, etc.): o fluxo continua sem retoma.
      }
    },
  };
}

export interface StoredCheckout {
  reservation: Reservation;
  paymentId?: string;
}

const ticketCheckout = sessionStore<StoredCheckout>('kwamikon_checkout');
export const loadCheckout = ticketCheckout.load;
export const saveCheckout = ticketCheckout.save;

export interface StoredTournamentCheckout {
  entry: TournamentEntry;
  paymentId?: string;
}

const tournamentCheckout = sessionStore<StoredTournamentCheckout>('kwamikon_torneio_checkout');
export const loadTournamentCheckout = tournamentCheckout.load;
export const saveTournamentCheckout = tournamentCheckout.save;
