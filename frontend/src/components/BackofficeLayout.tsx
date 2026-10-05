import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoNexusWhite from '../assets/brand/logo-nexus-white.png';

interface BackofficeLink {
  to: string;
  label: string;
  organizadorOnly?: boolean;
}

const LINKS: BackofficeLink[] = [
  { to: '/backoffice', label: 'Reservas' },
  { to: '/backoffice/checkin', label: 'Check-in' },
  { to: '/backoffice/precos', label: 'Preços', organizadorOnly: true },
  { to: '/backoffice/programacao', label: 'Programação', organizadorOnly: true },
  { to: '/backoffice/torneios', label: 'Torneios', organizadorOnly: true },
  { to: '/backoffice/galeria', label: 'Galeria', organizadorOnly: true },
  { to: '/backoffice/faq', label: 'FAQ', organizadorOnly: true },
];

export function BackofficeLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isOrganizador = user?.role === 'ORGANIZADOR';
  const roleLabel = isOrganizador ? 'Organizador' : 'Staff de porta';
  const links = LINKS.filter((link) => !link.organizadorOnly || isOrganizador);
  const current = links.find((link) => link.to === pathname)?.label;

  // Fecha o menu ao mudar de página.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    // Sem isto a página continua a deslizar por trás do menu no telemóvel.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-soft">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoNexusWhite} alt="Kwami Kon Nexus" className="h-8 w-auto shrink-0" />
            <span className="hidden text-xs font-bold uppercase tracking-widest text-cream/40 sm:inline">Backoffice</span>
            {current && (
              <span className="truncate cut-tag bg-magenta px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-cream lg:hidden">
                {current}
              </span>
            )}
          </div>

          <nav className="hidden items-center gap-1 text-sm font-semibold lg:flex" aria-label="Backoffice">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/backoffice'}
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 ${isActive ? 'bg-magenta text-cream' : 'text-cream/70 hover:text-cream'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 text-sm text-cream/60 lg:flex">
            <span>
              {user?.name} <span className="text-cream/30">· {roleLabel}</span>
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded border border-cream/20 px-3 py-1.5 hover:border-magenta hover:text-cream"
            >
              Sair
            </button>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-white/20 text-cream lg:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="backoffice-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`}
              />
              <span
                className={`absolute left-0 top-2 h-0.5 w-5 bg-current transition-opacity ${menuOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`absolute left-0 top-4 h-0.5 w-5 bg-current transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`}
              />
            </span>
          </button>
        </div>
      </header>

      {/* Menu mobile: painel lateral por cima da página. */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        <div
          className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          id="backoffice-menu"
          className={`absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col border-l border-white/10 bg-ink-soft shadow-2xl transition-transform duration-200 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-widest text-cream/40">Backoffice</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
              className="flex h-9 w-9 items-center justify-center rounded border border-white/20 text-lg text-cream"
              aria-label="Fechar menu"
            >
              ×
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Backoffice">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/backoffice'}
                    tabIndex={menuOpen ? 0 : -1}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded px-4 py-3 text-base font-extrabold uppercase tracking-wide ${
                        isActive
                          ? 'border-l-4 border-yellow bg-magenta text-cream'
                          : 'border-l-4 border-transparent text-cream/75 hover:bg-white/5 hover:text-cream'
                      }`
                    }
                  >
                    {link.label}
                    <span aria-hidden="true" className="text-cream/40">
                      ›
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-white/10 px-5 py-4">
            <p className="font-bold text-cream">{user?.name}</p>
            <p className="text-xs uppercase tracking-widest text-cream/40">{roleLabel}</p>
            <button
              type="button"
              onClick={logout}
              tabIndex={menuOpen ? 0 : -1}
              className="mt-4 w-full cut-tag border-2 border-magenta py-2.5 text-sm font-extrabold uppercase tracking-wide text-cream hover:bg-magenta"
            >
              Sair
            </button>
          </div>
        </aside>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
