import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemeColors, fonts, radius, spacing } from "../theme/tokens";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/** Listă de-ales dintr-un sheet, nu un rând de chip-uri — pentru opțiuni multe și/sau
 * lungi (locații, voluntari), unde chip-urile se învălmășesc urât pe mai multe rânduri.
 * Pentru opțiuni puține și scurte (tip, prioritate, zi), `ChipPicker` rămâne alegerea
 * bună — nu-l înlocui degeaba. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Alege…",
  compact = false,
}: {
  label: string;
  value: T | "";
  options: SelectOption<T | "">[];
  onChange: (value: T | "") => void;
  placeholder?: string;
  /** Variantă chip — fără eticheta de deasupra, padding/font redus, ca să încapă pe
   * același rând cu alte controale mici (ex. lângă chip-uri de status într-un card de
   * listă). Sheet-ul de alegere rămâne identic, doar trigger-ul se schimbă. */
  compact?: boolean;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      {!compact && <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft }}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        style={[compact ? styles.fieldCompact : styles.field, { borderColor: colors.line, backgroundColor: colors.surface }]}
      >
        <Text
          style={{ fontFamily: fonts.bodyMedium, fontSize: compact ? 11 : 15, color: selected ? colors.ink : colors.inkFaint, flex: compact ? undefined : 1 }}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ fontSize: compact ? 10 : 14, color: colors.inkFaint }}>⌄</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, marginBottom: spacing.xs }}>{label}</Text>
            {/* Înălțime fixă, nu doar flex:1 — un ScrollView vertical într-un sheet cu
                maxHeight procentual e la fel de ambiguu pe web ca ScrollView-ul
                orizontal de la taburile de filtru (vezi mobile/CLAUDE.md). */}
            <ScrollView style={styles.list}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value || "__none__"}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={[styles.row, { borderTopColor: colors.line }, isSelected && { backgroundColor: colors.accentTint }]}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.accentInk : colors.ink,
                        fontFamily: isSelected ? fonts.bodyBold : fonts.body,
                        fontSize: 15,
                        flex: 1,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Text style={{ color: colors.accentInk, fontSize: 15 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={{ color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 14 }}>Renunță</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: 4,
  },
  // Cât un chip de status (StatusChip din bob/beneficiaries/index.tsx) — puțin mai
  // generos, ca zona de tap să rămână confortabilă pe telefon.
  fieldCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderBottomWidth: 0, padding: spacing.lg, paddingBottom: spacing.xl },
  list: { maxHeight: 320 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  cancel: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.xs },
});
