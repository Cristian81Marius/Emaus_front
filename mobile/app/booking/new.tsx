import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Field } from "../../src/components/Field";
import { DatePicker } from "../../src/components/DatePicker";
import { PhoneActions } from "../../src/components/PhoneActions";
import { api, ApiError } from "../../src/api/client";
import { BeneficiaryDto, PagedResult } from "../../src/api/types";
import { useThemeColors, fonts, spacing, radius, ThemeColors } from "../../src/theme/tokens";

/** Solicitare nouă — pasul 1 din fluxul descris în plan. Înainte, formularul crea mereu
 * un beneficiar nou, chiar dacă persoana mai stătuse la Emaus ("trebuie să-l adaug
 * manual din nou, nu prea îmi place"). Acum caută întâi printre beneficiarii existenți
 * (GET /api/beneficiaries?search=) și oferă "beneficiar nou" doar ca variantă secundară.
 * Poate fi deschis și direct cu un beneficiar deja ales (din fișa lui — vezi
 * beneficiaries/[id].tsx), prin ?beneficiaryId=&beneficiaryName=, sărind peste căutare. */
export default function NewBookingScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ beneficiaryId?: string; beneficiaryName?: string }>();

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    params.beneficiaryId ? { id: params.beneficiaryId, name: params.beneficiaryName ?? "Beneficiar" } : null
  );
  const [mode, setMode] = useState<"search" | "new">("search");

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BeneficiaryDto[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== "search" || selected) return;
    const handle = setTimeout(async () => {
      if (!search.trim()) { setResults(null); return; }
      setSearching(true);
      try {
        const page = await api.get<PagedResult<BeneficiaryDto>>(`/api/beneficiaries?search=${encodeURIComponent(search.trim())}`);
        setResults(page.items);
      } catch {
        setResults(null);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [search, mode, selected]);

  const canSubmit = !!checkIn && !!checkOut && (selected || fullName.trim().length > 1);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      let beneficiaryId = selected?.id;
      if (!beneficiaryId) {
        const beneficiary = await api.post<BeneficiaryDto>("/api/beneficiaries", {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
        });
        beneficiaryId = beneficiary.id;
      }
      await api.post("/api/bookings", { beneficiaryId, requestedCheckIn: checkIn, requestedCheckOut: checkOut });
      router.replace("/bookings");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Solicitarea nu a putut fi trimisă.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Solicitare nouă" }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        {selected ? (
          <Card>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>Beneficiar</Text>
            <View style={styles.rowBetween}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink }}>{selected.name}</Text>
              <Pressable onPress={() => setSelected(null)}>
                <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 13 }}>Schimbă</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <>
            <View style={styles.tabsRow}>
              <ModeTab label="Caută beneficiar" active={mode === "search"} onPress={() => setMode("search")} colors={colors} />
              <ModeTab label="Beneficiar nou" active={mode === "new"} onPress={() => setMode("new")} colors={colors} />
            </View>

            {mode === "search" ? (
              <View style={{ gap: spacing.sm }}>
                <Field
                  label="Nume sau telefon"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="ex. Popescu sau 0722…"
                />
                {searching && <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 }}>Caut…</Text>}
                {results?.length === 0 && (
                  <Text style={{ color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 }}>
                    Niciun rezultat — încearcă „Beneficiar nou" dacă chiar e prima lui vizită.
                  </Text>
                )}
                {results?.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => setSelected({ id: b.id, name: b.fullName })}
                    style={[styles.resultRow, { borderColor: colors.line, backgroundColor: colors.surface }]}
                  >
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.ink }}>{b.fullName}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {b.phone ? (
                        <PhoneActions phone={b.phone} textStyle={{ fontFamily: fonts.mono, fontSize: 12 }} />
                      ) : (
                        <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.inkFaint }}>fără telefon</Text>
                      )}
                      {b.status === "Blocked" && (
                        <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.danger }}> · BLOCAT</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <Field label="Nume și prenume" value={fullName} onChangeText={setFullName} />
                <Field label="Telefon (opțional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>
            )}
          </>
        )}

        <DatePicker label="Data sosirii" value={checkIn} onChange={setCheckIn} />
        <DatePicker label="Data plecării" value={checkOut} onChange={setCheckOut} />

        {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

        <PrimaryButton label="Trimite spre aprobare" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </ScreenContainer>
  );
}

function ModeTab({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: ThemeColors }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tab,
        { borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accentTint : "transparent" },
      ]}
    >
      <Text style={{ color: active ? colors.accentInk : colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  tabsRow: { flexDirection: "row", gap: spacing.sm },
  tab: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  resultRow: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
});
