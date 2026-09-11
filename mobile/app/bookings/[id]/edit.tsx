import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "../../../src/components/ScreenContainer";
import { DatePicker } from "../../../src/components/DatePicker";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { api, ApiError } from "../../../src/api/client";
import { BookingDto } from "../../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../../src/theme/tokens";

/** Editarea perioadei solicitate a unei cazări — permisă doar cât timp solicitarea
 * încă n-a fost alocată (PendingApproval/Approved, vezi PATCH /api/bookings/:id din
 * server.ts). După alocare, perioada reală (actualCheckIn/actualCheckOut) preia rolul
 * ăsta — nu se mai editează cererea inițială. */
export default function EditBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<BookingDto>(`/api/bookings/${id}`).then((b) => {
      setCheckIn(b.requestedCheckIn);
      setCheckOut(b.requestedCheckOut);
      setLoaded(true);
    }).catch((err) => setError(err instanceof ApiError ? err.message : "Nu am putut încărca solicitarea."));
  }, [id]);

  const canSubmit = !!checkIn && !!checkOut;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.patch<BookingDto>(`/api/bookings/${id}`, { requestedCheckIn: checkIn, requestedCheckOut: checkOut });
      router.replace(`/bookings/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Modificările nu au putut fi salvate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Editează perioada" }} />
      {loaded && (
        <ScrollView contentContainerStyle={{ gap: spacing.md }}>
          <DatePicker label="Check-in solicitat" value={checkIn} onChange={setCheckIn} />
          <DatePicker label="Check-out solicitat" value={checkOut} onChange={setCheckOut} />

          {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

          <PrimaryButton label="Salvează modificările" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
        </ScrollView>
      )}
      {!loaded && error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </ScreenContainer>
  );
}
