import React, { useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { DOCUMENTS, DocumentInfo, DocumentKey } from "../../src/documents/registry";
import { downloadAndSharePdf, generatePlaceholderPdf } from "../../src/documents/pdf";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

/** Documente utile Emaus — contracte/formulare. Cele cu fișier real (`hasRealFile`,
 * vezi src/documents/registry.ts) se descarcă de pe backend; restul generează un PDF
 * placeholder pe loc (src/documents/pdf.ts), ca lista să nu fie goală. Contractul de
 * cazare NU e aici — are text legal real, generat per-cazare din app/bookings/[id].tsx. */
export default function DocumentsScreen() {
  const colors = useThemeColors();
  const [busyKey, setBusyKey] = useState<DocumentKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openDocument = async (doc: DocumentInfo) => {
    setBusyKey(doc.key);
    setError(null);
    try {
      if (doc.hasRealFile && doc.downloadPath) {
        await downloadAndSharePdf(doc.downloadPath, `${doc.title}.pdf`, doc.title);
      } else {
        await generatePlaceholderPdf(doc.title);
      }
    } catch {
      setError("Nu am putut deschide documentul.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Documente utile" }} />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      <View style={{ gap: spacing.md }}>
        {DOCUMENTS.map((doc) => (
          <Card key={doc.key}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink }}>{doc.title}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft, marginTop: 2 }}>
              {doc.description}
            </Text>
            {!doc.hasRealFile && (
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.inkFaint, marginTop: spacing.xs }}>
                Placeholder — fișierul real nu a fost încă încărcat.
              </Text>
            )}

            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton
                label="Deschide"
                variant="secondary"
                loading={busyKey === doc.key}
                onPress={() => openDocument(doc)}
              />
            </View>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}
