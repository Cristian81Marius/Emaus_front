import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { Card } from "../src/components/Card";
import { PhoneField } from "../src/components/PhoneActions";
import { api, ApiError } from "../src/api/client";
import { OverviewStatsDto } from "../src/api/types";
import { useThemeColors, fonts, spacing, radius } from "../src/theme/tokens";

/** Dashboard general — un singur ecran cu tot ce răspunde la "cum stăm acum",
 * reachable din Meniu. Toate cifrele vin din `GET /api/stats/overview` (extins cu
 * voluntari/beneficiari-anul-acesta/sold/contact/noutate — vezi OverviewStatsDto).
 * Soldul, contactul și noutatea sunt valori de configurare (`orgInfo` din
 * mock/data.ts), nu calculate — momentan placeholder până primim cifrele reale. */
export default function DashboardScreen() {
  const colors = useThemeColors();

  const [stats, setStats] = useState<OverviewStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setStats(await api.get<OverviewStatsDto>("/api/stats/overview"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca dashboard-ul.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Dashboard" }} />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {stats && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
          {stats.announcement && (
            <Card style={{ borderColor: colors.accent, backgroundColor: colors.accentTint }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accentInk, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Noutate
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: spacing.xs }}>
                {stats.announcement}
              </Text>
            </Card>
          )}

          <View style={styles.grid}>
            <StatTile label="Locații" value={String(stats.locationsCount)} colors={colors} />
            <StatTile label="Unități" value={String(stats.unitsCount)} colors={colors} />
            <StatTile label="Unități ocupate" value={String(stats.occupiedUnitsCount)} colors={colors} />
            <StatTile label="Voluntari" value={String(stats.volunteersCount)} colors={colors} />
            <StatTile label="Beneficiari anul acesta" value={String(stats.beneficiariesThisYear)} colors={colors} />
            <StatTile label="Sold curent" value={`${stats.currentBalance} lei`} colors={colors} />
            <StatTile label="Cheltuieli lunare estimative" value={`${stats.estimatedMonthlyExpenses} lei`} colors={colors} />
          </View>

          <Card>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink, marginBottom: spacing.xs }}>
              De la începutul evidenței
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft }}>
              Activi din {formatStartDate(stats.startDate)} ({yearsSince(stats.startDate)} ani) · {stats.lifetimeStayDays} zile de
              cazare oferite (≈ {stats.lifetimeStayYears} ani) · {stats.lifetimeBookingsCompleted} cazări încheiate
            </Text>
          </Card>

          <Card>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink, marginBottom: spacing.xs }}>
              Contact Emaus
            </Text>
            {stats.contactPhone ? (
              <PhoneField label="Telefon asociație" phone={stats.contactPhone} />
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint }}>
                Neconfigurat — adaugă-l în src/api/mock/data.ts (orgInfo.contactPhone).
              </Text>
            )}
          </Card>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function formatStartDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
}

function yearsSince(iso: string): string {
  const years = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years.toFixed(1);
}

function StatTile({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={[styles.tile, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{value}</Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.inkSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = {
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
  tile: {
    flexBasis: "31%" as const,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
};
