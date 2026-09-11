import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Link, Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { Card } from "../src/components/Card";
import { BOTTOM_TAB_BAR_HEIGHT } from "../src/components/BottomTabBar";
import { EmausMark } from "../src/components/EmausMark";
import { InfoButton, InfoLine } from "../src/components/InfoButton";
import { UnitStatusPill } from "../src/components/StatusPill";
import { useAuth } from "../src/state/AuthContext";
import { api, ApiError } from "../src/api/client";
import { OverviewStatsDto, PropertyDto } from "../src/api/types";
import { useThemeColors, fonts, spacing } from "../src/theme/tokens";

/** Ecranul "toate locațiile, dintr-o privire" — cel folosit zilnic de nucleu,
 * exact cel identificat ca prim candidat de wireframe în planul aplicației. Lista arată
 * doar un alias scurt per locație (`shortLabel`) — adresa completă e pe fișa locației,
 * ca ecranul să rămână ușor de citit dintr-o privire. */
export default function LocationsScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [properties, setProperties] = useState<PropertyDto[] | null>(null);
  const [stats, setStats] = useState<OverviewStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, overview] = await Promise.all([
        api.get<PropertyDto[]>("/api/properties"),
        api.get<OverviewStatsDto>("/api/stats/overview"),
      ]);
      setProperties(data);
      setStats(overview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca locațiile.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // `AuthGate` din app/_layout.tsx face deja redirect la /login când nu ești
  // autentificat — verificarea de-aici e doar narrowing pentru TypeScript.
  if (!user) return null;

  const totalUnits = properties?.reduce((sum, p) => sum + p.units.length, 0) ?? 0;
  const occupied = properties?.reduce((sum, p) => sum + p.units.filter((u) => u.status === "Occupied").length, 0) ?? 0;

  return (
    <ScreenContainer style={{ gap: 0 }} tabBar>
      <Stack.Screen options={{ animation: "fade" }} />
      <View style={styles.brandRow}>
        <EmausMark size={20} />
        <Text style={[styles.eyebrow, { color: colors.accentInk }]}>Bună, {user.fullName.split(" ")[0]}</Text>
      </View>
      <Text style={[styles.title, { color: colors.ink }]}>Locațiile Emaus</Text>

      {properties && (
        <Text style={[styles.summary, { color: colors.inkSoft }]}>
          {occupied} din {totalUnits} unități ocupate acum
        </Text>
      )}

      {stats && (
        <View style={{ marginTop: spacing.xs }}>
          <InfoButton label="Statistici de la începutul evidenței">
            <InfoLine label="Locații" value={String(stats.locationsCount)} />
            <InfoLine label="Zile de cazare oferite" value={`${stats.lifetimeStayDays} (≈ ${stats.lifetimeStayYears} ani)`} />
            <InfoLine label="Cazări încheiate" value={String(stats.lifetimeBookingsCompleted)} />
          </InfoButton>
        </View>
      )}

      {error && <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text>}

      <FlatList
        style={{ flex: 1, marginTop: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        data={properties ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/property/${item.id}`)}>
            <Card>
              <Text style={[styles.address, { color: colors.ink }]}>{item.shortLabel}</Text>
              <View style={styles.unitsRow}>
                {item.units.map((unit) => (
                  <View key={unit.id} style={styles.unitChip}>
                    <Text style={[styles.unitName, { color: colors.inkSoft }]}>{unit.name}</Text>
                    <UnitStatusPill status={unit.status} />
                  </View>
                ))}
              </View>
            </Card>
          </Pressable>
        )}
      />

      <Link href="/booking/new" asChild>
        <Pressable style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.accent, bottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + spacing.md }])}>
          <Text style={styles.fabLabel}>+ Solicitare nouă</Text>
        </Pressable>
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { fontFamily: fonts.display, fontSize: 26, marginTop: 2 },
  summary: { fontFamily: fonts.mono, fontSize: 12.5, marginTop: spacing.md },
  address: { fontFamily: fonts.bodyBold, fontSize: 15.5, marginBottom: spacing.sm },
  unitsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  unitChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  unitName: { fontFamily: fonts.mono, fontSize: 12 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
  },
  fabLabel: { fontFamily: fonts.bodyBold, color: "#FFFFFF", fontSize: 14.5 },
});
