import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logoColor from '../assets/brand/logo-color.png';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/programacao', label: 'Programação' },
  { to: '/bilhetes', label: 'Bilhetes' },
  { to: '/eu-vou', label: 'Eu vou' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contacto', label: 'Contacto' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img src={logoColor} alt="Kwami Kon Nexus" className="h-9 w-auto sm:h-11" />
        </NavLink>

        <nav className="hidden items-center gap-6 lg:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `text-sm font-semibold uppercase tracking-wide transition-colors ${
                  isActive ? 'text-yellow' : 'text-cream/80 hover:text-yellow'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/bilhetes"
          className="hidden cut-tag rotate-1 items-center bg-magenta px-5 py-2 text-sm font-extrabold uppercase text-cream transition-transform hover:-rotate-1 hover:scale-105 lg:inline-flex"
        >
          Reservar bilhete
        </NavLink>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded border border-white/20 text-cream lg:hidden"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`}
            />
            <span className={`absolute left-0 top-2 h-0.5 w-5 bg-current transition-opacity ${open ? 'opacity-0' : ''}`} />
            <span
              className={`absolute left-0 top-4 h-0.5 w-5 bg-current transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`}
            />
          </span>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 bg-ink px-4 py-3 lg:hidden">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm font-semibold uppercase tracking-wide ${
                  isActive ? 'bg-magenta/20 text-yellow' : 'text-cream/80'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            to="/bilhetes"
            onClick={() => setOpen(false)}
            className="mt-2 cut-tag bg-magenta px-4 py-2 text-center text-sm font-extrabold uppercase text-cream"
          >
            Reservar bilhete
          </NavLink>
        </nav>
      )}
    </header>
  );
}
