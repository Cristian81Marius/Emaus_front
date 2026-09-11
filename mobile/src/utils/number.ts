/** Interpretează "2,78" sau "2.78" identic (utilizatorii români tastează virgulă ca
 * separator zecimal, dar codul/JSON-ul vrea punct) — folosit la orice preț introdus
 * manual (BOB: prețuri de articole, care se schimbă de la o lună la alta). `0` dacă
 * textul nu se poate interpreta deloc. */
export function parseDecimal(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}
