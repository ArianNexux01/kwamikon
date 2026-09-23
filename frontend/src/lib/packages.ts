export interface PackageStyle {
  bg: string;
  text: string;
  accent: string;
  tagline: string;
}

export const PACKAGE_STYLES: Record<string, PackageStyle> = {
  Individual: { bg: 'bg-magenta', text: 'text-cream', accent: 'text-magenta', tagline: 'Só tu no Nexus' },
  SpyFamily: { bg: 'bg-gold', text: 'text-ink', accent: 'text-gold', tagline: 'Missão em família' },
  Guilda: { bg: 'bg-yellow', text: 'text-ink', accent: 'text-yellow', tagline: 'Reúne a tua guilda' },
  Bando: { bg: 'bg-magenta-deep', text: 'text-cream', accent: 'text-magenta-soft', tagline: 'O bando todo dentro' },
  default: { bg: 'bg-cream', text: 'text-ink', accent: 'text-cream', tagline: 'Pacote Nexus' },
};

export function packageStyle(name: string): PackageStyle {
  return PACKAGE_STYLES[name] ?? PACKAGE_STYLES.default;
}
