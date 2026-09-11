import React from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { useThemeColors, fonts, spacing, radius } from "../theme/tokens";

/** Un TextInput cu etichetă deasupra — folosit pe toate formularele scurte ale
 * aplicației (beneficiar nou, solicitare nouă, sesizare mentenanță, oportunitate nouă),
 * ca stilul câmpurilor de introducere să fie identic peste tot, nu reinventat pe ecran. */
export function Field({
  label,
  ...inputProps
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  const colors = useThemeColors();
  return (
    <>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkFaint}
        style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.surface }]}
        {...inputProps}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
