import { NavLink } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import logoColor from '../assets/brand/logo-color.png';
import moldura from '../assets/brand/moldura-euvou.png';
import { MaskGlyph } from '../components/MaskGlyph';
import { SectionHeading } from '../components/SectionHeading';
import { CountdownTimer } from '../components/CountdownTimer';
import { MomentsGallery } from '../components/MomentsGallery';
import { TicketCardBody } from '../components/TicketCardBody';
import { EVENT } from '../lib/site-content';
import { api, type TicketType } from '../lib/api';

const PILARES = [
  { label: 'Anime & Manga', rot: '-rotate-2' },
  { label: 'Gaming', rot: 'rotate-1' },
  { label: 'Cinema', rot: '-rotate-1' },
  { label: 'Banda Desenhada', rot: 'rotate-2' },
  { label: 'Cosplay', rot: '-rotate-1' },
  { label: 'Tecnologia', rot: 'rotate-1' },
];

const STATS = [
  { value: '2', label: 'Dias de evento' },
  { value: '6', label: 'Universos em cruzamento' },
  { value: '4', label: 'Tipos de bilhete' },
  { value: '1º', label: 'Ano como "Nexus"' },
];

export function Home() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const eventStart = useMemo(() => new Date(EVENT.startsAtIso), []);

  useEffect(() => {
    api.ticketTypes
      .list()
      .then(setTicketTypes)
      .catch(() => setTicketTypes([]));
  }, []);

  return (
    <div className="overflow-x-clip">
      {/* HERO */}
      <section className="grain relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-ink via-magenta-deep/40 to-ink">
        <MaskGlyph className="pointer-events-none absolute -right-24 -top-16 w-[26rem] rotate-12 opacity-[0.08] sm:w-[34rem]" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-block -rotate-2 cut-tag bg-yellow px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.25em] text-ink">
              {EVENT.dateLabel} de {EVENT.year} · {EVENT.venue}
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[0.98] text-cream sm:text-5xl md:text-6xl">
              O ponto onde a cultura pop angolana{' '}
              <span className="text-magenta">se cruza</span>.
            </h1>

            <p className="mt-6 max-w-xl text-lg text-cream/80">
              {EVENT.subline}: o Kwamikon deixa de ser só um encontro temático e torna-se o{' '}
              <strong className="text-yellow">Nexus</strong> — o espaço onde anime, gaming, cinema, BD e cosplay se
              encontram num só evento, feito pela e para a comunidade nerd angolana.
            </p>

            <p className="mt-2 text-sm font-bold uppercase tracking-widest text-cream/50">{EVENT.tagline}</p>

            <div className="mt-8 flex flex-wrap gap-4">
              <NavLink
                to="/bilhetes"
                className="cut-tag rotate-1 bg-magenta px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-cream transition-transform hover:-rotate-1 hover:scale-105"
              >
                Reservar bilhete
              </NavLink>
              <NavLink
                to="/eu-vou"
                className="cut-tag -rotate-1 border-2 border-yellow px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-yellow transition-transform hover:rotate-1 hover:scale-105"
              >
                Fazer a moldura {EVENT.hashtag}
              </NavLink>
            </div>

            <div className="mt-10">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-cream/40">Faltam</p>
              <CountdownTimer target={eventStart} />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="rot-2 rounded-sm border-4 border-ink bg-cream p-6 shadow-[10px_10px_0_0_#FF004E]">
              <img src={logoColor} alt="Kwami Kon Nexus" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ESTATÍSTICAS */}
      <section className="border-b border-white/10 bg-ink-soft">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="text-3xl font-extrabold text-magenta sm:text-4xl">{stat.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-cream/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOBRE O NEXUS */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeading eyebrow="Sobre o Nexus" title="Não é só uma edição nova." />
          <div className="rot-1 border-l-4 border-magenta pl-6">
            <p className="text-xl leading-relaxed text-cream/90 sm:text-2xl">
              "Nexus" é o ponto central onde diferentes universos se cruzam. A edição {EVENT.year} do Kwamikon
              assume essa ideia a sério: mais escala, novo local, novo formato — mas a mesma raiz de sempre, feita
              por quem vive a cultura nerd em Angola todos os dias.
            </p>
            <p className="mt-6 text-cream/70">
              Isto não é a edição de sempre com um cartaz atualizado. É a entrada do Kwamikon numa nova dimensão,
              organizada pela {EVENT.orgName} com o apoio de {EVENT.partners.map((p) => p.name).join(', ')}.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          {PILARES.map((p) => (
            <span
              key={p.label}
              className={`${p.rot} cut-tag border-2 border-cream/20 px-4 py-2 text-sm font-bold uppercase tracking-wide text-cream/90`}
            >
              {p.label}
            </span>
          ))}
        </div>
      </section>

      {/* GALERIA */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="Universo Nexus" title="Um pouco do que te espera" tone="magenta" />
        <div className="mt-10">
          <MomentsGallery />
        </div>
      </section>

      {/* BILHETES PREVIEW */}
      <section className="grain relative border-y border-white/10 bg-ink-soft">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Bilhetes" title="Escolhe o teu passe para o Nexus" tone="magenta" />
          <p className="mt-4 max-w-xl text-sm text-cream/60">
            Clica num pacote para reservares e pagares já o teu passe.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ticketTypes.map((type, i) => (
              <NavLink
                key={type.id}
                to={`/bilhetes?pacote=${type.id}`}
                className={`${i % 2 === 0 ? 'rot-1' : '-rotate-1'} group focus-ring flex flex-col border-2 border-cream/15 bg-ink text-left transition-all hover:-translate-y-1 hover:rotate-0 hover:border-yellow`}
              >
                <TicketCardBody type={type} />
                <span className="cut-tag mx-4 mb-4 mt-1 bg-cream/10 py-2 text-center text-xs font-extrabold uppercase tracking-widest text-cream group-hover:bg-yellow">
                  Reservar
                </span>
              </NavLink>
            ))}
          </div>

          <div className="mt-10">
            <NavLink
              to="/bilhetes"
              className="cut-tag inline-block bg-yellow px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-ink transition-transform hover:scale-105"
            >
              Ver todos os bilhetes
            </NavLink>
          </div>
        </div>
      </section>

      {/* EU VOU PREVIEW */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <SectionHeading eyebrow={EVENT.hashtag} title="Mostra que vais ao Nexus" />
            <p className="mt-6 max-w-md text-cream/70">
              Tira uma foto, aplica a moldura oficial do Kwamikon Nexus e descarrega para partilhar no Instagram,
              Facebook ou WhatsApp Status. Tudo feito no teu dispositivo — a tua foto nunca sai do browser.
            </p>
            <NavLink
              to="/eu-vou"
              className="mt-8 inline-block cut-tag -rotate-1 bg-magenta px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-cream transition-transform hover:rotate-1 hover:scale-105"
            >
              Criar a minha moldura
            </NavLink>
          </div>
          <div className="order-1 rot-2 mx-auto w-full max-w-sm border-4 border-ink bg-black/40 p-2 shadow-[10px_10px_0_0_#FFD527] lg:order-2">
            <img src={moldura} alt={`Moldura oficial ${EVENT.hashtag}`} className="w-full" />
          </div>
        </div>
      </section>

      {/* PATROCINADORES */}
      <section className="border-t border-white/10 bg-ink-soft">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <SectionHeading eyebrow="Apoio" title="Patrocinadores" tone="yellow" />
          <div className="mt-10 flex flex-wrap gap-5">
            {EVENT.partners.map((partner, i) => {
              const card = (
                <span
                  className={`${i % 2 === 0 ? 'rot-1' : '-rotate-1'} cut-tag block overflow-hidden border-2 border-cream/20 bg-ink transition-colors group-hover:border-yellow`}
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-24 w-48 object-cover grayscale transition-all group-hover:grayscale-0 sm:h-28 sm:w-56"
                  />
                </span>
              );

              return partner.url ? (
                <a
                  key={partner.name}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group focus-ring"
                  aria-label={partner.name}
                >
                  {card}
                </a>
              ) : (
                <div key={partner.name} className="group" aria-label={partner.name}>
                  {card}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-cream/40">
            Logótipos provisórios — serão substituídos pelas marcas oficiais dos patrocinadores.
          </p>
        </div>
      </section>
    </div>
  );
}
