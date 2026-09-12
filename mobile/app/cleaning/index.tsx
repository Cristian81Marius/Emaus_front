import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { ChipPicker } from "../../src/components/ChipPicker";
import { SelectField } from "../../src/components/SelectField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { CleaningStatusPill } from "../../src/components/StatusPill";
import { SkeletonList } from "../../src/components/Skeleton";
import { useAuth } from "../../src/state/AuthContext";
import { api, ApiError } from "../../src/api/client";
import { cachedGet } from "../../src/api/sessionCache";
import { CleaningAssignmentDto, CleaningTaskDto, DayOfWeekName, PropertyDto, UserDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing, radius } from "../../src/theme/tokens";

// Numele exacte ale membrilor System.DayOfWeek (vezi comentariul de pe DayOfWeekName în
// types.ts) — trimise/primite ca text de JsonStringEnumConverter, nu ca index 0-6.
const DAYS: { value: DayOfWeekName; label: string }[] = [
  { value: "Monday", label: "Luni" },
  { value: "Tuesday", label: "Marți" },
  { value: "Wednesday", label: "Miercuri" },
  { value: "Thursday", label: "Joi" },
  { value: "Friday", label: "Vineri" },
  { value: "Saturday", label: "Sâmbătă" },
  { value: "Sunday", label: "Duminică" },
];
const DAY_LABEL: Record<DayOfWeekName, string> = Object.fromEntries(DAYS.map((d) => [d.value, d.label])) as Record<DayOfWeekName, string>;

/** Curățenie — ture concrete (o instanță după fiecare check-out, vezi
 * BookingService.CheckOutAsync) + rotația voluntarilor responsabili pe fiecare
 * locație. Două fire separate, un singur ecran, ca în planul aplicației. */
