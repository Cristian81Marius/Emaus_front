import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { BOTTOM_TAB_BAR_HEIGHT } from "../../src/components/BottomTabBar";
import { Field } from "../../src/components/Field";
import { SelectField } from "../../src/components/SelectField";
import { InfoButton, InfoLine } from "../../src/components/InfoButton";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { MaintenanceStatusPill, MaintenancePriorityPill } from "../../src/components/StatusPill";
import { SkeletonList } from "../../src/components/Skeleton";
import { useAuth } from "../../src/state/AuthContext";
import { api, ApiError } from "../../src/api/client";
import { cachedGet } from "../../src/api/sessionCache";
import { MaintenanceTicketDto, MaintenanceTicketStatus, UserDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing, radius } from "../../src/theme/tokens";

const TABS: { label: string; value: MaintenanceTicketStatus | undefined }[] = [
  { label: "Toate", value: undefined },
  { label: "Noi", value: "New" },
  { label: "Asignate", value: "Assigned" },
  { label: "În lucru", value: "InProgress" },
  { label: "Rezolvate", value: "Resolved" },
];

/** Sesizări de mentenanță — de la consumabile la reparații/urgențe. Asignarea
 * (Nucleus) și rezolvarea (oricine, cu costul real) se fac inline pe fiecare
 * card, ca să nu mai fie nevoie de încă un ecran de detaliu pentru un flux scurt. */
export default function MaintenanceScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const isNucleus = user?.role === "Nucleus";

  const [tab, setTab] = useState<MaintenanceTicketStatus | undefined>(undefined);
  const [tickets, setTickets] = useState<MaintenanceTicketDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserDto[] | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [actualCost, setActualCost] = useState("");

  const load = useCallback(async (status: MaintenanceTicketStatus | undefined) => {
    try {
      setError(null);
      const qs = status ? `?status=${status}` : "";
      setTickets(await api.get<MaintenanceTicketDto[]>(`/api/maintenance${qs}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca sesizările.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [load, tab]));

  const openAssign = async (id: string) => {
    setAssigningId(id);
    if (users) return;
    try {
      setUsers(await cachedGet("users", () => api.get<UserDto[]>("/api/users")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca voluntarii.");
    }
  };

  const assign = async (ticketId: string, assignedToUserId: string) => {
    setBusyId(ticketId);
    setError(null);
    try {
      await api.post(`/api/maintenance/${ticketId}/assign`, { assignedToUserId });
      setAssigningId(null);
      await load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut asigna sesizarea.");
    } finally {
      setBusyId(null);
    }
  };

  const resolve = async (ticketId: string) => {
    setBusyId(ticketId);
    setError(null);
    try {
      await api.post(`/api/maintenance/${ticketId}/resolve`, {
        actualCost: actualCost.trim() ? Number(actualCost.trim()) : null,
      });
      setResolvingId(null);
      setActualCost("");
      await load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut rezolva sesizarea.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Mentenanță" }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
        {TABS.map((t) => {
          const active = t.value === tab;
          return (
            <Pressable
              key={t.label}
              onPress={() => setTab(t.value)}
              style={[
                styles.tab,
                { borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accentTint : "transparent" },
              ]}
            >
              <Text style={{ color: active ? colors.accentInk : colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 13 }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {!tickets && (
        <View style={{ marginTop: spacing.md }}>
          <SkeletonList count={4} lines={3} />
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        {tickets?.length === 0 && <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Nimic pe acest filtru.</Text>}
        {tickets?.map((t) => (
          <Card key={t.id}>
            <View style={styles.rowBetween}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink }}>{t.propertyAddress}</Text>
              <MaintenanceStatusPill status={t.status} />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs }}>
              <MaintenancePriorityPill priority={t.priority} />
              <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.inkFaint, alignSelf: "center" }}>
                {typeLabel(t.type)}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft, marginTop: spacing.sm }}>
              {t.description}
            </Text>

            <View style={{ marginTop: spacing.sm }}>
              <InfoButton label="Detalii">
                <InfoLine label="Raportat de" value={t.reportedByName} />
                {t.assignedToName && <InfoLine label="Asignat" value={t.assignedToName} />}
                {t.estimatedCost !== null && <InfoLine label="Cost estimat" value={`${t.estimatedCost} lei`} />}
                {t.actualCost !== null && <InfoLine label="Cost real" value={`${t.actualCost} lei`} />}
              </InfoButton>
            </View>

            {isNucleus && t.status === "New" && assigningId !== t.id && (
              <View style={{ marginTop: spacing.sm }}>
                <PrimaryButton label="Asignează" onPress={() => openAssign(t.id)} />
              </View>
            )}
            {assigningId === t.id && (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                {users === null && <Text style={{ color: colors.inkSoft }}>Se încarcă…</Text>}
                <SelectField
                  label="Voluntar"
                  options={(users ?? []).map((u) => ({ value: u.id, label: u.fullName }))}
                  value=""
                  onChange={(v) => assign(t.id, v)}
                  placeholder="Alege un voluntar"
                />
                <PrimaryButton label="Renunță" variant="secondary" onPress={() => setAssigningId(null)} />
              </View>
            )}

            {t.status !== "Resolved" && resolvingId !== t.id && (
              <View style={{ marginTop: spacing.sm }}>
                <PrimaryButton label="Marchează rezolvată" variant="secondary" onPress={() => setResolvingId(t.id)} />
              </View>
            )}
            {resolvingId === t.id && (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <Field label="Cost real (opțional)" value={actualCost} onChangeText={setActualCost} keyboardType="numeric" placeholder="lei" />
                <View style={styles.actionsRow}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Confirmă" loading={busyId === t.id} onPress={() => resolve(t.id)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Renunță" variant="secondary" onPress={() => { setResolvingId(null); setActualCost(""); }} />
                  </View>
                </View>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      <Link href="/maintenance/new" asChild>
        <Pressable style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.accent, bottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + spacing.md }])}>
          <Text style={styles.fabLabel}>+ Sesizare nouă</Text>
        </Pressable>
      </Link>
    </ScreenContainer>
  );
}

function typeLabel(type: MaintenanceTicketDto["type"]) {
  return { Supplies: "Consumabile", Repair: "Reparație", Urgent: "Urgență" }[type];
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  // Vezi comentariul din app/bookings/index.tsx — un ScrollView orizontal are nevoie de
  // o înălțime explicită pe web, `flexGrow`/`flexShrink` singure nu sunt de-ajuns.
  tabsScroll: { flexGrow: 0, flexShrink: 0, height: 40 },
  tabsRow: { gap: spacing.sm, alignItems: "center" },
  list: { flex: 1 },
  tab: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
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
