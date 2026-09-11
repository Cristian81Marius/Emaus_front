import React, { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { api, ApiError } from "../../src/api/client";
import { BobDeliveryRecordDto } from "../../src/api/bobTypes";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

/** Istoricul cumpărăturilor pentru cutii — instantaneele salvate din `/bob/shopping`
 * ("Cumpărături efectuate"), persistate cu AsyncStorage (vezi bobHistoryStore.ts),
 * nu doar în memorie ca restul mock-ului — supraviețuiesc unui restart al aplicației. */
export default function BobHistoryScreen() {
  const colors = useThemeColors();
  const [history, setHistory] = useState<BobDeliveryRecordDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setHistory(await api.get<BobDeliveryRecordDto[]>("/api/bob/purchases"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca istoricul.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Istoric cumpărături" }} />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      <FlatList
        style={{ flex: 1 }}
        data={history ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          history ? <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Nicio cumpărătură salvată încă.</Text> : null
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink }}>{formatDate(item.date)}</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.accentInk }}>{item.total} lei</Text>
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 }}>{item.items.length} articole</Text>
            {item.note && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: spacing.xs }}>{item.note}</Text>}
            <Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.inkFaint, marginTop: spacing.sm }} numberOfLines={3}>
              {item.items.map((i) => i.name).join(", ")}
            </Text>
          </Card>
        )}
      />
    </ScreenContainer>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
}
