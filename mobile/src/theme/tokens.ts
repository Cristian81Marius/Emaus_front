import { useThemePreference } from "../state/ThemeContext";

/**
 * Identitatea vizuală Emaus: alb + verde pe light mode, cu un dark mode complementar
 * în aceeași familie de verde, doar inversat ca luminozitate. Dacă schimbați
 * identitatea vizuală, schimbați-o aici — totul din `src/` și `app/` citește culorile
 * de-aici, niciodată un hex scris direct într-un ecran. `accent` e culoarea de brand
 * (butoane, FAB, borduri active) — trebuie să rămână lizibilă cu text alb peste ea.
 * `accentInk` e varianta pentru text verde direct pe fundal (mai închisă pe light,
 * mai deschisă pe dark, ca să rămână lizibilă). `ok` e verde și el (stare "bine"), dar
 * deliberat pe o altă nuanță (mai spre smarald) ca să nu se confunde cu verdele de
 * brand — nu s-a schimbat mai jos, doar `accent`/`accentInk`/`accentTint`.
 *
 * `accent` a pornit de la #008000 (verde "semafor", cerut inițial ca atare) — apoi
 * cerut mai "spălăcit" (mai puțin saturat), pe toate ecranele unde apare (butoane,
 * FAB, "Marchează finalizată" etc., care citesc toate de-aici, nu au propria culoare).
 */
const light = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#EEF3EF",
  ink: "#132016",
  inkSoft: "#4B5C4F",
  inkFaint: "#7C8B80",
  line: "#DCE5DE",
  accent: "#457D50",
  accentInk: "#2F5A38",
  accentTint: "#E4EFE6",
  ok: "#1E9E5A",
  okTint: "#E1F5E9",
  info: "#3E6FA6",
  infoTint: "#E4EDF6",
  warn: "#B07D12",
  warnTint: "#F5ECD6",
  danger: "#C23B2E",
  dangerTint: "#F8DEDA",
};

const dark: typeof light = {
  bg: "#0E1710",
  surface: "#16211A",
  surface2: "#1E2B22",
  ink: "#EAF2EC",
  inkSoft: "#AAB8AD",
  inkFaint: "#748079",
  line: "#2A382E",
  accent: "#3D8058",
  accentInk: "#7BBE93",
  accentTint: "#1A3624",
  ok: "#4ADE80",
  okTint: "#123320",
  info: "#7FB0E0",
  infoTint: "#1B2A3B",
  warn: "#E8C168",
  warnTint: "#3A2F14",
  danger: "#EF7C6C",
  dangerTint: "#3B1F1A",
};

export type ThemeColors = typeof light;

export function useThemeColors(): ThemeColors {
  const { resolvedScheme } = useThemePreference();
  return resolvedScheme === "dark" ? dark : light;
}

/** Familii de fonturi — vezi src/theme/useAppFonts.ts pentru încărcarea lor efectivă.
 * Fraunces pentru titluri (aceeași identitate ca documentul de plan), Karla pentru
 * text curent, IBM Plex Mono pentru date/cifre (perioade, sume, coduri de status). */
export const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  body: "Karla_400Regular",
  bodyMedium: "Karla_500Medium",
  bodyBold: "Karla_700Bold",
  mono: "IBMPlexMono_500Medium",
  monoSemiBold: "IBMPlexMono_600SemiBold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
