/**
 * Dias em que os bilhetes são válidos. Configurável por EVENT_DAYS
 * (lista YYYY-MM-DD separada por vírgulas); por omissão, os dois dias do Kwamikon Nexus 2026.
 */
export const DEFAULT_EVENT_DAYS = ['2026-10-31', '2026-11-01'];

/** Angola (WAT) é UTC+1 todo o ano; o dia de evento conta-se sempre na hora local de Luanda. */
const EVENT_TIMEZONE = 'Africa/Luanda';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function parseEventDays(raw: string | undefined): string[] {
  const days = (raw ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  return days.length > 0 ? [...new Set(days)].sort() : DEFAULT_EVENT_DAYS;
}

/** Dia (YYYY-MM-DD) em Luanda correspondente a um instante. */
export function eventDayOf(date: Date): string {
  return dayFormatter.format(date);
}

/** Ex.: "2026-10-31" → "31/10". */
export function shortDayLabel(day: string): string {
  const [, month, dayOfMonth] = day.split('-');
  return `${dayOfMonth}/${month}`;
}
