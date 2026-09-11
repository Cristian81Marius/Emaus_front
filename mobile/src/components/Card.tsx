import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { useThemeColors, radius, spacing } from "../theme/tokens";

export function Card({ style, ...props }: ViewProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
