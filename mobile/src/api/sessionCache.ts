// Cache simplu, per sesiune (în memorie, nu persistă — dispare la reload/logout) —
// pentru date care nu se schimbă des dar sunt cerute des (config de meniu, lista de
// utilizatori pentru pickere). NU pentru date live (proprietăți cu status de unități,
// solicitări, notificări) — alea trebuie mereu proaspete, cache-uite greșit ar
// însemna să arătăm stări vechi după o acțiune. Vezi mobile/CLAUDE.md pentru care
// rută e pe listă și de ce.
const store = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

/** `fetcher` rulează o singură dată per `key`, cât ține sesiunea — apelurile
 * ulterioare (inclusiv cele simultane, cât timp primul încă n-a răspuns) primesc
 * aceeași valoare, fără cerere nouă. */
export function cachedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (store.has(key)) return Promise.resolve(store.get(key) as T);
  if (inFlight.has(key)) return inFlight.get(key) as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      store.set(key, data);
      inFlight.delete(key);
      return data;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
}

/** Apelat din AuthContext la logout — o sesiune nouă (poate alt utilizator) nu
 * moștenește cache-ul celei vechi. */
export function clearSessionCache(): void {
  store.clear();
  inFlight.clear();
}
