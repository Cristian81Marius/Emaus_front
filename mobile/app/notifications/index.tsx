import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { api, ApiError } from "../../src/api/client";
import { NotificationDto, NotificationType } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";
import { SkeletonList } from "../../src/components/Skeleton";

const MESSAGE_ICON: Record<NotificationType, string> = {
  NewBookingRequest: "📋",
  BookingDecided: "✅",
  NewCommentOnBooking: "💬",
  UnitNeedsCleaning: "🧹",
  NewMaintenanceTicket: "🔧",
  MaintenanceTicketAssigned: "🔧",
  NewOpportunityPublished: "🤝",
  NewUserRequest: "🆕",
};

/** Notificările proprii — polling simplu (vezi NotificationService pe backend, care
 * spune explicit că push-ul real e un pas ulterior). Tap pe o notificare legată de o
 * solicitare o marchează citită și te duce direct la ea. */
export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [onlyUnread, setOnlyUnread] = useState(false);
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (unread: boolean) => {
    try {
      setError(null);
      setItems(await api.get<NotificationDto[]>(`/api/notifications/mine?onlyUnread=${unread}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca notificările.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(onlyUnread); }, [load, onlyUnread]));

  const open = async (n: NotificationDto) => {
    if (!n.isRead) {
      try { await api.post(`/api/notifications/${n.id}/read`); } catch { /* ignorăm — nu blocăm navigarea */ }
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) ?? prev);
    }
    if (n.relatedEntityType === "Booking" && n.relatedEntityId) {
      router.push(`/bookings/${n.relatedEntityId}`);
    } else if (n.type === "UnitNeedsCleaning") {
      router.push("/cleaning");
    } else if (n.type === "NewMaintenanceTicket" || n.type === "MaintenanceTicketAssigned") {
      router.push("/maintenance");
    } else if (n.type === "NewOpportunityPublished") {
      router.push("/opportunities");
    } else if (n.type === "NewUserRequest") {
      router.push("/users/pending");
    }
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Notificări" }} />

      <Pressable onPress={() => setOnlyUnread((v) => !v)}>
        <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 13 }}>
          {onlyUnread ? "Arată toate" : "Arată doar necitite"}
        </Text>
      </Pressable>

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {!items && (
        <View style={{ marginTop: spacing.sm }}>
          <SkeletonList count={6} lines={1} withPill={false} />
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}>
        {items?.length === 0 && (
          <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Nimic aici, deocamdată.</Text>
        )}
        {items?.map((n) => (
          <Pressable key={n.id} onPress={() => open(n)}>
            <Card style={!n.isRead ? { borderColor: colors.accent } : undefined}>
              <View style={styles.row}>
                <Text style={{ fontSize: 18 }}>{MESSAGE_ICON[n.type] ?? "🔔"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: n.isRead ? fonts.body : fonts.bodyBold, fontSize: 14, color: colors.ink }}>
                    {n.message}
                  </Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.inkFaint, marginTop: 2 }}>
                    {formatDateTime(n.createdAt)}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  // Vezi comentariul din app/bookings/index.tsx — fără `flex:1`, înălțimea listei era ambiguă.
  list: { flex: 1 },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
});
