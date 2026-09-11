import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect, useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { InfoButton, InfoLine } from "../../src/components/InfoButton";
import { PhoneActions } from "../../src/components/PhoneActions";
import { UnitStatusPill, UNIT_STATUS_META } from "../../src/components/StatusPill";
import { ShareActions } from "../../src/components/ShareActions";
import { useAuth } from "../../src/state/AuthContext";
import { api, ApiError } from "../../src/api/client";
import { BookingDto, PropertyDto, UnitStatus } from "../../src/api/types";
import { useThemeColors, fonts, spacing, radius, ThemeColors } from "../../src/theme/tokens";

const HISTORY_LIMIT = 10;

const ALL_UNIT_STATUSES = Object.keys(UNIT_STATUS_META) as UnitStatus[];

/** Detaliul unei locații — pe lângă statusul curent al fiecărei unități, arată cine stă
 * acolo acum și istoricul cazărilor (ce lipsea complet înainte: "de unde știu unde e
 * cazat beneficiarul?"). O solicitare abia aprobată/în așteptare nu are încă o unitate
 * (vezi comentariul de pe BookingService.GetAllAsync) — "viitorul" unei locații concrete
 * devine vizibil abia la alocare; cererile care încă așteaptă alocare se văd pe ecranul
 * de Solicitări, filtrate pe "Aprobate". */
export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const isNucleus = user?.role === "Nucleus";

  const [property, setProperty] = useState<PropertyDto | null>(null);
  const [unitBookings, setUnitBookings] = useState<BookingDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null);
  const [editingStatusUnitId, setEditingStatusUnitId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [propertyData, bookingsData] = await Promise.all([
        api.get<PropertyDto>(`/api/properties/${id}`),
        api.get<BookingDto[]>(`/api/bookings?propertyId=${id}`),
      ]);
      setProperty(propertyData);
      setUnitBookings(bookingsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca locația.");
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changeStatus = async (unitId: string, status: UnitStatus) => {
    setBusyUnitId(unitId);
    setEditingStatusUnitId(null);
    try {
      await api.patch(`/api/units/${unitId}/status`, { status, statusNotes: null });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut schimba statusul.");
    } finally {
      setBusyUnitId(null);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: property?.address ?? "Locație" }} />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {property && (
        <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
          <Text style={[styles.address, { color: colors.ink }]}>{property.address}</Text>
          {property.notes && <Text style={{ color: colors.inkSoft, fontFamily: fonts.body }}>{property.notes}</Text>}
          <View style={styles.addressActionsRow}>
            <ShareActions text={property.address} label="Trimite adresa" textStyle={{ fontSize: 12.5 }} />
            {isNucleus && (
              <Pressable onPress={() => router.push(`/property/${property.id}/edit`)}>
                <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Editează locația</Text>
              </Pressable>
            )}
          </View>

          {(property.interfon || property.keyHolders.length > 0) && (
            <InfoButton label="Interfon & chei">
              {property.interfon && <InfoLine label="Interfon" value={property.interfon} />}
              {property.keyHolders.length > 0 && <InfoLine label="Are cheile" value={property.keyHolders.join(", ")} />}
              {property.keyNotes && <InfoLine label="Observații chei" value={property.keyNotes} />}
            </InfoButton>
          )}

          {property.units.map((unit) => {
            const bookingsHere = unitBookings?.filter((b) => b.unitId === unit.id) ?? [];
            const current = bookingsHere.find((b) => b.status === "Active");

            return (
              <Card key={unit.id}>
                <View style={styles.unitHeader}>
                  <Text style={[styles.unitName, { color: colors.ink }]}>{unit.name}</Text>
                  <UnitStatusPill status={unit.status} />
                </View>
                <Text style={[styles.capacity, { color: colors.inkSoft }]}>Capacitate: {unit.capacity} persoane</Text>
                {unit.statusNotes && <Text style={[styles.notes, { color: colors.inkFaint }]}>{unit.statusNotes}</Text>}

                {current && (
                  <Pressable
                    onPress={() => router.push(`/bookings/${current.id}`)}
                    style={[styles.currentBox, { borderTopColor: colors.line }]}
                  >
                    <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyBold, fontSize: 13.5 }}>
                      Cazat acum: {current.beneficiaryName}
                    </Text>
                    {current.beneficiaryPhone && <PhoneActions phone={current.beneficiaryPhone} textStyle={{ fontSize: 12, marginTop: 2 }} />}
                    <Text style={{ color: colors.inkSoft, fontFamily: fonts.mono, fontSize: 12, marginTop: 2 }}>
                      din {current.actualCheckIn} · plecare estimată {current.requestedCheckOut}
                    </Text>
                  </Pressable>
                )}

                {editingStatusUnitId === unit.id ? (
                  <View style={styles.statusOptionsRow}>
                    {ALL_UNIT_STATUSES.map((status) => (
                      <Pressable
                        key={status}
                        disabled={busyUnitId === unit.id}
                        onPress={() => changeStatus(unit.id, status)}
                        style={[
                          styles.statusOption,
                          {
                            borderColor: status === unit.status ? colors.accent : colors.line,
                            backgroundColor: status === unit.status ? colors.accentTint : "transparent",
                          },
                        ]}
                      >
                        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink }}>
                          {UNIT_STATUS_META[status].label}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => setEditingStatusUnitId(null)}>
                      <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5 }}>Renunță</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => setEditingStatusUnitId(unit.id)} style={{ marginTop: spacing.sm }}>
                    <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>
                      Schimbă statusul manual
                    </Text>
                  </Pressable>
                )}
              </Card>
            );
          })}

          <PropertyHistory property={property} bookings={unitBookings} colors={colors} onOpenBooking={(bookingId) => router.push(`/bookings/${bookingId}`)} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

