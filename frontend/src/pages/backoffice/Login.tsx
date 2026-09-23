import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoNexusWhite from '../../assets/brand/logo-nexus-white.png';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api';

export function BackofficeLogin() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const from = (location.state as { from?: string })?.from ?? '/backoffice';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/backoffice');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tenta novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border-2 border-cream/15 bg-ink-soft p-8">
        <img src={logoNexusWhite} alt="Kwami Kon Nexus" className="mx-auto h-12 w-auto" />
        <h1 className="mt-6 text-center text-sm font-bold uppercase tracking-widest text-cream/50">
          Área da organização
        </h1>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-cream/80">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-cream/80">
              Palavra-passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1.5"
            />
          </div>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-magenta-soft">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="focus-ring mt-6 w-full cut-tag bg-magenta py-3 text-sm font-extrabold uppercase tracking-wide text-cream disabled:opacity-50"
        >
          {submitting ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
