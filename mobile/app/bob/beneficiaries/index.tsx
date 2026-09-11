import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../../../src/components/ScreenContainer";
import { Card } from "../../../src/components/Card";
import { BOTTOM_TAB_BAR_HEIGHT } from "../../../src/components/BottomTabBar";
import { Field } from "../../../src/components/Field";
import { PhoneActions } from "../../../src/components/PhoneActions";
import { SelectField } from "../../../src/components/SelectField";
import { api, ApiError } from "../../../src/api/client";
import { BOB_VOLUNTEER_OPTIONS, BobBeneficiaryDto } from "../../../src/api/bobTypes";
import { useThemeColors, fonts, spacing, radius } from "../../../src/theme/tokens";
import { openInMaps } from "../../../src/utils/linking";

/** Listă beneficiari BOB — implicit doar cei activi (cei "Foști"/"Posibili" nu sunt
 * cui mai ducem cutii lunar, n-are rost să aglomerăm lista din start); "Arată toți"
 * escaladează la lista completă, la cerere. */
export default function BobBeneficiariesScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<BobBeneficiaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setBeneficiaries(await api.get<BobBeneficiaryDto[]>("/api/bob/beneficiaries"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca beneficiarii.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (beneficiaries ?? [])
      .filter((b) => showAll || b.status === "Active")
      .filter((b) => !term || b.fullName.toLowerCase().includes(term));
  }, [beneficiaries, showAll, search]);

  const hiddenCount = (beneficiaries ?? []).filter((b) => b.status !== "Active").length;

  // Actualizare optimistă local + PATCH în fundal — "Am vorbit"/"Livrat"/Responsabil
  // se schimbă des, direct din listă (cerut explicit), n-are rost să aștepți un
  // reîncărcare completă (cu delay-ul mock-ului) după fiecare tap.
  const patchBeneficiary = (id: string, patch: Partial<BobBeneficiaryDto>) => {
    setBeneficiaries((prev) => (prev ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b)));
    void api.patch(`/api/bob/beneficiaries/${id}`, patch).catch(() => load());
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Beneficiari BOB", animation: "fade" }} />

      <Field label="Caută după nume" value={search} onChangeText={setSearch} placeholder="ex. Vintilă" />

      {!showAll && hiddenCount > 0 && (
        <Pressable onPress={() => setShowAll(true)} style={{ marginTop: spacing.xs }}>
          <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>
            Arată și foștii/posibilii beneficiari ({hiddenCount}) ›
          </Text>
        </Pressable>
      )}
      {showAll && (
        <Pressable onPress={() => setShowAll(false)} style={{ marginTop: spacing.xs }}>
          <Text style={{ color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Arată doar activii</Text>
        </Pressable>
      )}

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      <FlatList
        style={styles.list}
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
        ListEmptyComponent={beneficiaries ? <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Niciun beneficiar găsit.</Text> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/bob/beneficiaries/${item.id}`)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={[styles.name, { color: colors.ink }]}>{item.fullName}</Text>
                {item.status !== "Active" && (
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.inkFaint }}>
                    {item.status === "Former" ? "Fost" : "Posibil"}
                  </Text>
                )}
              </View>
              <View style={styles.metaRow}>
                {item.phone ? <PhoneActions phone={item.phone} textStyle={styles.meta} /> : <Text style={[styles.meta, { color: colors.inkSoft }]}>fără telefon</Text>}
                {item.mobility && <Text style={[styles.meta, { color: colors.inkSoft }]}> · {item.mobility}</Text>}
              </View>
              {item.address && (
                <Pressable onPress={(e) => { e.stopPropagation(); openInMaps(item.address!); }}>
                  <Text style={[styles.meta, { color: colors.accentInk }]} numberOfLines={1}>📍 {item.address}</Text>
                </Pressable>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm }}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                  <SelectField
                    compact
                    label="Responsabil"
                    value={item.assignedVolunteerName ?? ""}
                    options={[{ value: "", label: "— fără responsabil —" }, ...BOB_VOLUNTEER_OPTIONS]}
                    onChange={(value) => patchBeneficiary(item.id, { assignedVolunteerName: value || null })}
                    placeholder="Responsabil"
                  />
                </Pressable>
                <StatusChip
                  label="Am vorbit"
                  active={item.contacted}
                  colors={colors}
                  onPress={(e) => { e.stopPropagation(); patchBeneficiary(item.id, { contacted: !item.contacted }); }}
                />
                <StatusChip
                  label="Livrat"
                  active={item.delivered}
                  colors={colors}
                  onPress={(e) => { e.stopPropagation(); patchBeneficiary(item.id, { delivered: !item.delivered }); }}
                />
              </View>
            </Card>
          </Pressable>
        )}
      />

      <Link href="/bob/beneficiaries/new" asChild>
        <Pressable style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.accent, bottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + spacing.md }])}>
          <Text style={styles.fabLabel}>+ Beneficiar nou</Text>
        </Pressable>
      </Link>
    </ScreenContainer>
  );
}

function StatusChip({
  label,
  active,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onPress: (e: { stopPropagation: () => void }) => void;
}) {
  return (
    <Pressable onPress={onPress} style={[chipStyles.chip, { borderColor: active ? colors.ok : colors.line, backgroundColor: active ? colors.accentTint : "transparent" }]}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 10.5, color: active ? colors.ok : colors.inkFaint }}>
        {active ? "✓ " : "✕ "}{label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: spacing.sm },
});

const styles = StyleSheet.create({
  list: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  name: { fontFamily: fonts.bodyBold, fontSize: 15.5 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  meta: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
  },
  fabLabel: { fontFamily: fonts.bodyBold, color: "#FFFFFF", fontSize: 14.5 },
});
