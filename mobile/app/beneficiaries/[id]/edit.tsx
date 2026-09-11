import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "../../../src/components/ScreenContainer";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { Field } from "../../../src/components/Field";
import { api, ApiError } from "../../../src/api/client";
import { BeneficiaryDto } from "../../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../../src/theme/tokens";

/** Editarea unui beneficiar existent — aceleași câmpuri ca la creare
 * (beneficiaries/new.tsx), doar precompletate din fișa curentă și trimise cu PATCH
 * în loc de POST. Statusul (blocat/activ) rămâne treaba `beneficiaries/[id].tsx`
 * (block/unblock), nu se atinge de-aici. */
export default function EditBeneficiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [localityFreeText, setLocalityFreeText] = useState("");
  const [materialSituation, setMaterialSituation] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<BeneficiaryDto>(`/api/beneficiaries/${id}`).then((b) => {
      setFullName(b.fullName);
      setPhone(b.phone ?? "");
      setAge(b.age !== null ? String(b.age) : "");
      setLocalityFreeText(b.localityFreeText ?? "");
      setMaterialSituation(b.materialSituation ?? "");
      setReferralSource(b.referralSource ?? "");
      setNotes(b.notes ?? "");
      setLoaded(true);
    }).catch((err) => setError(err instanceof ApiError ? err.message : "Nu am putut încărca beneficiarul."));
  }, [id]);

  const canSubmit = fullName.trim().length > 1;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.patch<BeneficiaryDto>(`/api/beneficiaries/${id}`, {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        localityFreeText: localityFreeText.trim() || null,
        age: age.trim() ? Number(age.trim()) : null,
        materialSituation: materialSituation.trim() || null,
        referralSource: referralSource.trim() || null,
        notes: notes.trim() || null,
      });
      router.replace(`/beneficiaries/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Modificările nu au putut fi salvate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Editează beneficiar" }} />
      {loaded && (
        <ScrollView contentContainerStyle={{ gap: spacing.md }}>
          <Field label="Nume și prenume" value={fullName} onChangeText={setFullName} />
          <Field label="Telefon (opțional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Vârstă (opțional)" value={age} onChangeText={setAge} keyboardType="number-pad" />
          <Field label="Localitate (opțional)" value={localityFreeText} onChangeText={setLocalityFreeText} placeholder="ex. Bacău" />
          <Field label="Situație materială (opțional)" value={materialSituation} onChangeText={setMaterialSituation} />
          <Field label="Cum a ajuns la Emaus (opțional)" value={referralSource} onChangeText={setReferralSource} placeholder="ex. recomandare spital" />
          <Field label="Observații (opțional)" value={notes} onChangeText={setNotes} multiline />

          {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

          <PrimaryButton label="Salvează modificările" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
        </ScrollView>
      )}
      {!loaded && error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </ScreenContainer>
  );
}
