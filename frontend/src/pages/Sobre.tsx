import { SectionHeading } from '../components/SectionHeading';
import { MaskGlyph } from '../components/MaskGlyph';
import { EVENT } from '../lib/site-content';

export function Sobre() {
  return (
    <div className="relative overflow-hidden">
      <MaskGlyph className="pointer-events-none absolute -left-20 top-40 w-80 -rotate-12 opacity-[0.06]" />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="Sobre" title="O que é o Kwamikon" />

        <div className="mt-10 space-y-6 text-lg leading-relaxed text-cream/85">
          <p>
            O Kwamikon é o evento anual angolano dedicado à cultura pop: anime, gaming, cinema, banda desenhada e
            outras expressões criativas, reunidas num só espaço físico. É organizado pela {EVENT.orgName}, com o
            objetivo de dar à comunidade nerd angolana um espaço próprio para se encontrar, competir, criar e
            celebrar aquilo que gosta.
          </p>

          <p>
            A edição {EVENT.year} chama-se <strong className="text-yellow">Kwamikon Nexus</strong> e marca uma
            mudança de posicionamento: deixa de ser apenas um encontro temático e passa a apresentar-se como uma
            plataforma cultural, com escala e ambição maiores do que as edições anteriores.
          </p>

          <div className="rot-1 my-10 border-l-4 border-magenta bg-ink-soft p-6">
            <p className="text-xl font-bold text-cream">
              "Nexus" comunica a ideia de ponto central onde diferentes universos — anime, gaming, cinema, BD e
              tecnologia — se cruzam.
            </p>
          </div>

          <p>
            Não é a edição de sempre com um layout atualizado: é a entrada numa nova dimensão do evento, com{' '}
            {EVENT.subline.toLowerCase()}, no {EVENT.venue}, nos dias {EVENT.dateLabel} de {EVENT.year}.
          </p>

          <p>
            O Kwamikon Nexus conta com o apoio de {EVENT.partners.map((p) => p.name).join(', ')} — a "Genki Dama"
            que junta forças para tornar esta edição possível.
          </p>
        </div>
      </section>
    </div>
  );
}
