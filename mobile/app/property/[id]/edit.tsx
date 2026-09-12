import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "../../../src/components/ScreenContainer";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { Field } from "../../../src/components/Field";
import { api, ApiError } from "../../../src/api/client";
import { PropertyDto } from "../../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../../src/theme/tokens";

/** Editarea datelor unei locații — adresă/etichetă scurtă/observații/interfon/chei.
 * Statusul unităților rămâne treaba property/[id].tsx ("Schimbă statusul manual"),
 * nu se atinge de-aici — asta editează doar identitatea locației. */
export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [address, setAddress] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [interfon, setInterfon] = useState("");
  const [keyHolders, setKeyHolders] = useState("");
  const [keyNotes, setKeyNotes] = useState("");
  const [isArchived, setIsArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const load = () =>
    api.get<PropertyDto>(`/api/properties/${id}`).then((p) => {
      setAddress(p.address);
      setShortLabel(p.shortLabel);
      setNotes(p.notes ?? "");
      setInterfon(p.interfon ?? "");
      setKeyHolders(p.keyHolders.join(", "));
      setKeyNotes(p.keyNotes ?? "");
      setIsArchived(p.isArchived);
      setLoaded(true);
    }).catch((err) => setError(err instanceof ApiError ? err.message : "Nu am putut încărca locația."));

  useEffect(() => { load(); }, [id]);

  const archive = async () => {
    setArchiveBusy(true);
    setError(null);
    try {
      await api.post(`/api/properties/${id}/archive`);
      setShowArchiveConfirm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut arhiva locația.");
    } finally {
      setArchiveBusy(false);
    }
  };

  const unarchive = async () => {
    setArchiveBusy(true);
    setError(null);
    try {
      await api.post(`/api/properties/${id}/unarchive`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut reactiva locația.");
    } finally {
      setArchiveBusy(false);
    }
  };

  const canSubmit = address.trim().length > 1 && shortLabel.trim().length > 1;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.patch<PropertyDto>(`/api/properties/${id}`, {
        address: address.trim(),
        shortLabel: shortLabel.trim(),
        notes: notes.trim() || null,
        interfon: interfon.trim() || null,
        keyHolders: keyHolders.split(",").map((s) => s.trim()).filter(Boolean),
        keyNotes: keyNotes.trim() || null,
      });
      router.replace(`/property/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Modificările nu au putut fi salvate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Editează locația" }} />
      {loaded && (
        <ScrollView contentContainerStyle={{ gap: spacing.md }}>
          <Field label="Adresă completă" value={address} onChangeText={setAddress} multiline />
          <Field label="Etichetă scurtă (pentru liste)" value={shortLabel} onChangeText={setShortLabel} placeholder="ex. Str. Laborator nr. 124" />
          <Field label="Observații (opțional)" value={notes} onChangeText={setNotes} multiline />
          <Field label="Interfon (opțional)" value={interfon} onChangeText={setInterfon} />
          <Field label="Are cheile (opțional, separate prin virgulă)" value={keyHolders} onChangeText={setKeyHolders} placeholder="ex. Alexandra, David" />
          <Field label="Observații chei (opțional)" value={keyNotes} onChangeText={setKeyNotes} multiline />

          {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

          <PrimaryButton label="Salvează modificările" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />

          <View style={{ marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, gap: spacing.sm }}>
            {isArchived ? (
              <>
                <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5 }}>
                  Locația e arhivată — nu apare pe ecranul de Locații decât dacă se arată explicit și cele arhivate.
                </Text>
                <PrimaryButton label="Reactivează locația" onPress={unarchive} loading={archiveBusy} />
              </>
            ) : !showArchiveConfirm ? (
              <PrimaryButton label="Arhivează locația" variant="danger" onPress={() => setShowArchiveConfirm(true)} />
            ) : (
              <>
                <Text style={{ color: colors.ink, fontFamily: fonts.body, fontSize: 13 }}>
                  Locația nu mai apare pe ecranul de Locații, dar istoricul de cazări rămâne intact — poți reactiva oricând de-aici.
                </Text>
                <PrimaryButton label="Confirmă arhivarea" variant="danger" loading={archiveBusy} onPress={archive} />
                <PrimaryButton label="Renunță" variant="secondary" onPress={() => setShowArchiveConfirm(false)} />
              </>
            )}
          </View>
        </ScrollView>
      )}
      {!loaded && error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </ScreenContainer>
  );
}
