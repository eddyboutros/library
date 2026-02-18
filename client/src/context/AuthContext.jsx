import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, updateProfile } from '../services/api';

const AuthContext = createContext(null);

function applyTheme() {
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await getMe();
      setUser(data.user);
      applyTheme();
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const loginWithToken = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    applyTheme();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const setTheme = useCallback(async (theme) => {
    applyTheme(theme);
    setUser(prev => prev ? { ...prev, theme } : prev);
    try {
      await updateProfile({ theme });
    } catch {
      // theme still applied locally even if server save fails
    }
  }, []);

  const hasRole = useCallback(
    (...roles) => user && roles.includes(user.role),
    [user]
  );

  const isAdmin = user?.role === 'admin';
  const isLibrarian = user?.role === 'librarian';
  const isMember = user?.role === 'member';
  const isStaff = isAdmin || isLibrarian;
  const theme = 'dark';

  return (
    <AuthContext.Provider value={{ user, loading, loginWithToken, logout, loadUser, hasRole, isAdmin, isLibrarian, isMember, isStaff, theme, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
