import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "../../../src/components/ScreenContainer";
import { Field } from "../../../src/components/Field";
import { DatePicker } from "../../../src/components/DatePicker";
import { TimePicker } from "../../../src/components/TimePicker";
import { SelectField } from "../../../src/components/SelectField";
import { ChipPicker } from "../../../src/components/ChipPicker";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { api, ApiError } from "../../../src/api/client";
import { OpportunityDto, OpportunityType, PropertyDto } from "../../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../../src/theme/tokens";

const TYPES: { value: OpportunityType; label: string }[] = [
  { value: "Cleaning", label: "Curățenie" },
  { value: "Event", label: "Eveniment" },
  { value: "Visit", label: "Vizită" },
  { value: "Promotion", label: "Promovare" },
];

/** Editarea unei activități deja publicate — aceleași câmpuri ca la creare
 * (opportunities/new.tsx), precompletate, trimise cu PATCH. Fără switch-ul de
 * "Anunță toți voluntarii" — acela ține doar de notificarea la publicare, nu are
 * sens la o editare ulterioară. */
export default function EditOpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<OpportunityType>("Cleaning");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [properties, setProperties] = useState<PropertyDto[] | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<PropertyDto[]>("/api/properties").then(setProperties).catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    api.get<OpportunityDto>(`/api/opportunities/${id}`).then((o) => {
      setTitle(o.title);
      setType(o.type);
      setDescription(o.description ?? "");
      if (o.scheduledAt) {
        const [d, t] = o.scheduledAt.split("T");
        setDate(d ?? "");
        setTime(o.hasTime ? (t ?? "").slice(0, 5) : "");
      }
      setCapacity(o.capacity !== null ? String(o.capacity) : "");
      setPropertyId(o.propertyId ?? "");
      setLoaded(true);
    }).catch((err) => setError(err instanceof ApiError ? err.message : "Nu am putut încărca activitatea."));
  }, [id]);

  const canSubmit = title.trim().length > 1;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.patch(`/api/opportunities/${id}`, {
        type,
        title: title.trim(),
        description: description.trim() || null,
        scheduledAt: date ? `${date}T${time || "00:00"}` : null,
        hasTime: !!(date && time),
        propertyId: propertyId || null,
        capacity: capacity.trim() ? Number(capacity.trim()) : null,
      });
      router.replace("/opportunities");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Modificările nu au putut fi salvate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Editează activitatea" }} />
      {loaded && (
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

          {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

          <PrimaryButton label="Salvează modificările" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
        </ScrollView>
      )}
      {!loaded && error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </ScreenContainer>
  );
}
