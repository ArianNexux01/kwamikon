import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoNexusWhite from '../assets/brand/logo-nexus-white.png';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 ${isActive ? 'bg-magenta text-cream' : 'text-cream/70 hover:text-cream'}`;

export function BackofficeLayout() {
  const { user, logout } = useAuth();
  const isOrganizador = user?.role === 'ORGANIZADOR';

  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="border-b border-white/10 bg-ink-soft">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <img src={logoNexusWhite} alt="Kwami Kon Nexus" className="h-8 w-auto" />
            <span className="text-xs font-bold uppercase tracking-widest text-cream/40">Backoffice</span>
          </div>

          <nav className="flex items-center gap-1 text-sm font-semibold">
            <NavLink
              to="/backoffice"
              end
              className={({ isActive }) =>
                `rounded px-3 py-1.5 ${isActive ? 'bg-magenta text-cream' : 'text-cream/70 hover:text-cream'}`
              }
            >
              Reservas
            </NavLink>
            <NavLink
              to="/backoffice/checkin"
              className={({ isActive }) =>
                `rounded px-3 py-1.5 ${isActive ? 'bg-magenta text-cream' : 'text-cream/70 hover:text-cream'}`
              }
            >
              Check-in
            </NavLink>
            {isOrganizador && (
              <>
                <NavLink to="/backoffice/precos" className={linkClass}>
                  Preços
                </NavLink>
                <NavLink to="/backoffice/galeria" className={linkClass}>
                  Galeria
                </NavLink>
                <NavLink to="/backoffice/faq" className={linkClass}>
                  FAQ
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3 text-sm text-cream/60">
            <span>{user?.name} <span className="text-cream/30">· {user?.role === 'ORGANIZADOR' ? 'Organizador' : 'Staff de porta'}</span></span>
            <button type="button" onClick={logout} className="rounded border border-cream/20 px-3 py-1.5 hover:border-magenta hover:text-cream">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
