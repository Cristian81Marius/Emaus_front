// Registrul documentelor utile (Emaus) — nu BOB, cerut explicit așa. Fiecare document
// are un fișier PDF real, ADUS de utilizator — până atunci, `hasRealFile: false` și
// ecranele generează un PDF placeholder pe loc (vezi generatePlaceholder.ts), ca lista
// să nu fie goală și fluxul să fie testabil dinainte de-a primi fișierele reale.
//
// Când vine un PDF real: pune-l în assets/documents/<file>.pdf, adaugă
// `require("../../assets/documents/<file>.pdf")` la intrarea respectivă ca `asset`, și
// schimbă `hasRealFile: true` — ecranele deja verifică flagul ăsta, nu mai e nimic
// altceva de umblat.
// Contractul de cazare NU mai e aici — are acum textul legal real, generat de server
// din datele unei cazări concrete (`GET /api/bookings/{id}/contract`), și se generează
// din butonul "Generează contract" de pe app/bookings/[id].tsx, nu dintr-o listă
// generică de documente placeholder. Vezi src/documents/pdf.ts → downloadAndSharePdf.
export type DocumentKey = "volunteerContract" | "taxRedirect230";

export interface DocumentInfo {
  key: DocumentKey;
  title: string;
  description: string;
  hasRealFile: boolean;
}

export const DOCUMENTS: DocumentInfo[] = [
  {
    key: "volunteerContract",
    title: "Contract de voluntariat",
    description: "Contractul standard semnat de fiecare voluntar.",
    hasRealFile: false,
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
