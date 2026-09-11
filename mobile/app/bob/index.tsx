import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { EmausMark } from "../../src/components/EmausMark";
import { api, ApiError } from "../../src/api/client";
import { BobStatsDto } from "../../src/api/bobTypes";
import { useThemeColors, fonts, spacing, radius } from "../../src/theme/tokens";

/** Dashboard-ul Box of Blessing — primul tab cât timp proiectul activ e BOB (vezi
 * ProjectContext). Ecran-rădăcină de tab, la fel ca Locații pentru Emaus: fără antet
 * nativ, își desenează titlul singur (vezi `ScreenContainer`, fără `header`). */
export default function BobDashboardScreen() {
  const colors = useThemeColors();
  const [stats, setStats] = useState<BobStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setStats(await api.get<BobStatsDto>("/api/bob/stats/overview"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca dashboard-ul.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer style={{ gap: 0 }} tabBar>
      <Stack.Screen options={{ animation: "fade" }} />
      <View style={styles.brandRow}>
        <EmausMark size={20} />
        <Text style={[styles.eyebrow, { color: colors.accentInk }]}>Box of Blessing</Text>
      </View>
      <Text style={[styles.title, { color: colors.ink }]}>Cutii cu alimente</Text>

      {error && <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text>}

      {stats && (
        <ScrollView
          style={{ flex: 1, marginTop: spacing.md }}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        >
          <View style={styles.grid}>
            <StatTile label="Zile până la livrare" value={String(stats.daysUntilNextDelivery)} colors={colors} />
            <StatTile label="Beneficiari activi" value={String(stats.beneficiariesCount)} colors={colors} />
            <StatTile label="Buget maxim / cutie" value={`${stats.maxBudgetPerBox} lei`} colors={colors} />
            <StatTile label="Total cutie curentă" value={`${stats.currentBoxTotal} lei`} colors={colors} />
            <StatTile label="Voluntari implicați" value={String(stats.volunteersInvolved)} colors={colors} />
            <StatTile
              label="Ultima livrare"
              value={stats.lastDeliveryDate ? formatDate(stats.lastDeliveryDate) : "—"}
              colors={colors}
            />
          </View>

          {stats.currentBoxTotal > stats.maxBudgetPerBox && (
            <Card style={{ borderColor: colors.danger }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.danger }}>
                Cutia curentă ({stats.currentBoxTotal} lei) depășește bugetul maxim ({stats.maxBudgetPerBox} lei) — vezi tab-ul
                Cumpărături.
              </Text>
            </Card>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatTile({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={[styles.tile, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{value}</Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.inkSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = {
  brandRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.6 },
  title: { fontFamily: fonts.display, fontSize: 26, marginTop: 2 },
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
  tile: { flexBasis: "31%" as const, flexGrow: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
};
