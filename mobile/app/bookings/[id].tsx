import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { DatePicker } from "../../src/components/DatePicker";
import { PhoneField } from "../../src/components/PhoneActions";
import { BookingStatusPill } from "../../src/components/StatusPill";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useAuth } from "../../src/state/AuthContext";
import { api, ApiError, getApiMode } from "../../src/api/client";
import { BookingDto, UnitDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing, radius } from "../../src/theme/tokens";
import { BASE_STYLE, downloadAndSharePdf, generateFilledPdf } from "../../src/documents/pdf";

/** Doar pentru modul mock — server-ul mock n-are contractul real (text legal, vezi
 * BookingContractDocument.cs în backend), deci generăm local un rezumat al datelor deja
 * încărcate, ca fluxul "Generează contract" să rămână testabil fără backend real. */
function mockContractHtml(booking: BookingDto): string {
  return `
    <html><head>${BASE_STYLE}</head><body>
      <h1>Contract de acordare a serviciilor sociale</h1>
      <div class="meta">Asociația Emaus — previzualizare mod mock</div>
      <div class="placeholder-note">
        Modul mock nu are textul legal complet al contractului — server-ul real îl
        generează la <code>GET /api/bookings/{id}/contract</code>. Aici e doar un
        rezumat al datelor solicitării, ca fluxul să fie testabil.
      </div>
      <div class="field"><b>Beneficiar:</b> ${booking.beneficiaryName}</div>
      ${booking.beneficiaryPhone ? `<div class="field"><b>Telefon:</b> ${booking.beneficiaryPhone}</div>` : ""}
      <div class="field"><b>Perioadă solicitată:</b> ${booking.requestedCheckIn} → ${booking.requestedCheckOut}</div>
      ${booking.unitName ? `<div class="field"><b>Locație:</b> ${booking.unitName} · ${booking.propertyAddress ?? ""}</div>` : ""}
      ${booking.caseManagerName ? `<div class="field"><b>Manager de caz:</b> ${booking.caseManagerName}</div>` : ""}
      <div class="field"><b>Cerută de:</b> ${booking.createdByName}</div>
    </body></html>
  `;
}

/** Detaliul unei solicitări — restul pașilor din "Flux: solicitare nouă" pe care lista
 * (bookings/index.tsx) nu are loc să-i arate: alocarea unei unități, check-out-ul, și
 * anularea. Fiecare acțiune corespunde 1-la-1 unui endpoint din BookingsController. */
