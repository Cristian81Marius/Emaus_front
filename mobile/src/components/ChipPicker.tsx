import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors, fonts, radius, spacing } from "../theme/tokens";

/** Selector cu variante sub formă de „chip"-uri, cu o singură alegere posibilă —
 * folosit peste tot unde alegem o valoare dintr-un enum mic (tip sesizare, prioritate,
 * tip oportunitate) fără să tragem o bibliotecă de dropdown doar pentru atât. */
export function ChipPicker<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              {
                borderColor: active ? colors.accent : colors.line,
                backgroundColor: active ? colors.accentTint : "transparent",
              },
            ]}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: active ? colors.accentInk : colors.inkSoft }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: spacing.md },
});
