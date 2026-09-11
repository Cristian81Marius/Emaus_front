import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { EmausMark } from "../src/components/EmausMark";
import { PinPad } from "../src/components/PinPad";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAuth } from "../src/state/AuthContext";
import { useDeviceLock } from "../src/state/DeviceLockContext";
import { useThemeColors, fonts, spacing } from "../src/theme/tokens";

/** Ecranul de deblocare — apare o dată, la fiecare pornire rece a aplicației, doar
 * dacă utilizatorul a asociat dispozitivul cu un cod PIN și/sau Face ID/amprentă
 * (din Meniu → Securitate dispozitiv). Sesiunea (token-ul) tot există în memorie de
 * la AuthContext — asta doar blochează navigarea până la deblocare, ca pe orice
 * aplicație bancară/de plăți. "Ieși din cont" e ieșirea de urgență dacă cineva a
 * uitat codul — reintră cu telefon+parolă. */
export default function UnlockScreen() {
  const colors = useThemeColors();
  const { user, logout } = useAuth();
  const { hasPin, biometricEnabled, verifyPin, authenticateWithBiometrics, markUnlocked, forgetDevice } = useDeviceLock();

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [triedBiometricOnce, setTriedBiometricOnce] = useState(false);

  const tryBiometrics = async () => {
    setError(null);
    const ok = await authenticateWithBiometrics();
    if (ok) markUnlocked();
  };

  useEffect(() => {
    if (biometricEnabled && !triedBiometricOnce) {
      setTriedBiometricOnce(true);
      void tryBiometrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricEnabled]);

  const onPinComplete = async (candidate: string) => {
    const ok = await verifyPin(candidate);
    if (ok) {
      markUnlocked();
    } else {
      setError("Cod greșit.");
      setPin("");
    }
  };

  return (
    <ScreenContainer style={styles.centered}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <EmausMark size={36} />
        <Text style={[styles.title, { color: colors.ink }]}>Bun venit înapoi{user ? `, ${user.fullName.split(" ")[0]}` : ""}</Text>
        {hasPin && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 2 }}>Introdu codul PIN</Text>}
      </View>

      {biometricEnabled && (
        <View style={{ marginBottom: spacing.lg }}>
          <PrimaryButton label="Deblochează cu Face ID / amprentă" variant="secondary" onPress={tryBiometrics} />
        </View>
      )}

      {hasPin && (
        <View style={{ marginBottom: spacing.xl }}>
          <PinPad value={pin} onChange={setPin} onComplete={onPinComplete} />
          {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium, textAlign: "center", marginTop: spacing.md }}>{error}</Text>}
        </View>
      )}

      <PrimaryButton
        label="Ieși din cont"
        variant="secondary"
        onPress={() => {
          // Ieșirea de urgență dacă cineva a uitat codul/nu poate folosi Face ID —
          // uită și blocarea de dispozitiv, altfel la reautentificare AuthGate tot
          // te-ar trimite înapoi la /unlock (hasPin/biometricEnabled persistă separat
          // de sesiune). Reintri cu telefon/email+parolă, fără PIN/Face ID cerut.
          void forgetDevice();
          void logout();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center" },
  header: { alignItems: "center", marginBottom: spacing.xl },
  title: { fontFamily: fonts.display, fontSize: 22, marginTop: spacing.sm, textAlign: "center" },
});
