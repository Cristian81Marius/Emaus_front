import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors, spacing } from "../theme/tokens";
import { BottomTabBar, BOTTOM_TAB_BAR_HEIGHT } from "./BottomTabBar";

/** Fundal + padding consistent pentru fiecare ecran — un singur loc de schimbat
 * dacă vrem alt spațiu de gardă sau altă culoare de fundal peste tot deodată.
 * `tabBar` adaugă bara de navigație de jos (vezi BottomTabBar) — pus doar pe
 * ecranele "principale" (Locații/Solicitări/Curățenie/Beneficiari/Mentenanță/
 * Activități/Notificări/Meniu), nu și pe formulare sau ecrane de detaliu. */
/** `header`: ecranul are deja un antet nativ deasupra (`Stack.Screen
 * options={{headerShown:true}}`) — anulează padding-ul de sus din `content`, altfel
 * se adună cu spațiul antetului și apare un gol vizibil între antet și conținut.
 * Locații (`app/index.tsx`) e singurul ecran principal fără antet nativ — își
 * desenează titlul singur, așa că păstrează padding-ul de sus implicit. */
export function ScreenContainer({ style, tabBar = false, header = false, ...props }: ViewProps & { tabBar?: boolean; header?: boolean }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={tabBar ? ["top", "left", "right"] : undefined}>
      <View
        style={[
          styles.content,
          header && styles.noTopGap,
          style,
          tabBar && { paddingBottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + spacing.md },
        ]}
        {...props}
      />
      {tabBar && <BottomTabBar />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  noTopGap: { paddingTop: 0 },
});
