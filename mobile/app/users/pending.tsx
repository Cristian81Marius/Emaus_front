import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { Field } from "../../src/components/Field";
import { PhoneField } from "../../src/components/PhoneActions";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useAuth } from "../../src/state/AuthContext";
import { api, ApiError } from "../../src/api/client";
import { PendingUserDto } from "../../src/api/types";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

const ROLE_LABEL = { Volunteer: "Voluntar", Nucleus: "Nucleus" } as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Cereri de acces în așteptare — reachable din Meniu, doar pentru Nucleus (vezi
 * cardul condiționat din app/menu.tsx; ruta rămâne totuși protejată și aici, cu
 * gardă locală, în caz că cineva ajunge direct pe link). Aprobă/Respinge cheamă
 * POST /api/users/{id}/approve|reject — vezi docs/API.md §3. */
export default function PendingUsersScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const isNucleus = user?.role === "Nucleus";

  const [items, setItems] = useState<PendingUserDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    if (!isNucleus) return;
    try {
      setError(null);
      setItems(await api.get<PendingUserDto[]>("/api/users/pending"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut încărca cererile.");
    }
  }, [isNucleus]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const approve = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/users/${id}/approve`, {});
      setItems((prev) => prev?.filter((u) => u.id !== id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut aproba cererea.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/users/${id}/reject`, { reason: rejectReason.trim() || undefined });
      setItems((prev) => prev?.filter((u) => u.id !== id) ?? prev);
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu am putut respinge cererea.");
    } finally {
      setBusyId(null);
    }
  };

  if (!isNucleus) {
    return (
      <ScreenContainer header>
        <Stack.Screen options={{ headerShown: true, title: "Cereri de acces" }} />
        <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>
          Doar Nucleul poate vedea cererile de acces.
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer header>
      <Stack.Screen options={{ headerShown: true, title: "Cereri de acces" }} />

      {error && <Text style={{ color: colors.danger, marginBottom: spacing.sm }}>{error}</Text>}

      <View style={{ gap: spacing.md }}>
        {items?.length === 0 && (
          <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Nicio cerere în așteptare.</Text>
        )}
        {items?.map((item) => (
          <Card key={item.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink }}>{item.fullName}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.accentInk }}>{ROLE_LABEL[item.requestedRole]}</Text>
            </View>

            {item.phone && (
              <View style={{ marginTop: spacing.xs }}>
                <PhoneField label="Telefon" phone={item.phone} />
              </View>
            )}
            {item.email && (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: spacing.xs }}>
                {item.email}
              </Text>
            )}
            <Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.inkFaint, marginTop: spacing.xs }}>
              Cerut pe {formatDate(item.createdAt)}
            </Text>

            {rejectingId === item.id ? (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <Field label="Motiv (opțional)" value={rejectReason} onChangeText={setRejectReason} placeholder="ex. nu face parte din echipă" />
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Confirmă respingerea" variant="danger" loading={busyId === item.id} onPress={() => reject(item.id)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Renunță" variant="secondary" onPress={() => { setRejectingId(null); setRejectReason(""); }} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Aprobă" loading={busyId === item.id} onPress={() => approve(item.id)} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Respinge" variant="secondary" onPress={() => setRejectingId(item.id)} />
                </View>
              </View>
            )}
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}
