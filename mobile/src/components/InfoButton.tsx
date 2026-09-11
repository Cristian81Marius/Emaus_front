import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors, fonts, radius, spacing } from "../theme/tokens";

/** Buton mic „i" care ascunde/arată informații suplimentare, ne-esențiale la prima
 * privire (ex. situație materială, cine a raportat, cost estimat) — ca ecranele să
 * rămână ușor de citit dintr-o privire, fără să pierdem detaliile, doar le mutăm la
 * un tap distanță. Conținutul (`children`) e orice — de obicei un șir de `InfoLine`. */
export function InfoButton({ label = "Detalii", children }: { label?: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.trigger} hitSlop={8}>
        <View style={[styles.badge, { borderColor: colors.accent }]}>
          <Text style={[styles.badgeLabel, { color: colors.accentInk }]}>i</Text>
        </View>
        <Text style={[styles.triggerLabel, { color: colors.accentInk }]}>{open ? "Ascunde detaliile" : label}</Text>
      </Pressable>
      {open && <View style={[styles.panel, { borderColor: colors.line, backgroundColor: colors.surface2 }]}>{children}</View>}
    </View>
  );
}

/** O linie „etichetă: valoare" — stilul standard de conținut pentru interiorul unui InfoButton. */
export function InfoLine({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.inkFaint }}>{label}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft, marginTop: 1 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  badge: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.3, alignItems: "center", justifyContent: "center" },
  badgeLabel: { fontFamily: fonts.bodyBold, fontSize: 10 },
  triggerLabel: { fontFamily: fonts.bodyMedium, fontSize: 12.5 },
  panel: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm, gap: spacing.sm },
});
