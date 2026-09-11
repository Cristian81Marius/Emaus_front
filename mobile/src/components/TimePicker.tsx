import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemeColors, fonts, radius, spacing, ThemeColors } from "../theme/tokens";

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/** Selector de oră cu două coloane care se derulează (oră/minut) — nu un rând de
 * chip-uri cu ore prestabilite. `value`/`onChange` rămân stringuri "HH:MM" (sau ""
 * pentru necompletat), la fel ca înainte. */
export function TimePicker({
  label,
  value,
  onChange,
  placeholder = "Fără oră stabilită",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(() => parseTime(value)?.hour ?? 10);
  const [minute, setMinute] = useState(() => parseTime(value)?.minute ?? 0);
  const hourScroll = useRef<ScrollView>(null);
  const minuteScroll = useRef<ScrollView>(null);

  const openPicker = () => {
    const parsed = parseTime(value);
    const h = parsed?.hour ?? 10;
    const m = parsed?.minute ?? 0;
    setHour(h);
    setMinute(m);
    setOpen(true);
    requestAnimationFrame(() => {
      hourScroll.current?.scrollTo({ y: h * ROW_HEIGHT, animated: false });
      minuteScroll.current?.scrollTo({ y: m * ROW_HEIGHT, animated: false });
    });
  };

  return (
    <View>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft }}>{label}</Text>
      <Pressable onPress={openPicker} style={[styles.field, { borderColor: colors.line, backgroundColor: colors.surface }]}>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: value ? colors.ink : colors.inkFaint }}>{value || placeholder}</Text>
        <Text style={{ fontSize: 16 }}>🕐</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: "center", marginBottom: spacing.sm }}>
              Alege ora
            </Text>

            <View style={styles.columns}>
              <Column items={HOURS} selected={hour} onSelect={setHour} scrollRef={hourScroll} colors={colors} />
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink, marginHorizontal: spacing.sm }}>:</Text>
              <Column items={MINUTES} selected={minute} onSelect={setMinute} scrollRef={minuteScroll} colors={colors} />
            </View>

            <View style={[styles.footer, { borderTopColor: colors.line }]}>
              <Pressable
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={styles.footerBtn}
              >
                <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>Fără oră</Text>
              </Pressable>
              <Pressable onPress={() => setOpen(false)} style={styles.footerBtn}>
                <Text style={{ color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>Renunță</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChange(`${pad(hour)}:${pad(minute)}`);
                  setOpen(false);
                }}
                style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodyBold, fontSize: 13.5 }}>Confirmă</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Column({
  items,
  selected,
  onSelect,
  scrollRef,
  colors,
}: {
  items: number[];
  selected: number;
  onSelect: (n: number) => void;
  scrollRef: React.RefObject<ScrollView | null>;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.columnWrap, { borderColor: colors.line }]}>
      <ScrollView ref={scrollRef} style={{ height: ROW_HEIGHT * VISIBLE_ROWS }} showsVerticalScrollIndicator={false}>
        {items.map((n) => {
          const isSelected = n === selected;
          return (
            <Pressable key={n} onPress={() => onSelect(n)} style={[styles.row, isSelected && { backgroundColor: colors.accentTint }]}>
              <Text
                style={{
                  color: isSelected ? colors.accentInk : colors.ink,
                  fontFamily: isSelected ? fonts.bodyBold : fonts.body,
                  fontSize: 16,
                }}
              >
                {pad(n)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: 4,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  sheet: { width: "100%", maxWidth: 320, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  columns: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  columnWrap: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden", width: 72 },
  row: { height: ROW_HEIGHT, alignItems: "center", justifyContent: "center" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  confirmBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md },
});
