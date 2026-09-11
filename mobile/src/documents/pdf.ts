import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { getApiBaseUrl, getAuthToken } from "../api/client";

/** Un singur stil comun pentru orice PDF generat aici — placeholder sau contractul
 * completat — ca toate documentele generate din aplicație să arate consecvent. */
const BASE_STYLE = `
  <style>
    body { font-family: -apple-system, Roboto, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
    .placeholder-note { background: #fff3cd; border: 1px solid #e0c25a; border-radius: 6px; padding: 12px; margin-bottom: 24px; font-size: 13px; }
    .field { margin-bottom: 10px; font-size: 14px; }
    .field b { display: inline-block; min-width: 160px; }
    .signature-box { margin-top: 40px; }
    .signature-box img { max-width: 280px; border-bottom: 1px solid #999; }
    .signature-label { font-size: 12px; color: #666; margin-top: 4px; }
  </style>
`;

function placeholderHtml(title: string): string {
  return `
    <html><head>${BASE_STYLE}</head><body>
      <h1>${title}</h1>
      <div class="meta">Asociația Emaus</div>
      <div class="placeholder-note">
        Acesta e un document PLACEHOLDER — textul real al documentului nu a fost încă
        încărcat în aplicație. Înlocuiește-l cu fișierul PDF real cât mai curând.
      </div>
    </body></html>
  `;
}

/** `expo-print` are suport diferit pe web față de nativ: `printToFileAsync` (generează
 * un fișier PDF adevărat, de partajat) nu e disponibil pe web — acolo singura opțiune
 * e `printAsync`, care deschide dialogul de printare al browserului ("Salvează ca
 * PDF" e o opțiune acolo, dar nu obținem un fișier direct de partajat din cod).
 * Restul aplicației nu trebuie să știe de diferența asta — apelează doar
 * `renderPdf()`/`generatePlaceholderPdf()` de mai jos. */
async function renderPdf(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, { dialogTitle, mimeType: "application/pdf" });
  }
}

/** Generează (și deschide/distribuie) un PDF placeholder de-o pagină, pentru un
 * document care încă n-a fost trimis (vezi registry.ts → `hasRealFile: false`) — doar
 * ca lista de documente să nu fie goală și fluxul să fie testabil dinainte de-a avea
 * fișierul real. */
export async function generatePlaceholderPdf(title: string): Promise<void> {
  await renderPdf(placeholderHtml(title), title);
}

/** Generează (și deschide/distribuie) un PDF dintr-un HTML oarecare — folosit pentru
 * rezumatul de contract generat local în modul mock (vezi mockContractHtml din
 * app/bookings/[id].tsx; în modul real, contractul vine gata generat de server, prin
 * downloadAndSharePdf() de mai jos). */
export async function generateFilledPdf(html: string, dialogTitle: string): Promise<void> {
  await renderPdf(html, dialogTitle);
}

/** Descarcă un PDF deja generat de server (ex. contractul real de cazare, vezi
 * `GET /api/bookings/{id}/contract`) și îl deschide/partajează — spre deosebire de
 * `renderPdf()` de mai sus, aici doar mutăm bytes de la server către dispozitiv, nu
 * generăm noi HTML. `api.get<T>()` din client.ts presupune JSON și nu merge pentru
 * `application/pdf`, de-aia un fetch separat, cu același header Authorization pe care
 * `client.ts` îl pune la cererile reale. */
export async function downloadAndSharePdf(path: string, filename: string, dialogTitle: string): Promise<void> {
  const url = `${getApiBaseUrl()}${path}`;
  const token = getAuthToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  if (Platform.OS === "web") {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Descărcarea a eșuat (${response.status}).`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const destination = new File(Paths.cache, filename);
  const file = await File.downloadFileAsync(url, destination, { headers, idempotent: true });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(file.uri, { dialogTitle, mimeType: "application/pdf" });
  }
}

export { BASE_STYLE };
