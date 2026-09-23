import { NavLink } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="text-8xl font-extrabold text-magenta">404</span>
      <h1 className="mt-4 text-2xl font-extrabold text-cream">Esta página perdeu-se entre dimensões.</h1>
      <p className="mt-3 text-cream/60">Não encontrámos o que procuravas. Volta ao Nexus.</p>
      <NavLink
        to="/"
        className="mt-8 cut-tag rotate-1 bg-magenta px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-cream"
      >
        Voltar à home
      </NavLink>
    </div>
  );
}
