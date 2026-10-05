/**
 * Regras comuns às cobranças Vero dos bilhetes e das inscrições nos torneios.
 */

/**
 * Intervalo mínimo entre duas consultas à Vero para a mesma cobrança. A documentação
 * pede no máximo uma consulta a cada 3 a 5 s (limite global de 200 pedidos/min).
 */
export const SYNC_THROTTLE_MS = 4_000;

/**
 * Tempo que o cliente tem para concluir o pagamento, contado desde a criação do
 * pedido. Passado este prazo sem confirmação, o pedido é cancelado.
 * O frontend mostra o mesmo valor (PAYMENT_WINDOW_MINUTES em PaymentStep).
 */
export const PAYMENT_WINDOW_MS = 5 * 60_000;

/** Frequência da verificação dos pedidos fora de prazo. */
export const SWEEP_INTERVAL_MS = 30_000;

/** Estados da Vero em que a cobrança já não pode ser paga. */
export const FAILED_STATUSES: ReadonlySet<string> = new Set([
  'failed',
  'expired',
  'cancelled',
]);

/** Motivo gravado quando é o sistema, e não o organizador, a cancelar o pedido. */
export type AutoCancelReason = 'PAGAMENTO_EXPIRADO' | 'PAGAMENTO_FALHOU';

export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  return digits.slice(-9);
}

/** "maria.santos@gmail.com" → "ma***@gmail.com": confirma o destino sem o expor. */
export function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}
