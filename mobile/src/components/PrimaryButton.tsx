import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useThemeColors, fonts, radius, spacing } from "../theme/tokens";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, variant = "primary", loading, disabled }: Props) {
  const colors = useThemeColors();

  const palette = {
    primary: { bg: colors.accent, fg: "#FFFFFF" },
    secondary: { bg: colors.surface2, fg: colors.ink },
    danger: { bg: colors.dangerTint, fg: colors.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // textAlign: "center" — fără el, o etichetă lungă care se înfășoară pe două rânduri
  // (ex. "Generează contractul semnat" într-un buton la jumătate de ecran) arăta
  // strâmb: rândurile sunt centrate ca bloc de alignItems, dar fiecare rând în parte
  // rămânea aliniat la stânga în lipsa lui textAlign, deci păreau lipite de margine.
  label: { fontFamily: fonts.bodyBold, fontSize: 15.5, textAlign: "center" },
});
