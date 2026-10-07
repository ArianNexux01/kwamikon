import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { trackPageView } from '../lib/analytics';

export function PublicLayout() {
  const { pathname } = useLocation();

  // Só as páginas públicas contam como visitas: o backoffice usa outro layout.
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
