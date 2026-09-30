/** Formata um valor em Kwanzas com espaço normal a separar milhares (nunca espaço não separável). */
export function formatKz(value: number): string {
  const withSpaces = Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces} Kz`;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "2026-10-31" → "31 de outubro". */
export function formatEventDay(day: string): string {
  const [, month, dayOfMonth] = day.split('-').map(Number);
  return `${dayOfMonth} de ${MONTHS[month - 1]}`;
}

/** Hora local de Luanda de um instante ISO, ex.: "10:42". */
export function formatLuandaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-PT', { timeZone: 'Africa/Luanda', hour: '2-digit', minute: '2-digit' });
}
