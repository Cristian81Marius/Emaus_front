import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { BOTTOM_TAB_BAR_HEIGHT } from "../../src/components/BottomTabBar";
import { Field } from "../../src/components/Field";
import { PhoneActions } from "../../src/components/PhoneActions";
import { BeneficiaryStatusPill } from "../../src/components/StatusPill";
import { SkeletonList } from "../../src/components/Skeleton";
import { api, ApiError } from "../../src/api/client";
import { BeneficiaryDto, PagedResult } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

const PAGE_SIZE = 30;

/** Căutare/listă beneficiari — răspunde direct la "trebuie să-l adaug manual din nou":
 * acum un beneficiar care mai revine se caută aici după nume/telefon în loc să fie
 * re-introdus de la zero; fișa lui (beneficiaries/[id].tsx) are un buton direct de
 * "Solicitare nouă" care sare peste formularul de creare. */
export default function BeneficiariesScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Deschis din property/[id].tsx ("Istoric beneficiari") → doar beneficiarii cazați
  // vreodată la ACEA locație, nu lista globală (vezi comentariul de pe
  // BeneficiaryService.GetAllAsync din backend). Fără parametri, ecranul se comportă
  // exact ca înainte — lista completă, ca shortcut spre tab.
  const { propertyId, propertyLabel } = useLocalSearchParams<{ propertyId?: string; propertyLabel?: string }>();

  const [search, setSearch] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryDto[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reîncărcarea (căutare nouă sau revenire pe ecran) repornește mereu de la pagina 1
  // și înlocuiește lista; "mai jos" din listă (`loadMore`) o extinde cu pagina următoare.
  const load = useCallback(async (query: string, pageToLoad: number) => {
    try {
      setError(null);
      const qs = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : "";
      const propertyQs = propertyId ? `&propertyId=${propertyId}` : "";
      const result = await api.get<PagedResult<BeneficiaryDto>>(`/api/beneficiaries?page=${pageToLoad}&pageSize=${PAGE_SIZE}${qs}${propertyQs}`);
      setBeneficiaries((prev) => (pageToLoad === 1 ? result.items : [...(prev ?? []), ...result.items]));
      setPage(pageToLoad);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca beneficiarii.");
    }
  }, [propertyId]);

  useFocusEffect(useCallback(() => { load(search, 1); }, [load]));

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(search, page + 1);
    setLoadingMore(false);
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: propertyId ? `Beneficiari — ${propertyLabel ?? "locație"}` : "Beneficiari" }} />

      {propertyId && (
        <View style={styles.scopeBanner}>
          <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12.5, flex: 1 }}>
            Doar beneficiarii cazați la {propertyLabel ?? "această locație"}
          </Text>
          <Pressable onPress={() => router.replace("/beneficiaries")}>
            <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyBold, fontSize: 12.5 }}>Vezi toți ›</Text>
          </Pressable>
        </View>
      )}

      <Field
        label="Caută după nume sau telefon"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => load(search, 1)}
        returnKeyType="search"
        placeholder="ex. Popescu sau 0722…"
      />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {!beneficiaries && (
        <View style={{ marginTop: spacing.md }}>
          <SkeletonList count={6} lines={1} />
        </View>
      )}

      {beneficiaries && (
      <FlatList
        style={styles.list}
        data={beneficiaries ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          beneficiaries ? <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Niciun beneficiar găsit.</Text> : null
        }
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} /> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/beneficiaries/${item.id}`)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={[styles.name, { color: colors.ink }]}>{item.fullName}</Text>
                <BeneficiaryStatusPill status={item.status} />
              </View>
              <View style={styles.metaRow}>
                {item.phone ? (
                  <PhoneActions phone={item.phone} textStyle={styles.meta} />
                ) : (
                  <Text style={[styles.meta, { color: colors.inkSoft }]}>fără telefon</Text>
                )}
                {(item.localityName || item.localityFreeText) && (
                  <Text style={[styles.meta, { color: colors.inkSoft }]}> · {item.localityName ?? item.localityFreeText}</Text>
                )}
              </View>
              {item.status === "Blocked" && item.blockedReason && (
                <Text style={[styles.meta, { color: colors.danger }]}>Motiv: {item.blockedReason}</Text>
              )}
            </Card>
          </Pressable>
        )}
      />
      )}

      <Link href="/beneficiaries/new" asChild>
        <Pressable style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.accent, bottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + spacing.md }])}>
          <Text style={styles.fabLabel}>+ Beneficiar nou</Text>
        </Pressable>
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Vezi comentariul din app/bookings/index.tsx — fără `flex:1`, înălțimea listei era ambiguă.
  list: { flex: 1 },
  scopeBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  name: { fontFamily: fonts.bodyBold, fontSize: 15.5 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  meta: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
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
