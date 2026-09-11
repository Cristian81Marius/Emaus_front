import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { Field } from "../../src/components/Field";
import { InfoButton, InfoLine } from "../../src/components/InfoButton";
import { PhoneField } from "../../src/components/PhoneActions";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { BeneficiaryStatusPill, BookingStatusPill } from "../../src/components/StatusPill";
import { useAuth } from "../../src/state/AuthContext";
import { api, ApiError } from "../../src/api/client";
import { BeneficiaryDto, BookingDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

/** Fișa unui beneficiar — exact ce lipsea complet: contact + situație pe o parte,
 * istoricul complet de cazări pe alta (indiferent de locație — vezi `beneficiaryId`
 * pe BookingService.GetAllAsync), plus un buton direct de "Solicitare nouă" care
 * duce la booking/new.tsx cu beneficiarul deja ales, fără să mai fie re-introdus. */
export default function BeneficiaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const isNucleus = user?.role === "Nucleus";

  const [beneficiary, setBeneficiary] = useState<BeneficiaryDto | null>(null);
  const [bookings, setBookings] = useState<BookingDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const [b, history] = await Promise.all([
        api.get<BeneficiaryDto>(`/api/beneficiaries/${id}`),
        api.get<BookingDto[]>(`/api/bookings?beneficiaryId=${id}`),
      ]);
      setBeneficiary(b);
      setBookings(history);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca beneficiarul.");
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const block = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/beneficiaries/${id}/block`, { reason: blockReason.trim() || "Nespecificat" });
      setShowBlock(false);
      setBlockReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut bloca beneficiarul.");
    } finally {
      setBusy(false);
    }
  };

  const unblock = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/beneficiaries/${id}/unblock`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut debloca beneficiarul.");
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

  const current = bookings?.find((b) => b.status === "Active");
  const history = (bookings ?? []).filter((b) => b.id !== current?.id);

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: beneficiary.fullName }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <Card>
          <View style={styles.rowBetween}>
            <Text style={[styles.name, { color: colors.ink }]}>{beneficiary.fullName}</Text>
            <BeneficiaryStatusPill status={beneficiary.status} />
          </View>
          <Pressable onPress={() => router.push(`/beneficiaries/${beneficiary.id}/edit`)} style={{ marginTop: spacing.xs }}>
            <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Editează datele</Text>
          </Pressable>
          {beneficiary.status === "Blocked" && beneficiary.blockedReason && (
            <Text style={{ color: colors.danger, fontFamily: fonts.body, fontSize: 13, marginTop: spacing.xs }}>
              Motiv blocare: {beneficiary.blockedReason}
            </Text>
          )}
          {beneficiary.phone ? (
            <View style={{ marginTop: spacing.sm }}>
              <PhoneField label="Telefon" phone={beneficiary.phone} />
            </View>
          ) : (
            <InfoRow label="Telefon" value="—" colors={colors} />
          )}

          <View style={{ marginTop: spacing.sm }}>
            <InfoButton label="Detalii suplimentare">
              <InfoLine label="Localitate" value={beneficiary.localityName ?? beneficiary.localityFreeText ?? "—"} />
              {beneficiary.age !== null && <InfoLine label="Vârstă" value={String(beneficiary.age)} />}
              {beneficiary.materialSituation && <InfoLine label="Situație materială" value={beneficiary.materialSituation} />}
              {beneficiary.referralSource && <InfoLine label="Provenit din" value={beneficiary.referralSource} />}
              {beneficiary.notes && <InfoLine label="Observații" value={beneficiary.notes} />}
              <InfoLine label="Sold cont" value={`${beneficiary.accountBalance} lei`} />
            </InfoButton>
          </View>
        </Card>

        {beneficiary.status === "Active" && (
          <PrimaryButton
            label="+ Solicitare nouă pentru acest beneficiar"
            onPress={() => router.push(`/booking/new?beneficiaryId=${beneficiary.id}&beneficiaryName=${encodeURIComponent(beneficiary.fullName)}`)}
          />
        )}

        {isNucleus && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>Acțiuni</Text>
            {beneficiary.status === "Active" && !showBlock && (
              <PrimaryButton label="Blochează beneficiarul" variant="danger" onPress={() => setShowBlock(true)} />
            )}
            {beneficiary.status === "Active" && showBlock && (
              <View style={{ gap: spacing.sm }}>
                <Field label="Motiv" value={blockReason} onChangeText={setBlockReason} placeholder="ex. comportament neadecvat" />
                <View style={styles.actionsRow}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Confirmă blocarea" variant="danger" loading={busy} onPress={block} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Renunță" variant="secondary" onPress={() => setShowBlock(false)} />
                  </View>
                </View>
              </View>
            )}
            {beneficiary.status === "Blocked" && (
              <PrimaryButton label="Deblochează beneficiarul" loading={busy} onPress={unblock} />
            )}
          </Card>
        )}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Istoric cazări</Text>

          {current && (
            <Pressable onPress={() => router.push(`/bookings/${current.id}`)} style={[styles.currentBox, { borderColor: colors.accent, backgroundColor: colors.accentTint }]}>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyBold, fontSize: 13.5 }}>Cazat acum</Text>
                <BookingStatusPill status={current.status} />
              </View>
              <Text style={{ color: colors.ink, fontFamily: fonts.mono, fontSize: 12.5, marginTop: 2 }}>
                {current.unitName} · {current.propertyAddress} · din {current.actualCheckIn}
              </Text>
            </Pressable>
          )}

          {history.length === 0 && !current && (
            <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 }}>Niciodată cazat încă.</Text>
          )}

          {history.map((b) => (
            <Pressable key={b.id} onPress={() => router.push(`/bookings/${b.id}`)} style={styles.historyRow}>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>
                  {b.requestedCheckIn} → {b.requestedCheckOut}
                </Text>
                <BookingStatusPill status={b.status} />
              </View>
              {b.unitName && (
                <Text style={{ color: colors.inkSoft, fontFamily: fonts.mono, fontSize: 12 }}>
                  {b.unitName} · {b.propertyAddress}
                </Text>
              )}
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>{label}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontFamily: fonts.bodyBold, fontSize: 17 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, marginBottom: spacing.sm },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  currentBox: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  historyRow: { paddingVertical: spacing.sm, marginTop: spacing.xs },
});
