import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "emaus.themePreference";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

// Spre deosebire de token-ul de autentificare (vezi AuthContext — ținut doar în memorie
// pe web, ca să nu persiste o sesiune pe un calculator comun), o preferință de temă nu e
// sensibilă, deci merită să persiste și pe web — altfel alegerea "Întunecat" din Setări
// s-ar pierde la fiecare refresh, ceea ce ar fi enervant fără niciun beneficiu de siguranță.
async function readStoredPreference(): Promise<ThemePreference | null> {
  try {
    const raw = Platform.OS === "web" ? (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null) : await SecureStore.getItemAsync(STORAGE_KEY);
    return isThemePreference(raw) ? raw : null;
  } catch {
    return null;
  }
}

async function writeStoredPreference(pref: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, pref);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, pref);
    }
  } catch {
    // preferința nu s-a putut salva — nu blocăm UI-ul pentru atât, rămâne valabilă
    // doar pentru sesiunea curentă.
  }
}

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  resolvedScheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** Alegerea de temă a utilizatorului (Sistem/Luminos/Întunecat, din ecranul de Setări) —
 * separată de `useColorScheme()` din React Native, care citește DOAR preferința
 * sistemului de operare și n-are cum să fie suprascrisă manual. `useThemeColors()`
 * (din `theme/tokens.ts`) citește rezultatul de-aici, nu direct `useColorScheme()`. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    readStoredPreference().then((stored) => {
      if (!cancelled && stored) setPreferenceState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    void writeStoredPreference(pref);
  };

  const resolvedScheme: "light" | "dark" = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo(() => ({ preference, setPreference, resolvedScheme }), [preference, resolvedScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemePreference trebuie folosit în interiorul <ThemeProvider>.");
  return context;
}
