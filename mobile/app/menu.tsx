import React, { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { Card } from "../src/components/Card";
import { EmausMark } from "../src/components/EmausMark";
import { Field } from "../src/components/Field";
import { ChipPicker } from "../src/components/ChipPicker";
import { PinPad } from "../src/components/PinPad";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAuth } from "../src/state/AuthContext";
import { useDeviceLock } from "../src/state/DeviceLockContext";
import { ThemePreference, useThemePreference } from "../src/state/ThemeContext";
import { ActiveProject, useProject } from "../src/state/ProjectContext";
import { api, ApiError } from "../src/api/client";
import { cachedGet } from "../src/api/sessionCache";
import { MenuConfigDto, MenuSectionDto } from "../src/api/types";
import { useThemeColors, fonts, spacing } from "../src/theme/tokens";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Ca sistemul" },
  { value: "light", label: "Luminos" },
  { value: "dark", label: "Întunecat" },
];

const PROJECT_OPTIONS: { value: ActiveProject; label: string }[] = [
  { value: "emaus", label: "Emaus" },
  { value: "bob", label: "Box of Blessing" },
];

/** Al 4-lea tab din bara de jos ("•••") — gestiunea personală (nume, temă) sus, restul
 * secțiunilor aplicației (Beneficiari, Mentenanță, Activități, Notificări) mai jos,
 * ca lista de taburi să rămână la 4, ușor de urmărit, fără să pierdem accesul la
 * celelalte ecrane. Secțiunile de mai jos vin din `GET /api/menu` (vezi
 * mobile/CLAUDE.md) — dacă backend-ul schimbă ce pagini apar aici, ecranul se
 * actualizează singur, fără update de aplicație. */
