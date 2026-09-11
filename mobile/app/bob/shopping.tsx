import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { Field } from "../../src/components/Field";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { api, ApiError } from "../../src/api/client";
import { BoxCategoryDto, BoxItemDto } from "../../src/api/bobTypes";
import { useThemeColors, fonts, spacing, radius } from "../../src/theme/tokens";
import { parseDecimal } from "../../src/utils/number";

/** Lista de cumpărături pentru cutie — categorii colapsabile (ca să nu fie un perete
 * de ~80 de rânduri deodată), bifa "checked" = face parte din cutia curentă (runda în
 * lucru). "Cumpărături efectuate" salvează un instantaneu al bifelor curente în
 * istoric (persistat — vezi bobHistoryStore.ts), fără să le golească — luna viitoare
 * pornești de la aceleași bife. */
export default function BobShoppingScreen() {
  const colors = useThemeColors();

  const [categories, setCategories] = useState<BoxCategoryDto[] | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [onlyChecked, setOnlyChecked] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setCategories(await api.get<BoxCategoryDto[]>("/api/bob/box"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca lista.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = useMemo(
    () => Math.round((categories ?? []).flatMap((c) => c.items).filter((i) => i.checked).reduce((sum, i) => sum + i.price, 0) * 100) / 100,
    [categories]
  );
  const checkedCount = (categories ?? []).flatMap((c) => c.items).filter((i) => i.checked).length;

  const isFiltering = !!search.trim() || onlyChecked;
  const term = search.trim().toLowerCase();
  const visibleCategories = (categories ?? [])
    .map((cat) => ({ ...cat, items: cat.items.filter((i) => (!term || i.name.toLowerCase().includes(term)) && (!onlyChecked || i.checked)) }))
    .filter((cat) => cat.items.length > 0 || !isFiltering);

  const toggleCategory = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleItem = (categoryKey: string, item: BoxItemDto) => {
    setCategories((prev) =>
      (prev ?? []).map((c) => (c.key !== categoryKey ? c : { ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)) }))
    );
    void api.patch(`/api/bob/box/items/${item.id}`, { checked: !item.checked }).catch(() => load());
  };

  // Prețurile se schimbă de la o lună la alta (aceeași făină, alt preț la raft) — de-aia
  // editabile direct din listă, nu doar la crearea articolului. Draft separat de
  // `categories`, ca utilizatorul să poată tasta liber ("2," la mijlocul tastării unui
  // "2,78") fără să fie "corectat" la fiecare literă; se aplică abia la ieșirea din câmp.
  const commitPrice = (categoryKey: string, item: BoxItemDto) => {
    const draft = priceDrafts[item.id];
    if (draft === undefined) return;
    const price = parseDecimal(draft);
    setCategories((prev) => (prev ?? []).map((c) => (c.key !== categoryKey ? c : { ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, price } : i)) })));
    void api.patch(`/api/bob/box/items/${item.id}`, { price }).catch(() => load());
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  const addItem = async (categoryKey: string) => {
    if (!newName.trim()) return;
    try {
      const item = await api.post<BoxItemDto>("/api/bob/box/items", { categoryKey, name: newName.trim(), price: parseDecimal(newPrice) });
      setCategories((prev) => (prev ?? []).map((c) => (c.key !== categoryKey ? c : { ...c, items: [...c.items, item] })));
      setNewName("");
      setNewPrice("");
      setAddingTo(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Articolul nu a putut fi adăugat.");
    }
  };

  const confirmPurchase = async () => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      await api.post("/api/bob/purchases", { note: note.trim() || null });
      setSavedMessage(`Salvat în istoric — ${total} lei, ${checkedCount} articole.`);
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut salva cumpărăturile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Cumpărături", animation: "fade" }} />

      <Field label="Caută articol" value={search} onChangeText={setSearch} placeholder="ex. ulei" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm }}>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.ink }}>Arată doar bifate</Text>
        <Switch
          value={onlyChecked}
          onValueChange={setOnlyChecked}
          trackColor={{ false: colors.line, true: colors.accentTint }}
          thumbColor={onlyChecked ? colors.accent : colors.surface2}
        />
      </View>

      {error && <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text>}

      <ScrollView style={{ flex: 1, marginTop: spacing.sm }} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}>
        {visibleCategories.map((cat) => {
          const expanded = isFiltering || !collapsed.has(cat.key);
          const subtotal = Math.round(cat.items.filter((i) => i.checked).reduce((s, i) => s + i.price, 0) * 100) / 100;
          return (
            <Card key={cat.key} style={{ padding: 0, overflow: "hidden" }}>
              <Pressable onPress={() => toggleCategory(cat.key)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink }}>
                  {expanded ? "▾" : "▸"} {cat.title}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.inkFaint }}>
                  {cat.items.filter((i) => i.checked).length}/{cat.items.length} · {subtotal} lei
                </Text>
              </Pressable>

              {expanded &&
                cat.items.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.line,
                      backgroundColor: item.checked ? colors.accentTint : "transparent",
                    }}
                  >
                    <Pressable onPress={() => toggleItem(cat.key, item)} style={{ flex: 1, paddingVertical: spacing.xs }}>
                      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink }}>
                        {item.checked ? "☑" : "☐"} {item.name}
                      </Text>
                    </Pressable>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <TextInput
                        value={priceDrafts[item.id] ?? String(item.price)}
                        onChangeText={(t) => setPriceDrafts((prev) => ({ ...prev, [item.id]: t }))}
                        onBlur={() => commitPrice(cat.key, item)}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        style={{
                          width: 52,
                          textAlign: "right",
                          fontFamily: fonts.mono,
                          fontSize: 13,
                          color: colors.inkSoft,
                          borderWidth: 1,
                          borderColor: colors.line,
                          borderRadius: radius.sm,
                          paddingVertical: 2,
                          paddingHorizontal: 4,
                        }}
                      />
                      <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.inkFaint }}>lei</Text>
                    </View>
                  </View>
                ))}

              {expanded && addingTo === cat.key && (
                <View style={{ flexDirection: "row", gap: spacing.xs, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.line }}>
                  <TextInput
                    placeholder="Articol nou"
                    placeholderTextColor={colors.inkFaint}
                    value={newName}
                    onChangeText={setNewName}
                    style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.sm }}
                  />
                  <TextInput
                    placeholder="lei"
                    placeholderTextColor={colors.inkFaint}
                    value={newPrice}
                    onChangeText={setNewPrice}
                    keyboardType="decimal-pad"
                    style={{ width: 64, fontFamily: fonts.body, fontSize: 13, color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.sm }}
                  />
                  <Pressable onPress={() => addItem(cat.key)}>
                    <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyBold, fontSize: 20, paddingHorizontal: spacing.xs }}>✓</Text>
                  </Pressable>
                </View>
              )}
              {expanded && addingTo !== cat.key && (
                <Pressable onPress={() => { setAddingTo(cat.key); setNewName(""); setNewPrice(""); }} style={{ padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.line }}>
                  <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>+ Adaugă articol</Text>
                </Pressable>
              )}
            </Card>
          );
        })}
      </ScrollView>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink }}>Total ({checkedCount} articole)</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.accentInk }}>{total} lei</Text>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <Field label="Notă (opțional)" value={note} onChangeText={setNote} placeholder="ex. cumpărat de la Kaufland" />
        </View>
        {savedMessage && <Text style={{ color: colors.ok, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: spacing.sm }}>{savedMessage}</Text>}
        <View style={{ marginTop: spacing.sm }}>
          <PrimaryButton label="Cumpărături efectuate" onPress={confirmPurchase} loading={saving} disabled={checkedCount === 0} />
        </View>
      </Card>
    </ScreenContainer>
  );
}
