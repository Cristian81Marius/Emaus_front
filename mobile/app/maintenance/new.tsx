import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Field } from "../../src/components/Field";
import { SelectField } from "../../src/components/SelectField";
import { ChipPicker } from "../../src/components/ChipPicker";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { api, ApiError } from "../../src/api/client";
import { MaintenanceTicketPriority, MaintenanceTicketType, PropertyDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

const TYPES: { value: MaintenanceTicketType; label: string }[] = [
  { value: "Supplies", label: "Consumabile" },
  { value: "Repair", label: "Reparație" },
  { value: "Urgent", label: "Urgență" },
];

const PRIORITIES: { value: MaintenanceTicketPriority; label: string }[] = [
  { value: "Low", label: "Scăzută" },
  { value: "Medium", label: "Medie" },
  { value: "High", label: "Ridicată" },
  { value: "Urgent", label: "Urgentă" },
];

export default function NewMaintenanceTicketScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [properties, setProperties] = useState<PropertyDto[] | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [type, setType] = useState<MaintenanceTicketType>("Supplies");
  const [priority, setPriority] = useState<MaintenanceTicketPriority>("Medium");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<PropertyDto[]>("/api/properties").then(setProperties).catch(() => setProperties([]));
  }, []);

  const canSubmit = propertyId && description.trim().length > 2;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/maintenance", {
        propertyId,
        type,
        description: description.trim(),
        priority,
        estimatedCost: estimatedCost.trim() ? Number(estimatedCost.trim()) : null,
        photoUrl: null,
      });
      router.replace("/maintenance");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sesizarea nu a putut fi trimisă.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Sesizare nouă" }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        {properties === null && <Text style={{ color: colors.inkSoft }}>Se încarcă…</Text>}
        <SelectField
          label="Locație"
          options={(properties ?? []).map((p) => ({ value: p.id, label: p.shortLabel }))}
          value={propertyId}
          onChange={setPropertyId}
          placeholder="Alege o locație"
        />

        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft, marginTop: spacing.sm }}>Tip</Text>
        <ChipPicker options={TYPES} value={type} onChange={setType} />

        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft, marginTop: spacing.sm }}>Prioritate</Text>
        <ChipPicker options={PRIORITIES} value={priority} onChange={setPriority} />

        <Field label="Descriere" value={description} onChangeText={setDescription} multiline placeholder="Ce s-a întâmplat / ce lipsește" />
        <Field label="Cost estimat (opțional)" value={estimatedCost} onChangeText={setEstimatedCost} keyboardType="numeric" placeholder="lei" />

        {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

        <PrimaryButton label="Trimite sesizarea" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </ScreenContainer>
  );
}