export default function CleaningScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const isNucleus = user?.role === "Nucleus";

  const [tab, setTab] = useState<"tasks" | "rotation">("tasks");
  const [onlyPending, setOnlyPending] = useState(true);
  const [tasks, setTasks] = useState<CleaningTaskDto[] | null>(null);
  const [assignments, setAssignments] = useState<CleaningAssignmentDto[] | null>(null);
  const [properties, setProperties] = useState<PropertyDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [users, setUsers] = useState<UserDto[] | null>(null);
  const [pickedProperty, setPickedProperty] = useState<PropertyDto | null>(null);
  const [pickedUser, setPickedUser] = useState<UserDto | null>(null);
  const [pickedDay, setPickedDay] = useState<DayOfWeekName | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [t, a, p] = await Promise.all([
        api.get<CleaningTaskDto[]>(`/api/cleaning/tasks?onlyPending=${onlyPending}`),
        api.get<CleaningAssignmentDto[]>("/api/cleaning/assignments"),
        api.get<PropertyDto[]>("/api/properties"),
      ]);
      setTasks(t);
      setAssignments(a);
      setProperties(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca datele de curățenie.");
    }
  }, [onlyPending]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const complete = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/cleaning/tasks/${id}/complete`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut marca tura finalizată.");
    } finally {
      setBusyId(null);
    }
  };

  const openAddAssignment = async () => {
    setShowAddAssignment(true);
    if (users) return;
    try {
      setUsers(await cachedGet("users", () => api.get<UserDto[]>("/api/users")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca voluntarii.");
    }
  };

  const addAssignment = async () => {
    if (!pickedProperty || !pickedUser) return;
    setBusyId("new-assignment");
    setError(null);
    try {
      await api.post("/api/cleaning/assignments", {
        propertyId: pickedProperty.id,
        volunteerUserId: pickedUser.id,
        scheduledDayOfWeek: pickedDay,
      });
      setShowAddAssignment(false);
      setPickedProperty(null);
      setPickedUser(null);
      setPickedDay(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut adăuga în rotație.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Curățenie" }} />

      <View style={styles.tabsRow}>
        <SubTab label="Ture" active={tab === "tasks"} onPress={() => setTab("tasks")} />
        <SubTab label="Rotație" active={tab === "rotation"} onPress={() => setTab("rotation")} />
      </View>

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {tab === "tasks" && (
        <>
          <Pressable onPress={() => setOnlyPending((v) => !v)}>
            <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 13 }}>
              {onlyPending ? "Arată toate turele" : "Arată doar cele în așteptare"}
            </Text>
          </Pressable>

          {!tasks && (
            <View style={{ marginTop: spacing.sm }}>
              <SkeletonList count={4} lines={2} />
            </View>
          )}

          <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl, marginTop: spacing.sm }}>
            {tasks?.length === 0 && (
              <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Nicio tură pe acest filtru.</Text>
            )}
            {tasks?.map((t) => (
              <Card key={t.id}>
                <View style={styles.rowBetween}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink }}>{t.unitName}</Text>
                  <CleaningStatusPill status={t.status} />
                </View>
                <Text style={{ fontFamily: fonts.mono, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 }}>
                  {t.propertyAddress} · programat {t.scheduledDate}
                </Text>
                {t.completedByName && (
                  <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, marginTop: 2 }}>
                    finalizat de {t.completedByName}
                  </Text>
                )}
                {t.status !== "Done" && (
                  <View style={{ marginTop: spacing.sm }}>
                    <PrimaryButton label="Marchează finalizată" loading={busyId === t.id} onPress={() => complete(t.id)} />
                  </View>
                )}
              </Card>
            ))}
          </ScrollView>
        </>
      )}

      {tab === "rotation" && !properties && (
        <View style={{ marginTop: spacing.sm }}>
          <SkeletonList count={4} lines={2} withPill={false} />
        </View>
      )}

      {tab === "rotation" && (
        <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl, marginTop: spacing.sm }}>
          {properties?.map((p) => {
            const rowsHere = assignments?.filter((a) => a.propertyId === p.id) ?? [];
            return (
              <Card key={p.id}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink }}>{p.address}</Text>
                {rowsHere.length === 0 && (
                  <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13, marginTop: spacing.xs }}>
                    Niciun responsabil asignat.
                  </Text>
                )}
                {rowsHere.map((a) => (
                  <Text key={a.id} style={{ color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, marginTop: spacing.xs }}>
                    {a.volunteerName}{a.scheduledDayOfWeek ? ` · ${DAY_LABEL[a.scheduledDayOfWeek]}` : ""}
                  </Text>
                ))}
              </Card>
            );
          })}

          {isNucleus && !showAddAssignment && (
            <PrimaryButton label="+ Adaugă responsabil în rotație" onPress={openAddAssignment} />
          )}

          {isNucleus && showAddAssignment && (
            <Card style={{ gap: spacing.sm }}>
              <SelectField
                label="Locație"
                options={(properties ?? []).map((p) => ({ value: p.id, label: p.shortLabel }))}
                value={pickedProperty?.id ?? ""}
                onChange={(v) => setPickedProperty(properties?.find((p) => p.id === v) ?? null)}
                placeholder="Alege o locație"
              />
              {users === null && <Text style={{ color: colors.inkSoft }}>Se încarcă…</Text>}
              <SelectField
                label="Voluntar"
                options={(users ?? []).map((u) => ({ value: u.id, label: u.fullName }))}
                value={pickedUser?.id ?? ""}
                onChange={(v) => setPickedUser(users?.find((u) => u.id === v) ?? null)}
                placeholder="Alege un voluntar"
              />
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint, marginTop: spacing.sm }}>
                Ziua din săptămână (opțional)
              </Text>
              <ChipPicker options={DAYS} value={pickedDay ?? ""} onChange={setPickedDay} />
              <View style={styles.actionsRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Adaugă"
                    loading={busyId === "new-assignment"}
                    onPress={addAssignment}
                    disabled={!pickedProperty || !pickedUser}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Renunță" variant="secondary" onPress={() => setShowAddAssignment(false)} />
                </View>
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function SubTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tab,
        { borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accentTint : "transparent" },
      ]}
    >
      <Text style={{ color: active ? colors.accentInk : colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tabsRow: { flexDirection: "row", gap: spacing.sm },
  tab: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  // Vezi comentariul din app/bookings/index.tsx — fără `flex:1`, înălțimea listei
  // scrollabile era ambiguă în layout-ul flex de sub ScreenContainer.
  list: { flex: 1 },
});
