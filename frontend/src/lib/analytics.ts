/**
 * Contagem anónima de visitantes do site público. Cada browser recebe um UUID aleatório
 * (localStorage) e cada separador uma sessão (sessionStorage); não há cookies nem dados
 * pessoais. A API guarda as visualizações e expõe-nas como métricas para o Grafana.
 */
import type { Metric } from 'web-vitals';
import { API_URL } from './api';

const VISITOR_KEY = 'kwamikon_vid';
const SESSION_KEY = 'kwamikon_sid';

function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // crypto.randomUUID só existe em contexto seguro (HTTPS ou localhost).
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Lê ou cria um id no storage; `created` indica se foi criado agora. */
function storedId(storage: Storage, key: string): { id: string; created: boolean } {
  try {
    const existing = storage.getItem(key);
    if (existing) return { id: existing, created: false };
    const id = uuid();
    storage.setItem(key, id);
    return { id, created: true };
  } catch {
    // Storage bloqueado (ex.: navegação privada em alguns browsers): conta como visita nova.
    return { id: uuid(), created: true };
  }
}

function send(path: string, body: unknown) {
  // keepalive: o pedido sobrevive à mudança de página ou ao fecho do separador.
  fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // A contagem de visitas nunca pode afetar a navegação.
  });
}

export function trackPageView(path: string) {
  const visitor = storedId(localStorage, VISITOR_KEY);
  const session = storedId(sessionStorage, SESSION_KEY);

  const payload: Record<string, unknown> = {
    visitorId: visitor.id,
    sessionId: session.id,
    path,
  };
  if (session.created) {
    const utmSource = new URLSearchParams(window.location.search).get('utm_source');
    payload.entry = true;
    payload.newVisitor = visitor.created;
    if (document.referrer) payload.referrer = document.referrer.slice(0, 500);
    if (utmSource) payload.utmSource = utmSource.slice(0, 100);
  }
  send('/analytics/pageview', payload);
}

/** Core Web Vitals das páginas públicas (o backoffice não conta). */
export async function trackWebVitals() {
  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
  const report = (metric: Metric) => {
    const path = window.location.pathname;
    if (path.startsWith('/backoffice')) return;
    send('/analytics/web-vitals', { name: metric.name, value: metric.value, path });
  };
  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
