import { NavLink } from 'react-router-dom';
import logoNexusWhite from '../assets/brand/logo-nexus-white.png';
import { EVENT } from '../lib/site-content';

export function Footer() {
  return (
    <footer className="grain relative overflow-hidden border-t border-white/10 bg-ink-soft bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <img src={logoNexusWhite} alt="Kwami Kon Nexus" className="h-16 w-auto" />
            <p className="mt-4 max-w-sm text-sm text-cream/70">
              O ponto de encontro da cultura pop angolana: anime, gaming, cinema, banda desenhada e cosplay,
              organizado pela {EVENT.orgName}.
            </p>
            <p className="mt-4 font-display text-lg font-extrabold text-yellow">{EVENT.hashtag}</p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-magenta">Navegação</h3>
            <ul className="mt-4 space-y-2 text-sm text-cream/80">
              <li><NavLink to="/sobre" className="hover:text-yellow">Sobre o Kwamikon</NavLink></li>
              <li><NavLink to="/programacao" className="hover:text-yellow">Programação</NavLink></li>
              <li><NavLink to="/bilhetes" className="hover:text-yellow">Bilhetes</NavLink></li>
              <li><NavLink to="/eu-vou" className="hover:text-yellow">Eu vou</NavLink></li>
              <li><NavLink to="/faq" className="hover:text-yellow">Perguntas frequentes</NavLink></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-magenta">Contacto</h3>
            <ul className="mt-4 space-y-2 text-sm text-cream/80">
              <li>{EVENT.orgName}</li>
              <li>
                <a href={`tel:+244${EVENT.orgPhone.replace(/\s/g, '')}`} className="hover:text-yellow">
                  {EVENT.orgPhone}
                </a>
              </li>
              <li>{EVENT.venue}</li>
              <li>{EVENT.dateLabel} de {EVENT.year}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {EVENT.year} {EVENT.orgName}. Kwamikon Nexus.</p>
          <p className="flex flex-wrap gap-x-3">
            {EVENT.partners.map((partner) =>
              partner.url ? (
                <a key={partner.name} href={partner.url} target="_blank" rel="noopener noreferrer" className="hover:text-yellow">
                  {partner.name}
                </a>
              ) : (
                <span key={partner.name}>{partner.name}</span>
              ),
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
