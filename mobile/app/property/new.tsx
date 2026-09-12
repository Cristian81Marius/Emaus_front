import React, { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Field } from "../../src/components/Field";
import { api, ApiError } from "../../src/api/client";
import { PropertyDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

/** Locație nouă (Nucleus) — creează doar identitatea locației (adresă/etichetă/
 * interfon/chei); unitățile cazabile se adaugă după, de pe fișa locației
 * ("Adaugă unitate"), la fel cum se editează statusul lor acolo. */
export default function NewPropertyScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [isTemporary, setIsTemporary] = useState(false);
  const [notes, setNotes] = useState("");
  const [interfon, setInterfon] = useState("");
  const [keyHolders, setKeyHolders] = useState("");
  const [keyNotes, setKeyNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = address.trim().length > 1 && shortLabel.trim().length > 1;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const property = await api.post<PropertyDto>("/api/properties", {
        address: address.trim(),
        shortLabel: shortLabel.trim(),
        isTemporary,
        notes: notes.trim() || null,
        interfon: interfon.trim() || null,
        keyHolders: keyHolders.split(",").map((s) => s.trim()).filter(Boolean),
        keyNotes: keyNotes.trim() || null,
        lifetimeStayDays: null,
        lifetimeBookingsCompleted: null,
      });
      router.replace(`/property/${property.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Locația nu a putut fi creată.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Locație nouă" }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        <Field label="Adresă completă" value={address} onChangeText={setAddress} multiline placeholder="ex. Str. Laborator nr. 124, ap. 124" />
        <Field label="Etichetă scurtă (pentru liste)" value={shortLabel} onChangeText={setShortLabel} placeholder="ex. Str. Laborator nr. 124" />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink }}>Locație temporară</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, marginTop: 2 }}>
              Ex. Airbnb — o cazare scurtă, ad-hoc, nu una dintre locațiile fixe.
            </Text>
          </View>
          <Switch
            value={isTemporary}
            onValueChange={setIsTemporary}
            trackColor={{ false: colors.line, true: colors.accentTint }}
            thumbColor={isTemporary ? colors.accent : colors.surface2}
          />
        </View>

        <Field label="Observații (opțional)" value={notes} onChangeText={setNotes} multiline />
        <Field label="Interfon (opțional)" value={interfon} onChangeText={setInterfon} />
        <Field label="Are cheile (opțional, separate prin virgulă)" value={keyHolders} onChangeText={setKeyHolders} placeholder="ex. Alexandra, David" />
        <Field label="Observații chei (opțional)" value={keyNotes} onChangeText={setKeyNotes} multiline />

        {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

        <PrimaryButton label="Creează locația" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </ScreenContainer>
  );
}
