import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';

interface BackofficeUser {
  id: string;
  name: string;
  email: string;
  role: 'ORGANIZADOR' | 'STAFF_PORTA';
}

interface AuthContextValue {
  user: BackofficeUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackofficeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kwamikon_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then((payload) =>
        setUser({ id: payload.sub, name: payload.name, email: payload.email, role: payload.role as BackofficeUser['role'] }),
      )
      .catch(() => {
        localStorage.removeItem('kwamikon_token');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { accessToken, user: loggedUser } = await api.auth.login(email, password);
    localStorage.setItem('kwamikon_token', accessToken);
    setUser(loggedUser as BackofficeUser);
  }

  function logout() {
    localStorage.removeItem('kwamikon_token');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
