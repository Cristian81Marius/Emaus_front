import React, { useState } from "react";
import { Linking, Modal, Pressable, StyleProp, StyleSheet, Text, TextStyle } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useThemeColors, fonts, radius, spacing } from "../theme/tokens";

function openSafely(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** Trigger apăsabil (ex. "📤 Trimite adresa") care deschide o listă mică de acțiuni
 * pentru un text oarecare — WhatsApp (fără un număr anume: `wa.me/?text=` deschide
 * WhatsApp cu mesajul precompletat, utilizatorul alege singur conversația, util când
 * vorbești cu un beneficiar și nu introduci numărul lui în aplicație) sau copiere în
 * clipboard. Aceeași formă de sheet ca `PhoneActions`, pentru consecvență vizuală. */
export function ShareActions({ text, label = "Trimite", textStyle }: { text: string; label?: string; textStyle?: StyleProp<TextStyle> }) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  const actions = [
    { key: "whatsapp", icon: "💬", label: "WhatsApp", onPress: () => openSafely(`https://wa.me/?text=${encodeURIComponent(text)}`) },
    { key: "copy", icon: "📋", label: "Copiază", onPress: () => { void Clipboard.setStringAsync(text); } },
  ];

  return (
    <>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          setOpen(true);
        }}
        hitSlop={6}
      >
        <Text style={[{ color: colors.accentInk, fontFamily: fonts.bodyMedium }, textStyle]}>📤 {label}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.title, { color: colors.inkFaint }]} numberOfLines={2}>
              {text}
            </Text>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
                style={[styles.row, { borderTopColor: colors.line }]}
              >
                <Text style={styles.rowIcon}>{action.icon}</Text>
                <Text style={{ color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 15.5 }}>{action.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={{ color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 14.5 }}>Renunță</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: { fontFamily: fonts.mono, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  rowIcon: { fontSize: 18, width: 24, textAlign: "center" },
  cancel: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.xs },
});
