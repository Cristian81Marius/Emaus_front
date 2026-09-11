import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ApiMode, getApiMode, setApiMode as setClientApiMode } from "../api/client";

const STORAGE_KEY = "emaus.apiMode";

function isApiMode(value: string | null): value is ApiMode {
  return value === "mock" || value === "real";
}

// Același tipar ca ThemeContext/ProjectContext — o alegere de dispozitiv, persistă și
// pe web (nu e sensibilă, la fel ca proiectul activ/tema).
async function readStoredMode(): Promise<ApiMode | null> {
  try {
    const raw = Platform.OS === "web" ? (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null) : await SecureStore.getItemAsync(STORAGE_KEY);
    return isApiMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

async function writeStoredMode(mode: ApiMode): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, mode);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, mode);
    }
  } catch {
    // nu blocăm UI-ul pentru atât — alegerea rămâne valabilă doar pentru sesiunea curentă.
  }
}

interface ApiModeContextValue {
  apiMode: ApiMode;
  setApiMode: (mode: ApiMode) => void;
}

const ApiModeContext = createContext<ApiModeContextValue | undefined>(undefined);

/** Sursa de date a aplicației — mock (în memorie) sau backend-ul real (ASP.NET, peste
 * `API_BASE_URL` din `app.json`). Comutatorul e pe ecranul de login (`app/login.tsx`)
 * — trebuie ales înainte de `POST /api/auth/login`, primul apel care contează, pentru
 * că el decide care server răspunde. Starea reală, sincronă, citită de `client.ts` e
 * un modul simplu (`apiMode`/`setApiMode` din `../api/client`) — acest Provider doar o
 * face reactivă pentru UI și o persistă pe dispozitiv (SecureStore pe nativ,
 * localStorage pe web), exact ca `ThemeContext`/`ProjectContext`. */
export function ApiModeProvider({ children }: { children: React.ReactNode }) {
  const [apiMode, setApiModeState] = useState<ApiMode>(getApiMode());

  useEffect(() => {
    let cancelled = false;
    readStoredMode().then((stored) => {
      if (!cancelled && stored) {
        setApiModeState(stored);
        setClientApiMode(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setApiMode = (mode: ApiMode) => {
    setApiModeState(mode);
    setClientApiMode(mode);
    void writeStoredMode(mode);
  };

  const value = useMemo(() => ({ apiMode, setApiMode }), [apiMode]);

  return <ApiModeContext.Provider value={value}>{children}</ApiModeContext.Provider>;
}

export function useApiMode(): ApiModeContextValue {
  const context = useContext(ApiModeContext);
  if (!context) throw new Error("useApiMode trebuie folosit în interiorul <ApiModeProvider>.");
  return context;
}
