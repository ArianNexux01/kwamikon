/** Dados do evento usados nas comunicações enviadas pelo backend (espelham frontend/src/lib/site-content.ts). */
export const EVENT_INFO = {
  name: 'Kwamikon Nexus 2026',
  venue: 'Xyami Nova Vida',
  timeLabel: 'a partir das 10h',
  orgName: 'Conexão Nerd Angola',
  orgPhone: '942 027 116',
};

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** "2026-10-31" → "31 de outubro". */
export function longDayLabel(day: string): string {
  const [, month, dayOfMonth] = day.split('-').map(Number);
  return `${dayOfMonth} de ${MONTHS[month - 1]}`;
}

/** ["2026-10-31", "2026-11-01"] → "31 de outubro e 1 de novembro". */
export function daysLabel(days: string[]): string {
  const labels = days.map(longDayLabel);
  return labels.length > 1
    ? `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`
    : (labels[0] ?? '');
}
