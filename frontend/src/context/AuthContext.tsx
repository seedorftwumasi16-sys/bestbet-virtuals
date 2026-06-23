'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  balance: number;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; phone?: string; firstName?: string; lastName?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api<User>('/auth/me');
      if (!data?.id || !data?.email) {
        throw new Error('Invalid session');
      }
      setUser(data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) {
      setToken(t);
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await api<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    flushSync(() => {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    });
    return data.user;
  };

  const register = async (data: { email: string; password: string; phone?: string; firstName?: string; lastName?: string }) => {
    const res = await api<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
      }),
    });
    flushSync(() => {
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
