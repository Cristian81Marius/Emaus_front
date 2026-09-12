import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { BOTTOM_TAB_BAR_HEIGHT } from "../../src/components/BottomTabBar";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SkeletonList } from "../../src/components/Skeleton";
import { useAuth } from "../../src/state/AuthContext";
import { api, ApiError } from "../../src/api/client";
import { OpportunityDto, OpportunityType } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

const TYPE_LABEL: Record<OpportunityType, string> = {
  Cleaning: "Curățenie",
  Event: "Eveniment",
  Visit: "Vizită",
  Promotion: "Promovare",
};

/** Calendarul unic de oportunități de implicare — curățenie, evenimente, vizite,
 * promovare — cu înscriere directă, exact cum descrie planul aplicației. */
export default function OpportunitiesScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNucleus = user?.role === "Nucleus";

  const [opportunities, setOpportunities] = useState<OpportunityDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setOpportunities(await api.get<OpportunityDto[]>("/api/opportunities"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca oportunitățile.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleSignup = async (o: OpportunityDto) => {
    setBusyId(o.id);
    setError(null);
    try {
      if (o.currentUserSignedUp) {
        await api.delete(`/api/opportunities/${o.id}/signup`);
      } else {
        await api.post(`/api/opportunities/${o.id}/signup`);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut actualiza înscrierea.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Activități", animation: "fade" }} />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {!opportunities && (
        <View style={{ marginTop: spacing.md }}>
          <SkeletonList count={4} lines={3} withPill={false} />
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        {opportunities?.length === 0 && (
          <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Nicio activitate publicată încă.</Text>
        )}
        {opportunities?.map((o) => {
          const full = o.capacity !== null && o.signedUpCount >= o.capacity && !o.currentUserSignedUp;
          return (
            <Card key={o.id}>
              <View style={styles.rowBetween}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink }}>{o.title}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.accentInk }}>{TYPE_LABEL[o.type]}</Text>
              </View>
              {isNucleus && (
                <Pressable onPress={() => router.push(`/opportunities/${o.id}/edit`)}>
                  <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 }}>Editează</Text>
                </Pressable>
              )}
              <Text style={{ fontFamily: fonts.mono, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 }}>
                {formatScheduled(o.scheduledAt, o.hasTime)}
                {o.propertyAddress ? ` · ${o.propertyAddress}` : ""}
              </Text>
              {o.description && (
                <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft, marginTop: spacing.sm }}>
                  {o.description}
                </Text>
              )}
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginTop: spacing.xs }}>
                {o.signedUpCount}{o.capacity !== null ? ` / ${o.capacity}` : ""} înscriși
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <PrimaryButton
                  label={o.currentUserSignedUp ? "Renunță la înscriere" : full ? "Complet" : "Înscrie-te"}
                  variant={o.currentUserSignedUp ? "secondary" : "primary"}
                  loading={busyId === o.id}
                  disabled={full}
                  onPress={() => toggleSignup(o)}
                />
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {isNucleus && (
        <Link href="/opportunities/new" asChild>
          <Pressable style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.accent, bottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + spacing.md }])}>
            <Text style={styles.fabLabel}>+ Activitate nouă</Text>
          </Pressable>
        </Link>
      )}
    </ScreenContainer>
  );
}

function formatScheduled(iso: string | null, hasTime: boolean) {
  if (!iso) return "Dată de stabilit";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (!hasTime) return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
  return d.toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  // Vezi comentariul din app/bookings/index.tsx — fără `flex:1`, înălțimea listei era ambiguă.
  list: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
  },
  fabLabel: { fontFamily: fonts.bodyBold, color: "#FFFFFF", fontSize: 14.5 },
});
