/**
 * Classificação do tráfego em valores de baixa cardinalidade, para servirem de
 * etiquetas nas métricas do Prometheus sem criar uma série por URL ou por browser.
 */

/** Páginas públicas do site (ver frontend/src/App.tsx); qualquer outra conta como "outra". */
const KNOWN_PATHS = new Set([
  '/',
  '/sobre',
  '/programacao',
  '/bilhetes',
  '/bilhetes/sucesso',
  '/torneios',
  '/torneios/sucesso',
  '/eu-vou',
  '/faq',
  '/contacto',
]);

export function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return KNOWN_PATHS.has(clean) ? clean : 'outra';
}

/** Cada padrão aceita o domínio do referrer e o nome simples usado em utm_source. */
const SOURCES: [RegExp, string][] = [
  [/(^|\.)google\.|^google$/, 'google'],
  [/(^|\.)(bing|duckduckgo|yahoo)\.|^(bing|duckduckgo|yahoo)$/, 'pesquisa'],
  [/(^|\.)instagram\.com$|^(ig|instagram)$/, 'instagram'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^(fb|facebook)$/, 'facebook'],
  [/(^|\.)(whatsapp\.com|wa\.me)$|^(wa|whatsapp)$/, 'whatsapp'],
  [/(^|\.)tiktok\.com$|^tiktok$/, 'tiktok'],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$|^(twitter|x)$/, 'x'],
  [/(^|\.)(youtube\.com|youtu\.be)$|^(yt|youtube)$/, 'youtube'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$|^linkedin$/, 'linkedin'],
];

/** Origem de uma sessão: utm_source tem prioridade sobre o referrer. */
export function classifySource(
  referrer: string | undefined,
  utmSource: string | undefined,
  siteHost: string | null,
): string {
  const utm = utmSource?.trim().toLowerCase();
  if (utm) {
    return SOURCES.find(([re]) => re.test(utm))?.[1] ?? 'campanha';
  }

  if (!referrer) return 'direto';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'direto';
  }
  if (siteHost && host === siteHost) return 'direto';
  return SOURCES.find(([re]) => re.test(host))?.[1] ?? 'outro site';
}

export type Device = 'mobile' | 'tablet' | 'desktop';

export function classifyDevice(userAgent: string | undefined): Device {
  const ua = userAgent ?? '';
  if (
    /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua))
  )
    return 'tablet';
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function isBot(userAgent: string | undefined): boolean {
  return (
    !userAgent ||
    /bot|crawler|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp/i.test(
      userAgent,
    )
  );
}
