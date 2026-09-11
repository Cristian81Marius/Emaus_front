import React, { useState } from "react";
import { Linking, Modal, Pressable, StyleProp, StyleSheet, Text, TextStyle, View } from "react-native";
import { useThemeColors, fonts, radius, spacing } from "../theme/tokens";

/** Normalizează un număr de telefon la formatul internațional (E.164), presupunând
 * România (+40) dacă numărul e scris local (începe cu "0") — toate numerele din
 * evidența Emaus sunt din România. Dacă apar vreodată beneficiari cu numere străine
 * scrise cu indicativ (`+380...` etc.), funcția le lasă neschimbate (`+` deja pus). */
function toE164(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (phone.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("40")) return `+${digits}`;
  if (digits.startsWith("0")) return `+4${digits}`;
  return `+${digits}`;
}

function openSafely(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** Textul unui număr de telefon, apăsabil — deschide o listă mică de acțiuni (Sună /
 * WhatsApp / SMS) în loc să pornească direct un apel, pentru că utilizatorul vrea de
 * fapt să aleagă. Oprește propagarea tap-ului (`stopPropagation`) — pe web,
 * Pressable-urile imbricate altfel declanșează și `onPress`-ul rândului-părinte (ex.
 * un card de listă apăsabil care te duce la fișa beneficiarului/solicitării). */
export function PhoneActions({ phone, textStyle }: { phone: string; textStyle?: StyleProp<TextStyle> }) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const dial = toE164(phone);

  const actions = [
    { key: "call", icon: "📞", label: "Sună", onPress: () => openSafely(`tel:${dial}`) },
    { key: "whatsapp", icon: "💬", label: "WhatsApp", onPress: () => openSafely(`https://wa.me/${dial.replace("+", "")}`) },
    { key: "sms", icon: "✉️", label: "SMS", onPress: () => openSafely(`sms:${dial}`) },
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
        <Text style={[{ color: colors.accentInk, fontFamily: fonts.bodyMedium }, textStyle]}>📞 {phone}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.title, { color: colors.inkFaint }]}>{phone}</Text>
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

/** Rând compact "etichetă + telefon apăsabil" — pentru fișe (beneficiar, solicitare,
 * locație) unde telefonul apare ca un câmp cu etichetă, nu doar ca text simplu. */
export function PhoneField({ label, phone }: { label: string; phone: string }) {
  const colors = useThemeColors();
  return (
    <View>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>{label}</Text>
      <View style={{ marginTop: 2 }}>
        <PhoneActions phone={phone} textStyle={{ fontFamily: fonts.mono, fontSize: 14 }} />
      </View>
    </View>
  );
}
