import React, { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Field } from "../../src/components/Field";
import { api, ApiError } from "../../src/api/client";
import { BeneficiaryDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

/** Fișă nouă de beneficiar — separată de "Solicitare nouă" (booking/new.tsx), care
 * acum caută întâi printre beneficiarii existenți și trimite aici doar dacă chiar
 * e prima lui prezență la Emaus. */
export default function NewBeneficiaryScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [localityFreeText, setLocalityFreeText] = useState("");
  const [materialSituation, setMaterialSituation] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = fullName.trim().length > 1;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const beneficiary = await api.post<BeneficiaryDto>("/api/beneficiaries", {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        localityId: null,
        localityFreeText: localityFreeText.trim() || null,
        age: age.trim() ? Number(age.trim()) : null,
        materialSituation: materialSituation.trim() || null,
        referralSource: referralSource.trim() || null,
        notes: notes.trim() || null,
      });
      router.replace(`/beneficiaries/${beneficiary.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Beneficiarul nu a putut fi salvat.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Beneficiar nou" }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        <Field label="Nume și prenume" value={fullName} onChangeText={setFullName} />
        <Field label="Telefon (opțional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Vârstă (opțional)" value={age} onChangeText={setAge} keyboardType="number-pad" />
        <Field label="Localitate (opțional)" value={localityFreeText} onChangeText={setLocalityFreeText} placeholder="ex. Bacău" />
        <Field label="Situație materială (opțional)" value={materialSituation} onChangeText={setMaterialSituation} />
        <Field label="Cum a ajuns la Emaus (opțional)" value={referralSource} onChangeText={setReferralSource} placeholder="ex. recomandare spital" />
        <Field label="Observații (opțional)" value={notes} onChangeText={setNotes} multiline />

        {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

        <PrimaryButton label="Salvează beneficiarul" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </ScreenContainer>
  );
}
