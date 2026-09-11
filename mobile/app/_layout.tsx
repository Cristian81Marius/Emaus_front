import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, usePathname } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/state/AuthContext";
import { DeviceLockProvider, useDeviceLock } from "../src/state/DeviceLockContext";
import { ThemeProvider, useThemePreference } from "../src/state/ThemeContext";
import { ProjectProvider } from "../src/state/ProjectContext";
import { ApiModeProvider } from "../src/state/ApiModeContext";
import { PushNotificationOverlay } from "../src/components/PushNotificationOverlay";
import { useAppFonts } from "../src/theme/useAppFonts";
import { useThemeColors, fonts } from "../src/theme/tokens";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  const [fontsLoaded] = useAppFonts();
  const colors = useThemeColors();
  const { resolvedScheme } = useThemePreference();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ApiModeProvider>
        <AuthProvider>
          <ProjectProvider>
            <DeviceLockProvider>
              <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
              <AuthGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    // Antetul nativ (Stack.Screen headerShown:true, pe toate ecranele în afară
                    // de Locații, care își desenează singur antetul) folosea implicit alb pe
                    // orice temă — "ruptă din peisaj" pe dark mode. Setat aici o singură dată,
                    // ca fiecare ecran cu antet nativ să-l moștenească automat.
                    headerStyle: { backgroundColor: colors.surface },
                    headerShadowVisible: false,
                    headerTintColor: colors.ink,
                    headerTitleStyle: { fontFamily: fonts.bodyBold, color: colors.ink },
                  }}
                />
              </AuthGate>
              <PushNotificationOverlay />
            </DeviceLockProvider>
          </ProjectProvider>
        </AuthProvider>
      </ApiModeProvider>
    </SafeAreaProvider>
  );
}

// Singurele rute accesibile FĂRĂ sesiune — login-ul propriu-zis + auto-înregistrarea
// ("Cere acces", app/register.tsx), care prin definiție se întâmplă înainte de-a
// exista un cont utilizabil.
const PUBLIC_ROUTES = ["/login", "/register"];

/** Un singur loc, deasupra tuturor ecranelor, care controlează ce se vede în funcție
 * de sesiune + blocarea de dispozitiv:
 * - fără sesiune (`user == null`) → `/login`, din orice ecran era activ (logout
 *   manual sau automat la un 401 — vezi AuthContext) — cu excepția `/register`, vezi
 *   `PUBLIC_ROUTES`;
 * - cu sesiune, dar dispozitivul are PIN/Face ID activat și nu s-a deblocat încă în
 *   sesiunea curentă a aplicației (pornire rece) → `/unlock` (vezi DeviceLockContext);
 * - altfel, ecranele normale.
 * Un singur loc de verificat, nu un guard repetat pe fiecare ecran. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: lockLoading, enabled: lockEnabled, unlocked } = useDeviceLock();
  const pathname = usePathname();

  if (authLoading || lockLoading) return null;

  if (!user) {
    if (!PUBLIC_ROUTES.includes(pathname)) return <Redirect href="/login" />;
    return <>{children}</>;
  }

  if (lockEnabled && !unlocked) {
    if (pathname !== "/unlock") return <Redirect href="/unlock" />;
    return <>{children}</>;
  }

  if (pathname === "/unlock") return <Redirect href="/" />;
  return <>{children}</>;
}
