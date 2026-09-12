import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Card } from "../../src/components/Card";
import { Field } from "../../src/components/Field";
import { DatePicker } from "../../src/components/DatePicker";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { PhoneActions } from "../../src/components/PhoneActions";
import { SignaturePad, SignaturePadHandle } from "../../src/components/SignaturePad";
import { api, ApiError } from "../../src/api/client";
import { BeneficiaryDto, HousingContractFillRequest, PagedResult } from "../../src/api/types";
import { fillHousingContractAndShare, generateFilledPdf, BASE_STYLE } from "../../src/documents/pdf";
import { useAuth } from "../../src/state/AuthContext";
import { useApiMode } from "../../src/state/ApiModeContext";
import { useThemeColors, fonts, spacing, radius, ThemeColors } from "../../src/theme/tokens";

function isoParts(iso: string): { day: string; month: string; year: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return {
    day: String(Number(d)),
    month: date.toLocaleDateString("ro-RO", { month: "long" }),
    year: y,
  };
}

function isoToDots(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}.${mo}.${y}`;
}

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** Randare locală (modul mock) — imită contractul completat, ca fluxul să rămână
 * testabil fără backend real (la fel ca mockContractHtml din app/bookings/[id].tsx,
 * pentru celălalt tip de contract). În modul "real", PDF-ul vine gata completat din
 * template-ul AcroForm, prin fillHousingContractAndShare(). */
function mockHousingContractHtml(payload: HousingContractFillRequest): string {
  const row = (label: string, value?: string) => `<div class="field"><b>${label}:</b> ${value || "—"}</div>`;
  return `
    <html><head>${BASE_STYLE}</head><body>
      <h1>Contract de cazare (completat)</h1>
      <div class="meta">Asociația Emaus</div>
      <div class="placeholder-note">
        Modul mock nu are template-ul PDF real (AcroForm) — server-ul real completează
        fișierul original la <code>POST /api/documents/housing-contract/fill</code>.
        Aici e doar un rezumat al datelor introduse, ca fluxul să fie testabil.
      </div>
      ${row("Nume beneficiar", payload.numeCompletBenef)}
      ${row("Telefon beneficiar", payload.telefonBenef)}
      ${row("CI serie/număr", `${payload.seria || "—"} ${payload.numar || ""}`)}
      ${row("Adresă", payload.adresa)}
      ${row("Localitate", payload.localitate)}
      ${row("Județ", payload.judet)}
      ${row("Persoană de contact", payload.numeContactUrgenta)}
      ${row("Telefon contact", payload.telefonContactUrgenta)}
      ${row("Responsabil cazare", payload.numeResponsabilCazare)}
      ${row("Început cazare", [payload.ziuaInceput, payload.lunaInceput, payload.anInceput].filter(Boolean).join(" "))}
      ${row("Sfârșit cazare", [payload.ziSfarsit, payload.lunaSfarsit, payload.anSfarsit].filter(Boolean).join(" "))}
      ${row("Locația cazării", payload.locatiaCazarii)}
      ${row("Data semnării", payload.dataCazarii)}
      ${
        payload.signaturePngBase64
          ? `<div class="signature-box">
              <img src="${payload.signaturePngBase64}" />
              <div class="signature-label">Semnătura beneficiarului</div>
            </div>`
          : `<div class="field"><b>Semnătură:</b> fără semnătură (câmp lăsat gol)</div>`
      }
    </body></html>
  `;
}

/** Completare contract de cazare — accesat din tab-ul Documente (nu mai e legat de o
 * solicitare/cazare anume, ca vechiul buton "Generează contract" din
 * app/bookings/[id].tsx, care rămâne neschimbat: acela generează alt document, textul
 * legal complet al "Contractului de acordare a servicii sociale", per cazare). Aici
 * completăm direct template-ul PDF real (AcroForm, vezi backend
 * HousingContractPdfService) — poate porni de la un beneficiar salvat (prin căutare,
 * la fel ca la o solicitare nouă) sau complet manual. Toate câmpurile sunt opționale —
 * alegerea unui beneficiar doar pre-completează, nu blochează editarea sau trimiterea
 * cu câmpuri goale. */
export default function HousingContractScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const { apiMode } = useApiMode();
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BeneficiaryDto[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [idSeries, setIdSeries] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [county, setCounty] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [caseManager, setCaseManager] = useState(user?.fullName ?? "");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [contractDate, setContractDate] = useState(todayIso());

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selected) return;
    const handle = setTimeout(async () => {
      if (!search.trim()) {
        setResults(null);
        return;
      }
      setSearching(true);
      try {
        const page = await api.get<PagedResult<BeneficiaryDto>>(`/api/beneficiaries?search=${encodeURIComponent(search.trim())}`);
        setResults(page.items);
      } catch {
        setResults(null);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [search, selected]);

  const applyBeneficiary = (b: BeneficiaryDto) => {
    setSelected({ id: b.id, name: b.fullName });
    setFullName(b.fullName);
    setPhone(b.phone ?? "");
    setIdSeries(b.idCardSeries ?? "");
    setIdNumber(b.idCardNumber ?? "");
    setAddress(b.address ?? "");
    setLocality(b.localityFreeText ?? b.localityName ?? "");
    setContactName(b.supportPersonName ?? "");
    setContactPhone(b.supportPersonPhone ?? "");
  };

  const clearBeneficiary = () => {
    setSelected(null);
    setSearch("");
    setResults(null);
  };

  const onSubmit = async () => {
    setError(null);
    // Opțională — dacă nu s-a desenat nimic (sau canvasul n-a apucat să se încarce),
    // continuăm fără semnătură, nu blocăm exportul (vezi SignaturePad.capture()).
    const signature = await signaturePadRef.current?.capture();

    const start = isoParts(startDate);
    const end = isoParts(endDate);
    const payload: HousingContractFillRequest = {
      numeCompletBenef: fullName.trim() || undefined,
      completNameBenef: fullName.trim() || undefined,
      telefonBenef: phone.trim() || undefined,
      seria: idSeries.trim() || undefined,
      numar: idNumber.trim() || undefined,
      adresa: address.trim() || undefined,
      localitate: locality.trim() || undefined,
      judet: county.trim() || undefined,
      numeContactUrgenta: contactName.trim() || undefined,
      telefonContactUrgenta: contactPhone.trim() || undefined,
      numeResponsabilCazare: caseManager.trim() || undefined,
      ziuaInceput: start?.day,
      lunaInceput: start?.month,
      anInceput: start?.year,
      ziSfarsit: end?.day,
      lunaSfarsit: end?.month,
      anSfarsit: end?.year,
      locatiaCazarii: location.trim() || undefined,
      dataCazarii: contractDate ? isoToDots(contractDate) : undefined,
      signaturePngBase64: signature ?? undefined,
    };

    setSubmitting(true);
    try {
      if (apiMode === "mock") {
        await generateFilledPdf(mockHousingContractHtml(payload), "Contract de cazare");
      } else {
        await fillHousingContractAndShare(payload, "contract-cazare.pdf", "Contract de cazare");
      }
      router.back();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Nu am putut genera contractul.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: "Contract de cazare" }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkFaint }}>
            Beneficiar salvat (opțional)
          </Text>
          {selected ? (
            <View style={styles.rowBetween}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginTop: 2 }}>{selected.name}</Text>
              <Pressable onPress={clearBeneficiary}>
                <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 13 }}>Schimbă</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <Field label="Caută după nume sau telefon" value={search} onChangeText={setSearch} placeholder="ex. Popescu sau 0722…" />
              {searching && <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 }}>Caut…</Text>}
              {results?.length === 0 && (
                <Text style={{ color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 }}>
                  Niciun rezultat — poți completa și manual câmpurile de mai jos.
                </Text>
              )}
              {results?.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => applyBeneficiary(b)}
                  style={[styles.resultRow, { borderColor: colors.line, backgroundColor: colors.surface }]}
                >
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.ink }}>{b.fullName}</Text>
                  {b.phone ? (
                    <PhoneActions phone={b.phone} textStyle={{ fontFamily: fonts.mono, fontSize: 12 }} />
                  ) : (
                    <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.inkFaint }}>fără telefon</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <SectionTitle colors={colors}>Beneficiar</SectionTitle>
          <Field label="Nume complet (opțional)" value={fullName} onChangeText={setFullName} />
          <Field label="Telefon (opțional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={styles.row2}>
            <View style={styles.col}>
              <Field label="Serie CI (opțional)" value={idSeries} onChangeText={setIdSeries} autoCapitalize="characters" />
            </View>
            <View style={styles.col}>
              <Field label="Număr CI (opțional)" value={idNumber} onChangeText={setIdNumber} keyboardType="number-pad" />
            </View>
          </View>
          <Field label="Adresă (opțional)" value={address} onChangeText={setAddress} />
          <View style={styles.row2}>
            <View style={styles.col}>
              <Field label="Localitate (opțional)" value={locality} onChangeText={setLocality} />
            </View>
            <View style={styles.col}>
              <Field label="Județ (opțional)" value={county} onChangeText={setCounty} />
            </View>
          </View>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <SectionTitle colors={colors}>Contact și responsabil</SectionTitle>
          <Field label="Persoană de contact (opțional)" value={contactName} onChangeText={setContactName} />
          <Field label="Telefon persoană de contact (opțional)" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
          <Field label="Responsabil cazare / voluntar (opțional)" value={caseManager} onChangeText={setCaseManager} />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <SectionTitle colors={colors}>Perioada de cazare</SectionTitle>
          <DatePicker label="Început (opțional)" value={startDate} onChange={setStartDate} optional />
          <DatePicker label="Sfârșit (opțional)" value={endDate} onChange={setEndDate} optional />
          <Field label="Locația cazării (opțional)" value={location} onChangeText={setLocation} placeholder="ex. Casa Emaus" />
          <DatePicker label="Data semnării" value={contractDate} onChange={setContractDate} />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <SectionTitle colors={colors}>Semnătura beneficiarului (opțional)</SectionTitle>
          <SignaturePad ref={signaturePadRef} />
        </Card>

        {error && <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium }}>{error}</Text>}

        <PrimaryButton label="Generează și exportă PDF" onPress={onSubmit} loading={submitting} />
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionTitle({ children, colors }: { children: React.ReactNode; colors: ThemeColors }) {
  return <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink }}>{children}</Text>;
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row2: { flexDirection: "row", gap: spacing.sm },
  col: { flex: 1 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