export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const isNucleus = user?.role === "Nucleus";

  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  const [commentText, setCommentText] = useState("");

  const [availableUnits, setAvailableUnits] = useState<UnitDto[] | null>(null);
  const [showAllocate, setShowAllocate] = useState(false);

  const [checkOutDate, setCheckOutDate] = useState("");

  const [generatingContract, setGeneratingContract] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setBooking(await api.get<BookingDto>(`/api/bookings/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca solicitarea.");
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Acțiunea nu a putut fi salvată.");
    } finally {
      setBusy(false);
    }
  };

  const decide = (approved: boolean, note?: string) =>
    runAction(async () => {
      await api.post(`/api/bookings/${id}/decide`, { approved, note: note?.trim() || null });
      setShowReject(false);
      setRejectNote("");
    });

  const cancel = () =>
    runAction(async () => {
      await api.post(`/api/bookings/${id}/cancel`, {});
    });

  const openAllocate = async () => {
    setShowAllocate(true);
    if (availableUnits) return;
    try {
      setAvailableUnits(await api.get<UnitDto[]>("/api/units/available"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca unitățile disponibile.");
    }
  };

  const allocate = (unitId: string) =>
    runAction(async () => {
      await api.post(`/api/bookings/${id}/allocate`, { unitId });
      setShowAllocate(false);
      setAvailableUnits(null);
    });

  const checkOut = () =>
    runAction(async () => {
      await api.post(`/api/bookings/${id}/checkout`, {
        actualCheckOutDate: checkOutDate || null,
      });
    });

  const addComment = () =>
    runAction(async () => {
      if (!commentText.trim()) return;
      await api.post(`/api/bookings/${id}/comments`, { text: commentText.trim() });
      setCommentText("");
    });

  const generateContract = async () => {
    if (!booking) return;
    setGeneratingContract(true);
    setError(null);
    try {
      if (getApiMode() === "mock") {
        await generateFilledPdf(mockContractHtml(booking), "Contract de cazare");
      } else {
        await downloadAndSharePdf(`/api/bookings/${id}/contract`, `contract-${id}.pdf`, "Contract de cazare");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut genera contractul.");
    } finally {
      setGeneratingContract(false);
    }
  };

  if (!booking) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: true, title: "Solicitare" }} />
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: booking.beneficiaryName }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <Card>
          <View style={styles.rowBetween}>
            <Text style={[styles.name, { color: colors.ink }]}>{booking.beneficiaryName}</Text>
            <BookingStatusPill status={booking.status} />
          </View>

          {booking.beneficiaryPhone && (
            <View style={{ marginTop: spacing.sm }}>
              <PhoneField label="Telefon beneficiar" phone={booking.beneficiaryPhone} />
            </View>
          )}
          <Field label="Perioadă solicitată" value={`${booking.requestedCheckIn} → ${booking.requestedCheckOut}`} colors={colors} />
          {(booking.actualCheckIn || booking.actualCheckOut) && (
            <Field
              label="Perioadă reală"
              value={`${booking.actualCheckIn ?? "—"} → ${booking.actualCheckOut ?? "în curs"}`}
              colors={colors}
            />
          )}
          {booking.unitName && (
            <Field label="Locație alocată" value={`${booking.unitName} · ${booking.propertyAddress ?? ""}`} colors={colors} />
          )}
          <Field label="Cerută de" value={booking.createdByName} colors={colors} />
          {booking.decidedByName && (
            <Field
              label="Decisă de"
              value={`${booking.decidedByName}${booking.decisionNote ? ` — „${booking.decisionNote}”` : ""}`}
              colors={colors}
            />
          )}

          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              label="Generează contract"
              variant="secondary"
              loading={generatingContract}
              onPress={generateContract}
            />
          </View>
        </Card>

        {isNucleus && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>Acțiuni</Text>

            {(booking.status === "PendingApproval" || booking.status === "Approved") && (
              <Pressable onPress={() => router.push(`/bookings/${booking.id}/edit`)} style={{ marginBottom: spacing.sm }}>
                <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Editează perioada solicitată</Text>
              </Pressable>
            )}

            {booking.status === "PendingApproval" && !showReject && (
              <View style={styles.actionsRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Aprobă" loading={busy} onPress={() => decide(true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Respinge" variant="danger" loading={busy} onPress={() => setShowReject(true)} />
                </View>
              </View>
            )}

            {booking.status === "PendingApproval" && showReject && (
              <View style={{ gap: spacing.sm }}>
                <TextInput
                  placeholder="Motiv respingere (opțional)"
                  placeholderTextColor={colors.inkFaint}
                  value={rejectNote}
                  onChangeText={setRejectNote}
                  style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.surface }]}
                />
                <View style={styles.actionsRow}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Confirmă respingerea" variant="danger" loading={busy} onPress={() => decide(false, rejectNote)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Renunță" variant="secondary" onPress={() => setShowReject(false)} />
                  </View>
                </View>
              </View>
            )}

            {booking.status === "Approved" && !showAllocate && (
              <PrimaryButton label="Alocă o unitate" loading={busy} onPress={openAllocate} />
            )}

            {booking.status === "Approved" && showAllocate && (
              <View style={{ gap: spacing.sm }}>
                {availableUnits === null && <Text style={{ color: colors.inkSoft }}>Se încarcă unitățile libere…</Text>}
                {availableUnits?.length === 0 && (
                  <Text style={{ color: colors.inkSoft, fontFamily: fonts.body }}>
                    Nicio unitate liberă acum — eliberează sau curăță una întâi.
                  </Text>
                )}
                {availableUnits?.map((unit) => (
                  <Pressable
                    key={unit.id}
                    onPress={() => allocate(unit.id)}
                    style={[styles.unitOption, { borderColor: colors.line, backgroundColor: colors.surface2 }]}
                  >
                    <Text style={{ color: colors.ink, fontFamily: fonts.bodyMedium }}>{unit.name}</Text>
                    <Text style={{ color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 12 }}>
                      capacitate {unit.capacity}
                    </Text>
                  </Pressable>
                ))}
                <PrimaryButton label="Renunță" variant="secondary" onPress={() => setShowAllocate(false)} />
              </View>
            )}

            {booking.status === "Active" && (
              <View style={{ gap: spacing.sm }}>
                <DatePicker label="Dată check-out" value={checkOutDate} onChange={setCheckOutDate} placeholder="Azi (implicit)" optional />
                <PrimaryButton label="Check-out" loading={busy} onPress={checkOut} />
              </View>
            )}

            {(booking.status === "PendingApproval" || booking.status === "Approved") && !showReject && !showAllocate && (
              <PrimaryButton label="Anulează solicitarea" variant="secondary" loading={busy} onPress={cancel} />
            )}

            {(booking.status === "Rejected" || booking.status === "Completed" || booking.status === "Cancelled") && (
              <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 }}>
                Solicitarea e închisă — nu mai are acțiuni disponibile.
              </Text>
            )}
          </Card>
        )}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Comentarii</Text>
          {booking.comments.length === 0 && (
            <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 }}>Niciun comentariu încă.</Text>
          )}
          {booking.comments.map((c) => (
            <Text key={c.id} style={[styles.comment, { color: colors.inkSoft }]}>
              <Text style={{ fontFamily: fonts.bodyBold }}>{c.authorName}: </Text>
              {c.text}
            </Text>
          ))}
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
            <TextInput
              placeholder="Adaugă un comentariu…"
              placeholderTextColor={colors.inkFaint}
              value={commentText}
              onChangeText={setCommentText}
              style={[styles.input, { flex: 1, borderColor: colors.line, color: colors.ink, backgroundColor: colors.surface }]}
            />
            <PrimaryButton label="Trimite" loading={busy} onPress={addComment} disabled={!commentText.trim()} />
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

function Field({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>{label}</Text>
      <Text style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.ink, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontFamily: fonts.bodyBold, fontSize: 17 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, marginBottom: spacing.sm },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  unitOption: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  comment: { fontFamily: fonts.body, fontSize: 13, marginTop: spacing.xs },
});
