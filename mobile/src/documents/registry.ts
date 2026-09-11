// Registrul documentelor utile (Emaus) — nu BOB, cerut explicit așa. Fiecare document
// are fie un fișier PDF real, servit static de backend (`hasRealFile: true` +
// `downloadPath`), fie, până vine fișierul real, `hasRealFile: false` — ecranul
// generează atunci un PDF placeholder pe loc (vezi pdf.ts → generatePlaceholderPdf),
// ca lista să nu fie goală și fluxul să fie testabil dinainte de-a avea fișierul.
//
// Fișierele reale sunt statice (fără date personale — formulare goale de completat),
// deci stau în backend/src/Emaus.Api/wwwroot/documents/ (servite via app.UseStaticFiles(),
// vezi Program.cs) și se descarcă cu downloadAndSharePdf() din pdf.ts — la fel ca
// contractul de cazare, dar fără autorizare, fiindcă nu sunt personalizate per-user. Asta
// evită să bundle-uim binare în aplicație (ar cere build+resubmisie Play Store la orice
// corectură de text) — un `git push` pe backend e suficient ca să înlocuiești fișierul.
//
// Contractul de cazare NU e aici — are text legal real, generat de server din datele
// unei cazări concrete (`GET /api/bookings/{id}/contract`), din butonul "Generează
// contract" de pe app/bookings/[id].tsx, nu dintr-o listă generică de documente.
export type DocumentKey = "volunteerContract" | "taxRedirect230";

export interface DocumentInfo {
  key: DocumentKey;
  title: string;
  description: string;
  hasRealFile: boolean;
  /** Calea de pe backend (ex. `/documents/contract-voluntariat.pdf`) — prezentă doar
   * când `hasRealFile` e true. */
  downloadPath?: string;
}

export const DOCUMENTS: DocumentInfo[] = [
  {
    key: "volunteerContract",
    title: "Contract de voluntariat",
    description: "Contractul standard semnat de fiecare voluntar.",
    hasRealFile: true,
    downloadPath: "/documents/contract-voluntariat.pdf",
  },
  {
    key: "taxRedirect230",
    title: "Direcționare 3,5% impozit",
    description: "Formularul prin care cineva redirecționează 3,5% din impozitul pe venit către asociație.",
    hasRealFile: false,
  },
];

export function getDocument(key: DocumentKey): DocumentInfo {
  const doc = DOCUMENTS.find((d) => d.key === key);
  if (!doc) throw new Error(`Document necunoscut: ${key}`);
  return doc;
}
