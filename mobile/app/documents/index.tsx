import React, { useState } from "react";
import { Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { DOCUMENTS, DocumentInfo, DocumentKey } from "../../src/documents/registry";
import { downloadAndSharePdf, generatePlaceholderPdf } from "../../src/documents/pdf";
import { useThemeColors, fonts, spacing } from "../../src/theme/tokens";

const HOUSING_CONTRACT_BLANK_PATH = "/api/documents/housing-contract/blank";

/** Documente utile Emaus — contracte/formulare. Cele cu fișier real (`hasRealFile`,
 * vezi src/documents/registry.ts) se descarcă de pe backend; restul generează un PDF
 * placeholder pe loc (src/documents/pdf.ts), ca lista să nu fie goală.
 *
 * Contractul de cazare (AcroForm, completat cu semnătură) e o acțiune separată, mai
 * sus în listă — nu un simplu download, ci un formular întreg (app/documents/
 * housing-contract.tsx), de-aia nu e modelat ca o intrare oarecare din DOCUMENTS.
 * Diferit de vechiul buton "Generează contract" din app/bookings/[id].tsx, care rămâne
 * neschimbat: acela generează alt document (textul legal complet al "Contractului de
 * acordare a servicii sociale", per solicitare/cazare concretă). */
export default function DocumentsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<DocumentKey | null>(null);
  const [downloadingBlank, setDownloadingBlank] = useState(false);
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

  const downloadBlankContract = async () => {
    setDownloadingBlank(true);
    setError(null);
    try {
      await downloadAndSharePdf(
        HOUSING_CONTRACT_BLANK_PATH,
        "contract-cazare-necompletat.pdf",
        "Contract de cazare (necompletat)"
      );
    } catch {
      setError("Nu am putut descărca contractul necompletat.");
    } finally {
      setDownloadingBlank(false);
    }
  };

  return (
    <ScreenContainer tabBar header>
      <Stack.Screen options={{ headerShown: true, title: "Documente utile" }} />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      <View style={{ gap: spacing.md }}>
        <Card>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink }}>Contract de cazare</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft, marginTop: 2 }}>
            Completează contractul unui beneficiar (poți alege unul salvat sau introduce datele manual), adaugă
            opțional semnătura și exportă PDF-ul. Sau descarcă formularul gol, de printat și completat de mână.
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Completează contractul" onPress={() => router.push("/documents/housing-contract")} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Descarcă necompletat"
                variant="secondary"
                loading={downloadingBlank}
                onPress={downloadBlankContract}
              />
            </View>
          </View>
        </Card>

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
