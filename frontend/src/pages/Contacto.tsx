import { SectionHeading } from '../components/SectionHeading';
import { MaskGlyph } from '../components/MaskGlyph';
import { EVENT } from '../lib/site-content';

export function Contacto() {
  return (
    <div className="relative overflow-hidden">
      <MaskGlyph className="pointer-events-none absolute -right-16 bottom-0 w-72 rotate-6 opacity-[0.06]" />

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="Contacto" title="Fala com a organização" tone="magenta" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <InfoCard label="Organização" value={EVENT.orgName} />
          <InfoCard label="Telefone" value={EVENT.orgPhone} href={`tel:+244${EVENT.orgPhone.replace(/\s/g, '')}`} />
          <InfoCard label="Local" value={EVENT.venue} />
          <InfoCard label="Datas" value={`${EVENT.dateLabel} de ${EVENT.year}`} />
        </div>

        <div className="mt-10 border-l-4 border-yellow bg-ink-soft p-6 text-sm text-cream/70">
          As redes sociais oficiais do Kwamikon Nexus são o canal mais rápido para novidades sobre a programação,
          bilhetes e alterações de última hora. Segue a organização para não perderes nada.
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-magenta">{label}</p>
      <p className="mt-2 text-lg font-semibold text-cream">{value}</p>
    </>
  );

  if (href) {
    return (
      <a href={href} className="rot-1 block border-2 border-cream/15 bg-ink-soft p-5 transition-colors hover:border-yellow">
        {content}
      </a>
    );
  }

  return <div className="-rotate-1 border-2 border-cream/15 bg-ink-soft p-5">{content}</div>;
}
