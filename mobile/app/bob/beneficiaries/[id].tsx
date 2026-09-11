import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "../../../src/components/ScreenContainer";
import { Card } from "../../../src/components/Card";
import { PhoneField } from "../../../src/components/PhoneActions";
import { api, ApiError } from "../../../src/api/client";
import { BobBeneficiaryDto } from "../../../src/api/bobTypes";
import { useThemeColors, fonts, spacing } from "../../../src/theme/tokens";
import { openInMaps } from "../../../src/utils/linking";

const STATUS_LABEL: Record<BobBeneficiaryDto["status"], string> = { Active: "Activ", Former: "Fost beneficiar", Possible: "Posibil beneficiar" };

/** Fișa unui beneficiar BOB — contact (telefon apăsabil + hartă), responsabil, și
 * cele două bife din evidența cu cutiile ("Am vorbit"/"Livrat"), editabile direct
 * de-aici (nu doar din formularul de editare) — sunt starea care se schimbă cel mai
 * des, o dată pe lună, nu merită un ecran separat pentru atât. */
export default function BobBeneficiaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();

  const [beneficiary, setBeneficiary] = useState<BobBeneficiaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setBeneficiary(await api.get<BobBeneficiaryDto>(`/api/bob/beneficiaries/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca beneficiarul.");
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (field: "contacted" | "delivered", value: boolean) => {
    if (!beneficiary) return;
    setBusy(true);
    try {
      const updated = await api.patch<BobBeneficiaryDto>(`/api/bob/beneficiaries/${id}`, { [field]: value });
      setBeneficiary(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut salva.");
    } finally {
      setBusy(false);
    }
  };

  if (!beneficiary) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: true, title: "Beneficiar" }} />
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: beneficiary.fullName }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink }}>{beneficiary.fullName}</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.inkFaint }}>{STATUS_LABEL[beneficiary.status]}</Text>
          </View>
          <Pressable onPress={() => router.push(`/bob/beneficiaries/${beneficiary.id}/edit`)} style={{ marginTop: spacing.xs }}>
            <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Editează datele</Text>
          </Pressable>

          {beneficiary.phone ? (
            <View style={{ marginTop: spacing.sm }}>
              <PhoneField label="Telefon" phone={beneficiary.phone} />
            </View>
          ) : (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginTop: spacing.sm }}>Fără telefon</Text>
          )}

          {beneficiary.address && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>Adresă</Text>
              <Pressable onPress={() => openInMaps(beneficiary.address!)} style={{ marginTop: 2 }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.accentInk }}>📍 {beneficiary.address}</Text>
              </Pressable>
            </View>
          )}

          {beneficiary.mobility && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>Statut</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: 2 }}>{beneficiary.mobility}</Text>
            </View>
          )}

          {beneficiary.assignedVolunteerName && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>Responsabil</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: 2 }}>{beneficiary.assignedVolunteerName}</Text>
            </View>
          )}

          {beneficiary.notes && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>Observații</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: 2 }}>{beneficiary.notes}</Text>
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink, marginBottom: spacing.sm }}>
            Runda curentă de livrare
          </Text>
          <ToggleRow label="Am vorbit cu beneficiarul" value={beneficiary.contacted} disabled={busy} onChange={(v) => toggle("contacted", v)} colors={colors} />
          <ToggleRow label="Cutie livrată" value={beneficiary.delivered} disabled={busy} onChange={(v) => toggle("delivered", v)} colors={colors} />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

function ToggleRow({
  label,
  value,
  disabled,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xs }}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink }}>{label}</Text>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.accentTint }}
        thumbColor={value ? colors.accent : colors.surface2}
      />
    </View>
  );
}
