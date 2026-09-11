import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors, fonts, spacing } from "../theme/tokens";

export const PIN_LENGTH = 4;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

/** Tastatură numerică pentru cod PIN (4 cifre, fix) — puncte care se umplu pe măsură
 * ce tastezi, apel automat la `onComplete` când a patra cifră a fost introdusă (fără
 * un buton separat de "confirmă"). Folosit atât la ecranul de deblocare
 * (`app/unlock.tsx`), cât și la setarea/schimbarea codului din Meniu. */
export function PinPad({ value, onChange, onComplete }: { value: string; onChange: (value: string) => void; onComplete?: (pin: string) => void }) {
  const colors = useThemeColors();

  const press = (key: string) => {
    if (key === "") return;
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= PIN_LENGTH) return;
    const next = value + key;
    onChange(next);
    if (next.length === PIN_LENGTH) onComplete?.(next);
  };

  return (
    <View>
      <View style={styles.dotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, { borderColor: colors.accent, backgroundColor: i < value.length ? colors.accent : "transparent" }]} />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key, i) => (
          <Pressable key={i} disabled={key === ""} onPress={() => press(key)} style={styles.key}>
            {key !== "" && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink }}>{key}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: spacing.md, marginBottom: spacing.xl },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  key: { width: "33.33%", aspectRatio: 1.7, alignItems: "center", justifyContent: "center" },
});
