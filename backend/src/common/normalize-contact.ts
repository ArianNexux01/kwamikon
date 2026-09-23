/**
 * Normaliza um contacto (telefone ou e-mail) para comparação de duplicados.
 * Telefones: mantém apenas dígitos e usa os últimos 9 (número angolano sem indicativo).
 * E-mails: minúsculas e sem espaços.
 */
export function normalizeContact(raw: string): string {
  const value = raw.trim().toLowerCase();

  if (value.includes('@')) {
    return value;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length > 9 ? digits.slice(-9) : digits;
}
