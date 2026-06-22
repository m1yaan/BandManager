import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, User, UserRole } from '../lib/api';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isManager: boolean;
  isArtist: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'manager',
  isManager: false,
  isArtist: false,
  isAdmin: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const signIn = async (email: string, password: string) => {
    const { user } = await authApi.login(email, password);
    setUser(user);
  };

  const signUp = async (email: string, password: string, role: UserRole = 'manager') => {
    const { user } = await authApi.register(email, password, role);
    setUser(user);
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // cookie may already be cleared
    }
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {}
  };

  const role = (user?.role ?? 'manager') as UserRole;

  return (
    <AuthContext.Provider value={{
      user, loading, role,
      isManager: role === 'manager' || role === 'admin',
      isArtist:  role === 'artist',
      isAdmin:   role === 'admin',
      signIn, signUp, signOut, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
