import React, { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "../../../src/components/ScreenContainer";
import { Field } from "../../../src/components/Field";
import { ChipPicker } from "../../../src/components/ChipPicker";
import { SelectField } from "../../../src/components/SelectField";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { api, ApiError } from "../../../src/api/client";
import { BOB_VOLUNTEER_OPTIONS, BobBeneficiaryDto, BobBeneficiaryStatus, BobMobility } from "../../../src/api/bobTypes";
import { useThemeColors, fonts, spacing } from "../../../src/theme/tokens";

const MOBILITY_OPTIONS: { value: BobMobility; label: string }[] = [
  { value: "Deplasabil", label: "Deplasabil" },
  { value: "Nedeplasabil", label: "Nedeplasabil" },
];

const STATUS_OPTIONS: { value: BobBeneficiaryStatus; label: string }[] = [
  { value: "Active", label: "Activ" },
  { value: "Former", label: "Fost" },
  { value: "Possible", label: "Posibil" },
];

export default function NewBobBeneficiaryScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [mobility, setMobility] = useState<BobMobility | "">("");
  const [address, setAddress] = useState("");
  const [assignedVolunteerName, setAssignedVolunteerName] = useState<string>("");
  const [status, setStatus] = useState<BobBeneficiaryStatus>("Active");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = fullName.trim().length > 1;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const beneficiary = await api.post<BobBeneficiaryDto>("/api/bob/beneficiaries", {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        mobility: mobility || null,
        address: address.trim() || null,
        assignedVolunteerName: assignedVolunteerName.trim() || null,
        status,
        notes: notes.trim() || null,
      });
      router.replace(`/bob/beneficiaries/${beneficiary.id}`);
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

        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft }}>Statut mobilitate (opțional)</Text>
        <ChipPicker options={MOBILITY_OPTIONS} value={mobility} onChange={setMobility} />

        <Field label="Adresă (opțional)" value={address} onChangeText={setAddress} multiline />
        <SelectField
          label="Responsabil (opțional)"
          value={assignedVolunteerName}
          options={[{ value: "", label: "— fără responsabil —" }, ...BOB_VOLUNTEER_OPTIONS]}
          onChange={setAssignedVolunteerName}
          placeholder="Alege un responsabil"
        />

        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft }}>Statut beneficiar</Text>
        <ChipPicker options={STATUS_OPTIONS} value={status} onChange={setStatus} />

        <Field label="Observații (opțional)" value={notes} onChangeText={setNotes} multiline />

        {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

        <PrimaryButton label="Salvează beneficiarul" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </ScreenContainer>
  );
}
