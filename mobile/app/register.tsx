import React, { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, View, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { Field } from "../src/components/Field";
import { ChipPicker } from "../src/components/ChipPicker";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { EmausMark } from "../src/components/EmausMark";
import { api, ApiError } from "../src/api/client";
import { RegisterRequest, UserRole } from "../src/api/types";
import { useThemeColors, fonts, spacing } from "../src/theme/tokens";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "Volunteer", label: "Voluntar" },
  { value: "Nucleus", label: "Nucleus" },
];

/** "Cere acces" — auto-înregistrare, reachable din login.tsx cât timp NU ești logat
 * (vezi PUBLIC_ROUTES din app/_layout.tsx). Contul creat pornește PendingApproval —
 * NU logăm automat la succes (nu există cum, contul încă nu poate face login) — arătăm
 * doar o confirmare și lăsăm utilizatorul să reîncerce login-ul mai târziu, după ce un
 * Nucleus aprobă cererea (vezi app/users/pending.tsx). */
export default function RegisterScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Volunteer");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validationError = (): string | null => {
    if (!fullName.trim()) return "Numele e obligatoriu.";
    if (!phone.trim() && !email.trim()) return "Completează cel puțin telefonul sau emailul.";
    if (password.length < 6) return "Parola trebuie să aibă cel puțin 6 caractere.";
    return null;
  };

  const onSubmit = async () => {
    // Validăm și pe client — feedback imediat — dar backend-ul tot validează la fel,
    // nu presupunem că am prins noi tot (vezi docs/API.md §2).
    const clientError = validationError();
    if (clientError) {
      setError(clientError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const request: RegisterRequest = {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        password,
        requestedRole: role,
      };
      await api.post("/api/auth/register", request);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu ne-am putut conecta la server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <ScreenContainer style={styles.centered}>
        <Stack.Screen options={{ headerShown: true, title: "Cere acces" }} />
        <View style={styles.brandRow}>
          <EmausMark size={30} />
        </View>
        <Text style={[styles.title, { color: colors.ink }]}>Cererea a fost trimisă</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Un membru din Nucleu trebuie s-o aprobe — revino și încearcă să te loghezi mai
          târziu. Dacă încerci acum, primești un mesaj clar că cererea e încă în așteptare,
          nu e o eroare.
        </Text>
        <PrimaryButton label="Înapoi la login" onPress={() => router.replace("/login")} />
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <ScreenContainer>
          <Stack.Screen options={{ headerShown: true, title: "Cere acces" }} />
          <Text style={[styles.subtitle, { color: colors.inkSoft, marginTop: 0 }]}>
            Completează datele tale — un membru din Nucleu îți aprobă contul înainte să
            poți intra.
          </Text>

          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            <Field label="Nume și prenume" value={fullName} onChangeText={setFullName} />
            <Field
              label="Telefon (opțional dacă pui email)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Field
              label="Email (opțional dacă pui telefon)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <Field label="Parolă (min. 6 caractere)" value={password} onChangeText={setPassword} secureTextEntry />

            <View>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft, marginBottom: spacing.xs }}>
                Rol dorit
              </Text>
              <ChipPicker options={ROLE_OPTIONS} value={role} onChange={setRole} />
            </View>

            {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>{error}</Text>}

            <PrimaryButton label="Trimite cererea" onPress={onSubmit} loading={submitting} />
          </View>
        </ScreenContainer>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { justifyContent: "center" },
  brandRow: { alignItems: "center", marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 24, textAlign: "center" },
  subtitle: { fontFamily: fonts.body, fontSize: 14.5, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.lg },
});
