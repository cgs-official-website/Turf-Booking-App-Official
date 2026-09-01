import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('turf_admin_token') || null);
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('turf_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success && res.data?.token) {
        const receivedToken = res.data.token;
        const receivedAdmin = res.data.admin || { email, role: 'admin', name: 'Super Admin' };

        api.setToken(receivedToken);
        localStorage.setItem('turf_admin_user', JSON.stringify(receivedAdmin));

        setToken(receivedToken);
        setAdmin(receivedAdmin);
        return { success: true };
      }
      throw new Error(res.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    localStorage.removeItem('turf_admin_user');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ token, admin, isAuthenticated: !!token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
