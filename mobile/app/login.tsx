import React, { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { ChipPicker } from "../src/components/ChipPicker";
import { EmausMark } from "../src/components/EmausMark";
import { useAuth } from "../src/state/AuthContext";
import { useApiMode } from "../src/state/ApiModeContext";
import { useThemeColors, fonts, spacing, radius } from "../src/theme/tokens";
import { ApiError, ApiMode } from "../src/api/client";

const API_MODE_OPTIONS: { value: ApiMode; label: string }[] = [
  { value: "mock", label: "Date mock" },
  { value: "real", label: "Backend real" },
];

export default function LoginScreen() {
  const { user, isLoading, login } = useAuth();
  const { apiMode, setApiMode } = useApiMode();
  const colors = useThemeColors();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return null;
  if (user) return <Redirect href="/" />;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nu ne-am putut conecta la server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <ScreenContainer style={styles.centered}>
          <View style={styles.brandRow}>
            <EmausMark size={30} />
            <Text style={[styles.wordmark, { color: colors.ink }]}>EMAUS</Text>
          </View>
          <Text style={[styles.eyebrow, { color: colors.accentInk }]}>Voluntari & nucleu</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Bun venit înapoi</Text>
          <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
            Intră cu numărul de telefon sau emailul și parola primite de la nucleu.
          </Text>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint, marginBottom: spacing.xs }}>
              Sursă date
            </Text>
            <ChipPicker options={API_MODE_OPTIONS} value={apiMode} onChange={setApiMode} />
          </View>

          <TextInput
            placeholder="Telefon sau email"
            placeholderTextColor={colors.inkFaint}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.surface }]}
          />
          <TextInput
            placeholder="Parolă"
            placeholderTextColor={colors.inkFaint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.surface }]}
          />

          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          <PrimaryButton
            label="Intră în cont"
            onPress={onSubmit}
            loading={submitting}
            disabled={!identifier || !password}
          />

          <Pressable onPress={() => router.push("/register")} style={{ marginTop: spacing.md, alignItems: "center" }}>
            <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>Cere acces</Text>
          </Pressable>

          <Text style={[styles.hint, { color: colors.inkFaint }]}>
            {apiMode === "mock" ? "Conturi de test (date mock, vezi mobile/CLAUDE.md)" : "Conturi de test (seed-uite în baza reală, vezi docs/SEED_DATA.md)"}
            {"\n"}
            Nucleu: 0700000000 sau alexandra@emaus.ro / Emaus2026!{"\n"}
            Voluntar: 0711111111 / Emaus2026!
          </Text>
        </ScreenContainer>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { justifyContent: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  wordmark: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1.5 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontFamily: fonts.display, fontSize: 30, marginTop: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: 15, marginTop: spacing.xs, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  hint: { fontFamily: fonts.mono, fontSize: 11.5, textAlign: "center", marginTop: spacing.lg },
});
