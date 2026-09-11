import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api/client";
import { cachedGet } from "../api/sessionCache";
import { MenuConfigDto, MenuItemDto, NotificationDto } from "../api/types";
import { useProject } from "../state/ProjectContext";
import { useThemeColors, fonts, spacing } from "../theme/tokens";

/** Folosit dacă `GET /api/menu` n-a răspuns încă (sau a picat) — ca bara de jos să nu
 * dispară niciodată, doar să arate config-ul implicit până vine cel de la backend. */
const FALLBACK_TABS: MenuItemDto[] = [
  { key: "locations", label: "Locații", href: "/", icon: "🏠" },
  { key: "bookings", label: "Solicitări", href: "/bookings", icon: "📋" },
  { key: "opportunities", label: "Activități", href: "/opportunities", icon: "🤝" },
  { key: "menu", label: "Meniu", href: "/menu", icon: "•••" },
];

const BOB_FALLBACK_TABS: MenuItemDto[] = [
  { key: "bob-dashboard", label: "Dashboard", href: "/bob", icon: "📦" },
  { key: "bob-beneficiaries", label: "Beneficiari", href: "/bob/beneficiaries", icon: "🧑‍🤝‍🧑" },
  { key: "bob-shopping", label: "Cumpărături", href: "/bob/shopping", icon: "🛒" },
  { key: "menu", label: "Meniu", href: "/menu", icon: "•••" },
];

export const BOTTOM_TAB_BAR_HEIGHT = 56;

/** Ce rute aparțin vizual de fiecare tab (pentru starea "activ"). Eticheta/iconița/
 * ordinea vin din backend (`GET /api/menu`), dar gruparea rutelor pe taburi ține de
 * structura de navigare a aplicației, care rămâne cod — nu are sens s-o controleze
 * backend-ul, ar însemna să reinventăm un router pe server. */
function isTabActive(key: string, pathname: string): boolean {
  switch (key) {
    case "locations":
      return pathname === "/";
    case "bookings":
      return pathname.startsWith("/bookings") || pathname.startsWith("/booking/");
    case "opportunities":
      return pathname.startsWith("/opportunities");
    case "menu":
      return ["/menu", "/beneficiaries", "/maintenance", "/cleaning", "/notifications", "/bob/history"].some((p) => pathname.startsWith(p));
    case "bob-dashboard":
      return pathname === "/bob";
    case "bob-beneficiaries":
      return pathname.startsWith("/bob/beneficiaries");
    case "bob-shopping":
      return pathname.startsWith("/bob/shopping");
    default:
      return false;
  }
}

/** Bara de jos, cu exact 4 taburi — ultimul ("•••") duce la ecranul Meniu, unde
 * stau restul secțiunilor. Folosită pe toate ecranele "principale" (`ScreenContainer
 * tabBar`), nu și pe formulare/ecrane de detaliu (acelea au doar un buton de "înapoi"
 * în antet, ca pe orice aplicație mobilă). */
export function BottomTabBar() {
  const colors = useThemeColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { activeProject } = useProject();
  const [tabs, setTabs] = useState<MenuItemDto[]>(activeProject === "bob" ? BOB_FALLBACK_TABS : FALLBACK_TABS);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Comută fallback-ul imediat la schimbarea proiectului — altfel, cât timp
    // răspunsul mock (vezi delay() din server.ts) nu a venit încă, s-ar vedea o
    // clipă tab-urile proiectului vechi.
    setTabs(activeProject === "bob" ? BOB_FALLBACK_TABS : FALLBACK_TABS);
    // Config de meniu — la fel pe toată sesiunea (per proiect activ), nu se schimbă
    // între ecrane; fără cache, se cerea din nou la fiecare montare a barei (adică la
    // fiecare navigare). Cheie separată per proiect — schimbarea proiectului din
    // Meniu nu trebuie să servească tab-urile vechi, cache-uite.
    cachedGet(`menu:${activeProject}`, () => api.get<MenuConfigDto>(`/api/menu?project=${activeProject}`))
      .then((config) => {
        if (!cancelled) setTabs(config.tabs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeProject]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<NotificationDto[]>("/api/notifications/mine?onlyUnread=true")
      .then((list) => {
        if (!cancelled) setUnreadCount(list.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {tabs.map((tab) => {
        const active = isTabActive(tab.key, pathname);
        return (
          <Link key={tab.key} href={tab.href} asChild>
            <Pressable style={styles.item}>
              <View>
                <Text style={[styles.icon, { opacity: active ? 1 : 0.55 }]}>{tab.icon}</Text>
                {tab.key === "menu" && unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.badgeLabel}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  fontFamily: active ? fonts.bodyBold : fonts.bodyMedium,
                  fontSize: 10.5,
                  color: active ? colors.accentInk : colors.inkFaint,
                  marginTop: 2,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 19, textAlign: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    borderRadius: 999,
    minWidth: 15,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeLabel: { color: "#FFFFFF", fontSize: 9.5, fontFamily: fonts.bodyBold },
});
