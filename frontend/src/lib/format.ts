/** Formata um valor em Kwanzas com espaço normal a separar milhares (nunca espaço não separável). */
export function formatKz(value: number): string {
  const withSpaces = Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces} Kz`;
}
