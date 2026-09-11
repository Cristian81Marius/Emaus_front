import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api, setAuthToken, setUnauthorizedHandler } from "../api/client";
import { clearSessionCache } from "../api/sessionCache";
import { LoginResponse, UserDto } from "../api/types";

const TOKEN_KEY = "emaus.token";
const USER_KEY = "emaus.user";

// expo-secure-store nu are implementare web — pe web ținem sesiunea doar în memorie
// (utilizatorul reintră la refresh), ca să nu tragem o dependență suplimentară doar
// pentru varianta de browser a scheletului.
const storage = {
  async getItem(key: string) {
    if (Platform.OS === "web") return null;
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") return;
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string) {
    if (Platform.OS === "web") return;
    await SecureStore.deleteItemAsync(key);
  },
};

interface AuthContextValue {
  user: UserDto | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [token, storedUser] = await Promise.all([storage.getItem(TOKEN_KEY), storage.getItem(USER_KEY)]);
      if (token && storedUser) {
        setAuthToken(token);
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await api.post<LoginResponse>("/api/auth/login", { identifier, password });
    setAuthToken(response.token);
    setUser(response.user);
    await storage.setItem(TOKEN_KEY, response.token);
    await storage.setItem(USER_KEY, JSON.stringify(response.user));
  };

  const logout = async () => {
    setAuthToken(null);
    setUser(null);
    clearSessionCache();
    await storage.deleteItem(TOKEN_KEY);
    await storage.deleteItem(USER_KEY);
  };

  /** Folosit din ecranul de Setări, ca utilizatorul să-și poată schimba numele
   * afișat — actualizează sesiunea locală și contul din spatele token-ului curent. */
  const updateDisplayName = async (fullName: string) => {
    const updated = await api.patch<UserDto>("/api/auth/me", { fullName });
    setUser(updated);
    await storage.setItem(USER_KEY, JSON.stringify(updated));
  };

  // Dacă orice cerere primește 401 (sesiune invalidă — vezi Program.cs, OnTokenValidated),
  // golim sesiunea automat; `AuthGate` din app/_layout.tsx observă `user` devenind `null`
  // și redirecționează la /login din ORICE ecran era activ, nu doar din Locații — fără
  // asta, un 401 pe un ecran fără propriul guard te lăsa "blocat" acolo, logat pe
  // dinafară dar cu ecranul vechi tot pe ecran.
  useEffect(() => {
    setUnauthorizedHandler(() => { void logout(); });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout, updateDisplayName }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth trebuie folosit în interiorul <AuthProvider>.");
  return context;
}
