import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ActiveProject = "emaus" | "bob";

const STORAGE_KEY = "emaus.activeProject";

function isActiveProject(value: string | null): value is ActiveProject {
  return value === "emaus" || value === "bob";
}

// Același tipar ca ThemeContext — o alegere de dispozitiv, nu una sensibilă, deci
// merită să persiste și pe web (altfel "Box of Blessing" s-ar pierde la fiecare refresh).
async function readStoredProject(): Promise<ActiveProject | null> {
  try {
    const raw = Platform.OS === "web" ? (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null) : await SecureStore.getItemAsync(STORAGE_KEY);
    return isActiveProject(raw) ? raw : null;
  } catch {
    return null;
  }
}

async function writeStoredProject(project: ActiveProject): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, project);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, project);
    }
  } catch {
    // nu blocăm UI-ul pentru atât — alegerea rămâne valabilă doar pentru sesiunea curentă.
  }
}

interface ProjectContextValue {
  activeProject: ActiveProject;
  setActiveProject: (project: ActiveProject) => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

/** Care "proiect" e activ pe acest dispozitiv — Emaus (cazări) sau Box of Blessing
 * (cutii cu alimente). Un singur cont/login pentru amândouă (același `AuthContext`,
 * aceiași utilizatori) — doar navigarea principală (bara de jos + `moreSections` din
 * Meniu) se schimbă după proiectul activ; Profil/Aspect/Securitate dispozitiv din
 * `menu.tsx` rămân neschimbate, sunt despre dispozitiv/cont, nu despre un proiect
 * anume. Comutatorul e în Meniu → Proiect (vezi `menu.tsx`). `GET /api/menu` citește
 * `?project=` din URL (vezi `BottomTabBar.tsx`/`menu.tsx`) ca să servească tab-urile
 * corecte — server.ts ține `menuConfig`/`bobMenuConfig` separat, în `data.ts`/`bobData.ts`. */
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<ActiveProject>("emaus");

  useEffect(() => {
    let cancelled = false;
    readStoredProject().then((stored) => {
      if (!cancelled && stored) setActiveProjectState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveProject = (project: ActiveProject) => {
    setActiveProjectState(project);
    void writeStoredProject(project);
  };

  const value = useMemo(() => ({ activeProject, setActiveProject }), [activeProject]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject trebuie folosit în interiorul <ProjectProvider>.");
  return context;
}
