import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onPushEvent, PushEvent } from "../api/mock/events";
import { EmausMark } from "./EmausMark";
import { useThemeColors, fonts, radius, spacing } from "../theme/tokens";

const AUTO_DISMISS_MS = 5000;

/** Nu avem push real (ar cere token-uri Expo, permisiuni, un server de push — cu mult
 * peste ce are sens acum, cât timp tot restul e mock). Asta e o PREVIZUALIZARE: de
 * fiecare dată când mock-ul creează o notificare (`notify*` din server.ts), un banner
 * apare aici, în sesiunea curentă, arătând exact ce ar vedea destinatarul (destinatarii)
 * — etichetat clar "Previzualizare", ca să nu se creadă că a fost trimis cuiva cu-adevărat.
 * Montat o singură dată, în app/_layout.tsx, deasupra întregii aplicații. */
export function PushNotificationOverlay() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [queue, setQueue] = useState<PushEvent[]>([]);
  const translateY = useRef(new Animated.Value(-160)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => onPushEvent((event) => setQueue((q) => [...q, event])), []);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    translateY.setValue(-160);
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }).start();
    dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  function dismiss() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.timing(translateY, { toValue: -160, duration: 200, useNativeDriver: true }).start(() => {
      setQueue((q) => q.slice(1));
    });
  }

  function openTarget() {
    if (!current) return;
    if (current.relatedEntityType === "Booking" && current.relatedEntityId) router.push(`/bookings/${current.relatedEntityId}`);
    else if (current.type === "UnitNeedsCleaning") router.push("/cleaning");
    else if (current.type === "NewMaintenanceTicket" || current.type === "MaintenanceTicketAssigned") router.push("/maintenance");
    else if (current.type === "NewOpportunityPublished") router.push("/opportunities");
    else if (current.type === "NewUserRequest") router.push("/users/pending");
    dismiss();
  }

  if (!current) return null;

  const recipientsLabel =
    current.recipientNames.length <= 3 ? current.recipientNames.join(", ") : `${current.recipientNames.length} persoane`;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.xs, transform: [{ translateY }] }]}>
      <Pressable
        onPress={openTarget}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.accentTint }]}>
          <EmausMark size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.appName, { color: colors.inkFaint }]}>EMAUS · acum</Text>
            <Pressable onPress={dismiss} hitSlop={8}>
              <Text style={{ color: colors.inkFaint, fontSize: 14 }}>✕</Text>
            </Pressable>
          </View>
          <Text style={[styles.message, { color: colors.ink }]} numberOfLines={2}>
            {current.message}
          </Text>
          <Text style={[styles.recipients, { color: colors.accentInk }]}>Previzualizare — către {recipientsLabel}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.md, right: spacing.md, zIndex: 999 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  appName: { fontFamily: fonts.bodyBold, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 },
  message: { fontFamily: fonts.bodyMedium, fontSize: 13.5, marginTop: 2 },
  recipients: { fontFamily: fonts.mono, fontSize: 10.5, marginTop: 4 },
});
