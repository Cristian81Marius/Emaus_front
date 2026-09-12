import React, { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { BOTTOM_TAB_BAR_HEIGHT } from "../../src/components/BottomTabBar";
import { PhoneActions } from "../../src/components/PhoneActions";
import { BookingStatusPill } from "../../src/components/StatusPill";
import { SkeletonList } from "../../src/components/Skeleton";
import { api, ApiError } from "../../src/api/client";
import { BookingDto, BookingStatus } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

/** Firul solicitărilor — vezi "Flux: solicitare nouă" din plan. Aici doar răsfoiești și
 * filtrezi după status; deciziile efective (aprobă/respinge/alocă/check-out/anulează)
 * se iau pe ecranul de detaliu, `bookings/[id].tsx` — o solicitare trece prin mai mulți
 * pași și nu toți încap lizibil într-un rând de listă. */
const TABS: { label: string; value: BookingStatus | undefined }[] = [
  { label: "Toate", value: undefined },
  { label: "În așteptare", value: "PendingApproval" },
  { label: "Aprobate", value: "Approved" },
  { label: "Active", value: "Active" },
  { label: "Încheiate", value: "Completed" },
];

export default function BookingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<BookingStatus | undefined>(undefined);
  const [bookings, setBookings] = useState<BookingDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: BookingStatus | undefined) => {
    try {
      setError(null);
      const query = status ? `?status=${status}` : "";
      setBookings(await api.get<BookingDto[]>(`/api/bookings${query}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca solicitările.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [load, tab]));

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Solicitări", animation: "fade" }} />

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

      {!bookings && (
        <View style={{ marginTop: spacing.md }}>
          <SkeletonList count={5} lines={3} />
        </View>
      )}

      {bookings && (
      <FlatList
        style={styles.list}
        data={bookings ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          bookings ? <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Nimic pe acest filtru.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/bookings/${item.id}`)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={[styles.name, { color: colors.ink }]}>{item.beneficiaryName}</Text>
                <BookingStatusPill status={item.status} />
              </View>
              {item.beneficiaryPhone && <PhoneActions phone={item.beneficiaryPhone} textStyle={styles.phone} />}
              <Text style={[styles.period, { color: colors.inkSoft }]}>
                {item.requestedCheckIn} → {item.requestedCheckOut}
              </Text>
              {item.unitName && (
                <Text style={[styles.location, { color: colors.accentInk }]}>
                  {item.unitName} · {item.propertyAddress}
                </Text>
              )}
              <Text style={[styles.meta, { color: colors.inkFaint }]}>
                cerută de {item.createdByName}
                {item.decidedByName ? ` · decisă de ${item.decidedByName}` : ""}
                {item.comments.length > 0 ? ` · ${item.comments.length} comentarii` : ""}
              </Text>
            </Card>
          </Pressable>
        )}
      />
      )}

      <Link href="/booking/new" asChild>
        <Pressable style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.accent, bottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + spacing.md }])}>
          <Text style={styles.fabLabel}>+ Solicitare nouă</Text>
        </Pressable>
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Un ScrollView orizontal NU își calculează fiabil înălțimea din conținut pe web —
  // nici cu flexGrow:0/flexShrink:0 (încercarea anterioară, insuficientă: pillurile
  // apăreau uneori zdrobite la câțiva pixeli, alteori întinse pe tot ecranul). Singura
  // reparație de-adevăratelea e o înălțime explicită, fixă, pe ScrollView însuși — vezi
  // nota din mobile/CLAUDE.md. `list` de mai jos, la fel — fără `flex:1`, FlatList-ul
  // nu avea o înălțime stabilă.
  tabsScroll: { flexGrow: 0, flexShrink: 0, height: 40 },
  tabsRow: { gap: spacing.sm, alignItems: "center" },
  list: { flex: 1 },
  tab: { borderWidth: 1, borderRadius: 999, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  name: { fontFamily: fonts.bodyBold, fontSize: 15.5 },
  phone: { fontSize: 12.5, marginTop: 2 },
  period: { fontFamily: fonts.mono, fontSize: 13, marginTop: spacing.xs },
  location: { fontFamily: fonts.bodyMedium, fontSize: 12.5, marginTop: spacing.xs },
  meta: { fontFamily: fonts.body, fontSize: 12.5, marginTop: spacing.xs },
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
