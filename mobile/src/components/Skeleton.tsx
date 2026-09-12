import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from "react-native";
import { useThemeColors, radius, spacing } from "../theme/tokens";
import { Card } from "./Card";

/** Schelet de încărcare — arătat cât timp un ecran așteaptă primul răspuns de la
 * backend, ca utilizatorul să vadă că vin date, nu că aplicația e blocată/lentă
 * (înainte ecranele rămâneau complet goale în acel interval). Puls simplu de opacitate
 * (Animated, nu reanimated) — identic pe web/nativ, fără dependențe noi de layout. */
export function SkeletonBox({ width, height, radius: r = radius.sm, style }: { width: DimensionValue; height: number; radius?: number; style?: ViewStyle }) {
  const colors = useThemeColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.surface2, opacity }, style]} />;
}

/** Un rând de listă generic (titlu + status + una-două linii de meta) — acoperă forma
 * majorității cardurilor din aplicație (Locații, Beneficiari, Solicitări, Activități,
 * Mentenanță, Curățenie, Notificări). Nu urmărește pixel-perfect fiecare ecran — scopul
 * e senzația de "vine ceva", nu o machetă exactă. */
export function SkeletonCard({ lines = 2, withPill = true }: { lines?: number; withPill?: boolean }) {
  return (
    <Card>
      <View style={styles.headerRow}>
        <SkeletonBox width="55%" height={16} />
        {withPill && <SkeletonBox width={64} height={20} radius={radius.pill} />}
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={{ marginTop: spacing.sm }}>
          <SkeletonBox width={i === lines - 1 ? "35%" : "75%"} height={12} />
        </View>
      ))}
    </Card>
  );
}

/** Lista de-nlocuit un `FlatList`/`ScrollView` cât timp datele sunt încă `null` (primul
 * fetch). Folosește exact același `gap` ca listele reale, ca tranziția spre datele
 * adevărate să nu sară vizual. */
export function SkeletonList({ count = 5, lines = 2, withPill = true }: { count?: number; lines?: number; withPill?: boolean }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} withPill={withPill} />
      ))}
    </View>
  );
}

/** Câteva bare de lățimi diferite — pentru ecrane de tip "fișă" (detaliu), unde un
 * card-per-rând n-are sens (property/[id], beneficiaries/[id], bookings/[id],
 * dashboard). Nu mimează layout-ul exact al fiecărui ecran, doar dă senzația corectă
 * de "text/carduri care urmează să apară". */
export function SkeletonBlock({ widths = ["70%", "45%", "90%", "60%"] }: { widths?: DimensionValue[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {widths.map((w, i) => (
        <SkeletonBox key={i} width={w} height={i === 0 ? 20 : 14} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