/** Istoricul beneficiarilor cazați la ACEASTĂ locație — pe toate unitățile ei, nu doar
 * pe una (înainte era îngropat separat în fiecare card de unitate, greu de găsit —
 * "nu văd unde pot vedea istoricul"). `property.lifetimeBookingsCompleted` (din
 * evidența reală) e aproape mereu mai mare decât ce afișăm aici (nu re-introducem
 * fiecare cazare istorică rând-cu-rând — vezi mobile/CLAUDE.md) — nota de la final
 * face limpede că lista de mai sus e doar cele mai recente, nu tot istoricul. */
function PropertyHistory({
  property,
  bookings,
  colors,
  onOpenBooking,
}: {
  property: PropertyDto;
  bookings: BookingDto[] | null;
  colors: ThemeColors;
  onOpenBooking: (bookingId: string) => void;
}) {
  const history = (bookings ?? [])
    .filter((b) => b.status === "Completed")
    .sort((a, b) => (b.actualCheckOut ?? "").localeCompare(a.actualCheckOut ?? ""))
    .slice(0, HISTORY_LIMIT);

  return (
    <Card>
      <Link href="/beneficiaries" asChild>
        <Pressable style={styles.unitHeader}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink, marginBottom: spacing.xs }}>Istoric beneficiari</Text>
          <Text style={{ color: colors.inkFaint, fontSize: 16 }}>›</Text>
        </Pressable>
      </Link>
      {history.length === 0 ? (
        <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 }}>Niciun beneficiar cazat aici încă.</Text>
      ) : (
        history.map((b) => (
          <Pressable key={b.id} onPress={() => onOpenBooking(b.id)} style={styles.historyRow}>
            <View style={styles.unitHeader}>
              <Text style={{ color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>{b.beneficiaryName}</Text>
              <Text style={{ color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 11.5 }}>{b.unitName}</Text>
            </View>
            <Text style={{ color: colors.inkSoft, fontFamily: fonts.mono, fontSize: 12 }}>
              {b.actualCheckIn} → {b.actualCheckOut}
            </Text>
          </Pressable>
        ))
      )}
      {property.lifetimeBookingsCompleted !== null && property.lifetimeBookingsCompleted > history.length && (
        <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: spacing.sm }}>
          Afișate cele mai recente {history.length} din {property.lifetimeBookingsCompleted} cazări încheiate în total la această locație.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  address: { fontFamily: fonts.display, fontSize: 20 },
  addressActionsRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xs },
  unitHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  unitName: { fontFamily: fonts.bodyBold, fontSize: 15.5 },
  capacity: { fontFamily: fonts.mono, fontSize: 12.5 },
  notes: { fontFamily: fonts.body, fontSize: 13, marginTop: spacing.xs },
  currentBox: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  historyRow: { marginTop: spacing.sm },
  statusOptionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm, alignItems: "center" },
  statusOption: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.sm },
});
