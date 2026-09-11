import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<PropertyDto>(`/api/properties/${id}`).then((p) => {
      setAddress(p.address);
      setShortLabel(p.shortLabel);
      setNotes(p.notes ?? "");
      setInterfon(p.interfon ?? "");
      setKeyHolders(p.keyHolders.join(", "));
      setKeyNotes(p.keyNotes ?? "");
      setLoaded(true);
    }).catch((err) => setError(err instanceof ApiError ? err.message : "Nu am putut încărca locația."));
  }, [id]);

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
        </ScrollView>
      )}
      {!loaded && error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </ScreenContainer>
  );
}
