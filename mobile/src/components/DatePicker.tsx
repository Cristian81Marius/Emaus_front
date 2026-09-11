import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors, fonts, radius, spacing } from "../theme/tokens";

const WEEKDAYS = ["L", "Ma", "Mi", "J", "V", "S", "D"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseIso(value: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

function formatHuman(value: string): string {
  const parsed = parseIso(value);
  if (!parsed) return value;
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
}

function todayParts() {
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
}

/** Selector de dată sub formă de calendar — înlocuiește un TextInput unde utilizatorul
 * ar fi trebuit să tasteze "AAAA-LL-ZZ" corect de mână. Formatul se generează singur;
 * `value`/`onChange` rămân stringuri "AAAA-LL-ZZ" (sau "" pentru necompletat), ca restul
 * codului — payload-urile trimise la API nu se schimbă deloc. */
export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Alege o dată",
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseIso(value)?.year ?? todayParts().year);
  const [viewMonth, setViewMonth] = useState(() => parseIso(value)?.month ?? todayParts().month);

  const openPicker = () => {
    const parsed = parseIso(value);
    const today = todayParts();
    setViewYear(parsed?.year ?? today.year);
    setViewMonth(parsed?.month ?? today.month);
    setOpen(true);
  };

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // 0 = Luni
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysCount }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selected = parseIso(value);
  const today = todayParts();

  const pick = (day: number) => {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  };

  return (
    <View>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft }}>
        {label}
        {optional ? " (opțional)" : ""}
      </Text>
      <Pressable onPress={openPicker} style={[styles.field, { borderColor: colors.line, backgroundColor: colors.surface }]}>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: value ? colors.ink : colors.inkFaint }}>
          {value ? formatHuman(value) : placeholder}
        </Text>
        <Text style={{ fontSize: 16 }}>📅</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Pressable onPress={() => goMonth(-1)} hitSlop={10} style={styles.navBtn}>
                <Text style={{ color: colors.accentInk, fontSize: 18, fontFamily: fonts.bodyBold }}>‹</Text>
              </Pressable>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textTransform: "capitalize" }}>
                {monthLabel(viewYear, viewMonth)}
              </Text>
              <Pressable onPress={() => goMonth(1)} hitSlop={10} style={styles.navBtn}>
                <Text style={{ color: colors.accentInk, fontSize: 18, fontFamily: fonts.bodyBold }}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={[styles.weekday, { color: colors.inkFaint }]}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day === null) return <View key={i} style={styles.cell} />;
                const isSelected = !!selected && selected.year === viewYear && selected.month === viewMonth && selected.day === day;
                const isToday = today.year === viewYear && today.month === viewMonth && today.day === day;
                return (
                  <View key={i} style={styles.cell}>
                    <Pressable
                      onPress={() => pick(day)}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: colors.accent },
                        !isSelected && isToday && { borderWidth: 1, borderColor: colors.accent },
                      ]}
                    >
                      <Text style={{ color: isSelected ? "#FFFFFF" : colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>{day}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={[styles.footer, { borderTopColor: colors.line }]}>
              {optional && value !== "" && (
                <Pressable
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={styles.footerBtn}
                >
                  <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>Șterge data</Text>
                </Pressable>
              )}
              <Pressable onPress={() => pick(today.day)} style={styles.footerBtn}>
                <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>Azi</Text>
              </Pressable>
              <Pressable onPress={() => setOpen(false)} style={styles.footerBtn}>
                <Text style={{ color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>Renunță</Text>
              </Pressable>
            </View>
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
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: 4,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  sheet: { width: "100%", maxWidth: 360, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  navBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  weekRow: { flexDirection: "row" },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontFamily: fonts.bodyMedium, fontSize: 11.5, marginBottom: spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayCell: { width: "78%", aspectRatio: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  footerBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
});
