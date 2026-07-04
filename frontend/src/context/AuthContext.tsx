import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { setAuthToken } from '../api/client';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  loginAs: (email: string) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_TOKEN = 'nexus_token';
const STORAGE_USER = 'nexus_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_USER);
    if (storedToken && storedUser) {
      setAuthToken(storedToken);
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        /* ignore corrupt storage */
      }
    }
    setLoading(false);
  }, []);

  const loginAs = useCallback(async (email: string) => {
    const res = await authApi.login(email);
    setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem(STORAGE_TOKEN, res.access_token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(res.user));
    return res.user;
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
  }, []);

  const value = useMemo(() => ({ user, token, loading, loginAs, logout }), [user, token, loading, loginAs, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