export default function MenuScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, logout, updateDisplayName } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const { activeProject, setActiveProject } = useProject();
  const {
    hasPin,
    biometricAvailable,
    biometricEnabled,
    setBiometricEnabled,
    setupPin,
    disablePin,
    forgetDevice,
  } = useDeviceLock();

  const [name, setName] = useState(user?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [sections, setSections] = useState<MenuSectionDto[]>([]);

  const [pinStage, setPinStage] = useState<"idle" | "enter" | "confirm">("idle");
  const [pinDraft, setPinDraft] = useState("");
  const [pinFirstEntry, setPinFirstEntry] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const startPinSetup = () => {
    setPinStage("enter");
    setPinDraft("");
    setPinFirstEntry("");
    setPinError(null);
  };

  const cancelPinSetup = () => {
    setPinStage("idle");
    setPinDraft("");
    setPinFirstEntry("");
    setPinError(null);
  };

  const onPinFirstEntryComplete = (pin: string) => {
    setPinFirstEntry(pin);
    setPinDraft("");
    setPinStage("confirm");
  };

  const onPinConfirmComplete = async (pin: string) => {
    if (pin !== pinFirstEntry) {
      setPinError("Codurile nu coincid — încearcă din nou.");
      setPinDraft("");
      setPinFirstEntry("");
      setPinStage("enter");
      return;
    }
    await setupPin(pin);
    cancelPinSetup();
  };

  useFocusEffect(
    useCallback(() => {
      cachedGet(`menu:${activeProject}`, () => api.get<MenuConfigDto>(`/api/menu?project=${activeProject}`))
        .then((config) => setSections(config.moreSections))
        .catch(() => {});
    }, [activeProject])
  );

  const onSaveName = async () => {
    if (!name.trim()) return;
    setNameError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateDisplayName(name.trim());
      setSaved(true);
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : "Numele nu a putut fi salvat.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Meniu", animation: "fade" }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={styles.brandRow}>
          <EmausMark size={24} />
          <Text style={[styles.title, { color: colors.ink }]}>Meniu</Text>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Profil</Text>
          <Field
            label="Nume afișat"
            value={name}
            onChangeText={(v) => {
              setName(v);
              setSaved(false);
            }}
            placeholder="Numele tău"
          />
          {nameError && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: spacing.xs }}>{nameError}</Text>}
          {saved && !nameError && (
            <Text style={{ color: colors.ok, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: spacing.xs }}>Numele a fost salvat.</Text>
          )}
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton label="Salvează numele" onPress={onSaveName} loading={saving} disabled={!name.trim() || name.trim() === user?.fullName} />
          </View>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <InfoRow label="Telefon" value={user?.phone ?? "—"} />
            <InfoRow label="Rol" value={user?.role === "Nucleus" ? "Nucleus" : "Voluntar"} />
          </View>
        </Card>

        {sections.map((section) => (
          <Card key={section.title} style={{ padding: 0, overflow: "hidden" }}>
            <Text style={[styles.sectionTitle, { color: colors.ink, padding: spacing.lg, paddingBottom: spacing.sm }]}>{section.title}</Text>
            {section.items.map((item, i) => (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.href)}
                style={[styles.menuRow, { borderTopColor: colors.line, borderTopWidth: i === 0 ? StyleSheet.hairlineWidth : StyleSheet.hairlineWidth }]}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={[styles.menuLabel, { color: colors.ink }]}>{item.label}</Text>
                <Text style={{ color: colors.inkFaint, fontSize: 18 }}>›</Text>
              </Pressable>
            ))}
          </Card>
        ))}

        {user?.role === "Nucleus" && (
          // Hardcodat aici, NU în moreSections dinamic — reachability garantată
          // indiferent ce conține meniul servit de backend (nu controlăm dacă
          // backend-ul real a fost deja actualizat cu intrarea asta). Vezi
          // app/users/pending.tsx.
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <Pressable onPress={() => router.push("/users/pending")} style={[styles.menuRow, { borderTopColor: colors.line }]}>
              <Text style={styles.menuIcon}>🆕</Text>
              <Text style={[styles.menuLabel, { color: colors.ink }]}>Cereri de acces</Text>
              <Text style={{ color: colors.inkFaint, fontSize: 18 }}>›</Text>
            </Pressable>
          </Card>
        )}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: spacing.xs }]}>Proiect</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginBottom: spacing.sm }}>
            Ce parte a aplicației vezi — restul (profil, aspect, securitate) rămâne neschimbat.
          </Text>
          <ChipPicker options={PROJECT_OPTIONS} value={activeProject} onChange={setActiveProject} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: spacing.xs }]}>Aspect</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginBottom: spacing.sm }}>
            Alege cum arată aplicația pe acest dispozitiv.
          </Text>
          <ChipPicker options={THEME_OPTIONS} value={preference} onChange={setPreference} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: spacing.xs }]}>Securitate dispozitiv</Text>
          {Platform.OS === "web" ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft }}>
              Codul PIN și Face ID/amprentă sunt disponibile doar în aplicația nativă, pe telefon — pe web sesiunea nu rămâne
              oricum salvată între vizite (vezi „Ieși din cont” de mai jos).
            </Text>
          ) : (
            <>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginBottom: spacing.sm }}>
                Deblochează aplicația rapid pe acest telefon, fără telefon și parolă de fiecare dată.
              </Text>

              {biometricAvailable && (
                <View style={styles.securityRow}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink }}>Face ID / amprentă</Text>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={setBiometricEnabled}
                    trackColor={{ false: colors.line, true: colors.accentTint }}
                    thumbColor={biometricEnabled ? colors.accent : colors.surface2}
                  />
                </View>
              )}

              {pinStage === "idle" && (
                <View style={styles.securityRow}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink }}>
                    {hasPin ? "Cod PIN activat" : "Niciun cod PIN"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: spacing.md }}>
                    <Pressable onPress={startPinSetup}>
                      <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>
                        {hasPin ? "Schimbă" : "Activează"}
                      </Text>
                    </Pressable>
                    {hasPin && (
                      <Pressable onPress={() => void disablePin()}>
                        <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>Dezactivează</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              {(pinStage === "enter" || pinStage === "confirm") && (
                <View style={{ marginTop: spacing.sm, alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.ink, marginBottom: spacing.md }}>
                    {pinStage === "enter" ? "Alege un cod PIN din 4 cifre" : "Confirmă codul PIN"}
                  </Text>
                  <PinPad value={pinDraft} onChange={setPinDraft} onComplete={pinStage === "enter" ? onPinFirstEntryComplete : onPinConfirmComplete} />
                  {pinError && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: spacing.sm }}>{pinError}</Text>}
                  <View style={{ marginTop: spacing.md }}>
                    <PrimaryButton label="Renunță" variant="secondary" onPress={cancelPinSetup} />
                  </View>
                </View>
              )}

              {(hasPin || biometricEnabled) && pinStage === "idle" && (
                <View style={{ marginTop: spacing.md }}>
                  <PrimaryButton label="Uită acest dispozitiv" variant="danger" onPress={() => void forgetDevice()} />
                </View>
              )}
            </>
          )}
        </Card>

        <PrimaryButton label="Ieși din cont" variant="secondary" onPress={logout} />
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>{label}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 22 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuIcon: { fontSize: 18, width: 24, textAlign: "center" },
  menuLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15 },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
});
