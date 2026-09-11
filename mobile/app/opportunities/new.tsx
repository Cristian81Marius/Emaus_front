import React, { useEffect, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Field } from "../../src/components/Field";
import { DatePicker } from "../../src/components/DatePicker";
import { TimePicker } from "../../src/components/TimePicker";
import { SelectField } from "../../src/components/SelectField";
import { ChipPicker } from "../../src/components/ChipPicker";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { api, ApiError } from "../../src/api/client";
import { OpportunityType, PropertyDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

const TYPES: { value: OpportunityType; label: string }[] = [
  { value: "Cleaning", label: "Curățenie" },
  { value: "Event", label: "Eveniment" },
  { value: "Visit", label: "Vizită" },
  { value: "Promotion", label: "Promovare" },
];

/** Data ȘI ora sunt amândouă opționale — pot fi lăsate nestabilite la publicare și
 * completate/schimbate mai târziu (nu există încă un ecran de editare, dar câmpurile
 * din DTO permit asta — vezi `OpportunityDto.scheduledAt`/`hasTime` din types.ts). */
export default function NewOpportunityScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<OpportunityType>("Cleaning");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [properties, setProperties] = useState<PropertyDto[] | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [notifyEveryone, setNotifyEveryone] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<PropertyDto[]>("/api/properties").then(setProperties).catch(() => setProperties([]));
  }, []);

  const canSubmit = title.trim().length > 1;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/opportunities", {
        type,
        title: title.trim(),
        description: description.trim() || null,
        scheduledAt: date ? `${date}T${time || "00:00"}` : null,
        hasTime: !!(date && time),
        propertyId: propertyId || null,
        capacity: capacity.trim() ? Number(capacity.trim()) : null,
        notifyEveryone,
      });
      router.replace("/opportunities");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Activitatea nu a putut fi publicată.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Activitate nouă" }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        <Field label="Titlu" value={title} onChangeText={setTitle} placeholder="ex. Curățenie generală Apartament 2" />

        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft }}>Tip</Text>
        <ChipPicker options={TYPES} value={type} onChange={setType} />

        <DatePicker label="Data" value={date} onChange={setDate} placeholder="Dată de stabilit" optional />
        <TimePicker label="Ora" value={time} onChange={setTime} />

        <Field label="Descriere (opțional)" value={description} onChangeText={setDescription} multiline />
        <Field label="Capacitate (opțional)" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />

        <SelectField
          label="Locație (opțional)"
          value={propertyId}
          options={[{ value: "", label: "— fără locație anume —" }, ...(properties ?? []).map((p) => ({ value: p.id, label: p.shortLabel }))]}
          onChange={setPropertyId}
          placeholder="Alege o locație"
        />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs }}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink }}>Anunță toți voluntarii</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, marginTop: 2 }}>
              Trimite o notificare tuturor voluntarilor când publici activitatea.
            </Text>
          </View>
          <Switch
            value={notifyEveryone}
            onValueChange={setNotifyEveryone}
            trackColor={{ false: colors.line, true: colors.accentTint }}
            thumbColor={notifyEveryone ? colors.accent : colors.surface2}
          />
        </View>

        {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

        <PrimaryButton label="Publică activitatea" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </ScreenContainer>
  );
}
