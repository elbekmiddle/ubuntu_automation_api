import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getAccessToken, setTokens, clearTokens } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onLoggedOut = () => setUser(null);
    window.addEventListener("screenctl:logged-out", onLoggedOut);
    return () => window.removeEventListener("screenctl:logged-out", onLoggedOut);
  }, [loadMe]);

  const login = async (email, password) => {
    const { user: u, tokens } = await api.auth.login(email, password);
    setTokens(tokens);
    setUser(u);
    return u;
  };

  const register = async (email, password, name) => {
    const { user: u, tokens } = await api.auth.register(email, password, name);
    setTokens(tokens);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
