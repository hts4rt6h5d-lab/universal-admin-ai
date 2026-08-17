import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready'

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      setPlan(data.plan);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) throw err;
      setUser(null);
      setPlan(null);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signup = useCallback(async (payload) => {
    const data = await api.post('/auth/signup', payload);
    setUser(data.user);
    setPlan(null);
    return data.user;
  }, []);

  const login = useCallback(async (emailOrPhone, password) => {
    const data = await api.post('/auth/login', { emailOrPhone, password });
    setUser(data.user);
    await refresh(); // pick up plan
    return data.user;
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
    setPlan(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, plan, status, signup, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
