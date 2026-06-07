import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, User, UserRole } from '../lib/api';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isManager: boolean;
  isArtist: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: UserRole) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'manager',
  isManager: false,
  isArtist: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { user: u } = await authApi.me();
      setUser({ ...u, role: u.role ?? 'manager' });
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const signIn = async (email: string, password: string) => {
    const { token, user: u } = await authApi.login(email, password);
    localStorage.setItem('token', token);
    setUser({ ...u, role: u.role ?? 'manager' });
  };

  const signUp = async (email: string, password: string, role: UserRole = 'manager') => {
    const { token, user: u } = await authApi.register(email, password, role);
    localStorage.setItem('token', token);
    setUser({ ...u, role: u.role ?? role });
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user: u } = await authApi.me();
      setUser({ ...u, role: u.role ?? 'manager' });
    } catch { /* ignore */ }
  };

  const role = user?.role ?? 'manager';

  return (
    <AuthContext.Provider value={{
      user, loading, role,
      isManager: role === 'manager',
      isArtist: role === 'artist',
      signIn, signUp, signOut, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
