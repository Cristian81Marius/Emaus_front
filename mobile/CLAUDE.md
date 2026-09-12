# Note pentru asistentul AI — specific pentru `mobile/`

Citește întâi `../CLAUDE.md` (regulile de la rădăcina proiectului — sandbox, livrare
fișiere, convenții generale). Fișierul de-aici e completarea specifică folderului
`mobile/`: harta ecranelor, unde trăiește mock-ul de API, și cum umbli prin el fără
să re-explorezi tot arborele de fiecare dată.

## Stare curentă: comutator mock/real la RUNTIME, nu în cod (2026-09, backend-ul e implementat)

Backend-ul real (ASP.NET Core, `backend/`) e implementat — vezi `docs/API.md` +
`docs/SEED_DATA.md` pentru contract și date. Aplicația mobilă nu mai are un `const`
fix în cod care alege mock sau real — există un **comutator vizibil pe ecranul de
login** ("Sursă date": Date mock / Backend real), care schimbă asta din UI, persistat
pe dispozitiv (`src/state/ApiModeContext.tsx`, la fel ca `ThemeContext`/
`ProjectContext` — `SecureStore` pe nativ, `localStorage` pe web).

- **`src/api/client.ts`** — `apiMode: "mock" | "real"` (modul simplu, sincron, citit
  de `request()`) + `getApiMode()`/`setApiMode()`. Implicit `"mock"`. Fiecare ecran tot
  vorbește doar cu `api.*`, niciodată direct cu `fetch` — comutarea nu atinge ecranele.
- **`ApiModeProvider`** (`app/_layout.tsx`, în afara `AuthGate` — trebuie disponibil pe
  `/login`) sincronizează starea persistată în modulul de mai sus prin `setApiMode()`,
  exact ca `AuthContext` cu `setAuthToken()`. Nu citi `apiMode` direct dintr-un ecran —
  `useApiMode()`.
- **De ce pe ecranul de login, nu în Meniu**: modul trebuie ales ÎNAINTE de
  `POST /api/auth/login` — primul apel care contează, pentru că decide care server
  răspunde (mock sau `API_BASE_URL`). Meniu e reachable doar după autentificare.
- **`"real"`** trimite cereri HTTP adevărate către `API_BASE_URL` din `app.json` →
  `expo.extra.apiBaseUrl` (implicit `http://localhost:5017`; pe telefon fizic, IP-ul
  local al calculatorului, nu `localhost`). Backend-ul trebuie pornit separat
  (`cd backend/src/Emaus.Api && dotnet run`) — CORS e deja configurat în
  `appsettings.Development.json` pentru porturile web ale Expo (8081/19006/5173).
- **Conturile de test funcționează identic pe ambele moduri** — `DbSeeder.cs` seed-uie
  exact aceleași conturi/parole ca mock-ul (`Emaus2026!`), din `docs/SEED_DATA.md`.
- **Baza locală** (`backend/src/Emaus.Api/emaus.db`) tot folosește `EnsureCreated`, nu
  migrații — vezi capcana din `../CLAUDE.md` ("Capcanele bazei de date locale") dacă
  apar entități noi și schema nu se actualizează singură.

### Structura mock-ului (`src/api/mock/`)

- `data.ts` — "baza de date": utilizatori, locații+unități, beneficiari, solicitări,
  sesizări mentenanță, ture+rotație curățenie, oportunități, notificări. Toate în
  memorie, se resetează la fiecare repornire a serverului de dev (`npm run web`/`start`).
  Datele calendaristice (check-in/out, notificări) sunt relative la ziua curentă
  (`dateOffset(n)`, `dateTimeOffset(...)`), ca aplicația să arate mereu plauzibil,
  indiferent când o rulezi.
- `server.ts` — router-ul: un tabel de rute (`metodă` + `pattern` de tip
  `/api/bookings/:id/decide`) care oglindește exact `docs/API.md` (cine are voie —
  `nucleusOnly`, ce face). Erorile aruncă `MockApiError(status, mesaj)`, convertit în
  `ApiError` de `client.ts`, exact ca la un răspuns HTTP real (deci ecranele care fac
  `catch (err) { err instanceof ApiError ? ... }` se comportă identic).

**Ca să adaugi o rută nouă în mock:** adaugă o intrare în array-ul `routes` din
`server.ts`, cu `method`, `pattern`, opțional `nucleusOnly: true`, și `handler` care
citește/scrie direct în `db` din `data.ts`. Verifică întâi `docs/API.md` — regula deja
scrisă acolo (cine, ce payload) e sursa de-adevăr, nu inventa alta.

**Ca să adaugi/modifici scenarii vizuale** (mai multe cazări, alt status, alt beneficiar
blocat etc.): editează direct array-urile din `data.ts` — sunt date statice, ușor de
citit și de extins, fără nicio logică ascunsă.

### Conturi de test (mock)

Parola pentru toate: `Emaus2026!`.

| Telefon | Rol | Nume |
|---|---|---|
| `0700000000` | Nucleus | Alexandra |
| `0711111111` | Volunteer | David |

Restul voluntarilor din `data.ts` (Alina, Ligia, Ioana, Ștefan, Dominic, Ema, Sami,
Cristi, Rebeca, Elena, Miriam, Florentina, Diandra) au și ei conturi funcționale cu
aceeași parolă, doar că nu sunt scrise pe ecranul de login — utile dacă ai nevoie de mai
multe conturi Volunteer distincte într-un test.

Nucleus vede toate acțiunile administrative (aprobă/respinge/alocă/check-out cazări,
blochează beneficiari, asignează mentenanță, publică oportunități). Volunteer vede
varianta restrânsă — util să testezi ambele roluri când schimbi UI condiționat de
`user.role`.

### Datele mock sunt reale, nu inventate

`properties`, `beneficiaries`, `bookings`, `users` (numele) și `cleaningAssignments` din
`data.ts` vin din evidența reală a asociației (locații, ocupanți curenți, lista „în
așteptare”, rotația de curățenie, cine are cheile) — nu sunt un eșantion sintetic.
Excepție: `maintenanceTickets` și `opportunities` sunt exemple inventate (nu exista
evidență pentru ele), atașate totuși unor locații reale. Istoricul complet de cazări
(sute de rânduri per locație) nu e reintrodus rând-cu-rând — doar totalurile lui
(`PropertyDto.lifetimeStayDays`/`lifetimeBookingsCompleted`) sunt cele reale, plus un
eșantion de ~10 cazări încheiate pentru ca ecranele de istoric să nu fie goale.

Dacă utilizatorul mai trimite date reale (alte locații, alți beneficiari, actualizări),
extinde array-urile din `data.ts` după același tipar — nu re-scrie tot fișierul de la
zero, nici nu amesteca date reale cu nume inventate fără să spui limpede care-i care.

## Harta ecranelor (`app/`, expo-router — fiecare fișier e o rută)

| Rută | Ecran | Scop |
|---|---|---|
| `/login` | `login.tsx` | Autentificare telefon+parolă |
| `/` | `index.tsx` | Locații — listă adrese+unități, statusul curent, punct de intrare |
| `/property/[id]` | `property/[id].tsx` | Detaliu locație — status unități, cazat acum, + istoric consolidat de beneficiari pe toată locația (`PropertyHistory`, la finalul ecranului — nu mai e îngropat per-unitate). Titlul "Istoric beneficiari" e apăsabil și duce la `/beneficiaries?propertyId=...&propertyLabel=...` (lista de Beneficiari, filtrată DOAR pe beneficiarii cazați la locația curentă — vezi mai jos; decizie inversată 2026-09, inițial ducea la lista globală ca shortcut spre tab) |
| `/property/new` | `property/new.tsx` | Locație nouă — doar identitatea (adresă/etichetă/interfon/chei), Nucleus. Unitățile se adaugă după, de pe `property/[id].tsx` ("+ Adaugă unitate", tot Nucleus) |
| `/property/[id]/edit` | `property/[id]/edit.tsx` | Editează adresă/etichetă scurtă/observații/interfon/chei (Nucleus) + arhivează/reactivează locația (vezi mai jos) |
| `/bookings` | `bookings/index.tsx` | Listă solicitări, filtrabilă pe status |
| `/bookings/[id]` | `bookings/[id].tsx` | Detaliu solicitare — decide/alocă/check-out/anulează/comentarii |
| `/bookings/[id]/edit` | `bookings/[id]/edit.tsx` | Editează perioada solicitată (Nucleus, doar cât timp nu e încă alocată) |
| `/booking/new` | `booking/new.tsx` | Solicitare nouă — caută beneficiar existent sau creează unul |
| `/beneficiaries` | `beneficiaries/index.tsx` | Căutare/listă beneficiari, paginată (vezi mai jos) |
| `/beneficiaries/[id]` | `beneficiaries/[id].tsx` | Fișă beneficiar — contact, istoric, blochează/deblochează |
| `/beneficiaries/[id]/edit` | `beneficiaries/[id]/edit.tsx` | Editează datele beneficiarului (oricine, ca la creare) |
| `/beneficiaries/new` | `beneficiaries/new.tsx` | Beneficiar nou (fișă separată de "Solicitare nouă") |
| `/cleaning` | `cleaning/index.tsx` | Ture de curățenie + rotația responsabililor pe locație |
| `/maintenance` | `maintenance/index.tsx` | Sesizări mentenanță, filtrabile pe status |
| `/maintenance/new` | `maintenance/new.tsx` | Sesizare nouă |
| `/opportunities` | `opportunities/index.tsx` | Activități (etichetă UI — vezi mai jos) + înscriere |
| `/opportunities/new` | `opportunities/new.tsx` | Publică activitate nouă (Nucleus), cu opțiunea "Anunță toți voluntarii" |
| `/opportunities/[id]/edit` | `opportunities/[id]/edit.tsx` | Editează o activitate publicată (Nucleus) |
| `/notifications` | `notifications/index.tsx` | Notificările proprii, cu link direct la solicitarea legată |
| `/menu` | `menu.tsx` | Al 4-lea tab ("•••") — profil (nume, temă) + restul paginilor |
| `/documents` | `documents/index.tsx` | Documente utile — contract cazare/voluntariat/3,5% (reachable din Meniu; deocamdată placeholder, vezi secțiunea "Documente utile" de mai jos) |
| `/documents/housing-contract` | `documents/housing-contract.tsx` | Completare automată + semnătură pentru contractul de cazare, per beneficiar |
| `/dashboard` | `dashboard.tsx` | Prezentare generală — locații/unități ocupate, voluntari, beneficiari anul curent, sold, cheltuieli lunare estimative, contact Emaus, o noutate (reachable din Meniu) |
| `/bob` | `bob/index.tsx` | Dashboard BOB — zile până la livrare, beneficiari activi, buget/cutie, total cutie curentă, ultima livrare (vezi secțiunea "Box of Blessing" de mai jos) |
| `/bob/beneficiaries` | `bob/beneficiaries/index.tsx` | Listă beneficiari BOB, implicit doar activii |
| `/bob/beneficiaries/[id]` | `bob/beneficiaries/[id].tsx` | Fișă beneficiar BOB — telefon/hartă, bifele "Am vorbit"/"Livrat" |
| `/bob/beneficiaries/[id]/edit` | `bob/beneficiaries/[id]/edit.tsx` | Editează beneficiar BOB |
| `/bob/beneficiaries/new` | `bob/beneficiaries/new.tsx` | Beneficiar BOB nou |
| `/bob/shopping` | `bob/shopping.tsx` | Lista de cumpărături pentru cutie — categorii colapsabile, filtru nume/bifate, "Cumpărături efectuate" |
| `/bob/history` | `bob/history.tsx` | Istoric cumpărături BOB (persistat — vezi mai jos), reachable din Meniu |

`[id].tsx` și `[id]/edit.tsx` coexistă în același folder (ex. `beneficiaries/[id].tsx` +
`beneficiaries/[id]/edit.tsx`) — rute diferite (`/beneficiaries/:id` vs.
`/beneficiaries/:id/edit`), expo-router le tratează separat, fără conflict.

`app/_layout.tsx` montează `ThemeProvider` (cel mai exterior — vezi mai jos), apoi
`AuthProvider`, apoi `AuthGate` (redirect la `/login` din orice ecran la sesiune
expirată — vezi secțiunea „Sesiune: cache și expirare" mai jos) peste `<Stack>`.

## Navigare — bară de jos, 4 taburi (mobil-nativ, nu meniu orizontal sus)

Aplicația se comportă ca o aplicație mobilă: navigarea principală e o **bară de jos**
(`src/components/BottomTabBar.tsx`), nu un meniu orizontal sus (`AppNav`, vechea
componentă, a fost eliminată). Exact 4 taburi, mereu: **Locații, Solicitări,
Activități, și „•••" (Meniu)** — restul ecranelor (Beneficiari, Mentenanță,
Curățenie, Notificări) sunt reachable doar din `/menu`, nu mai au tab propriu.
(Curățenie a fost pe bara de jos inițial, apoi schimbată cu Activități — dacă vreți
înapoi, e doar `menuConfig` în `data.ts` + `isTabActive()`/`FALLBACK_TABS` din
`BottomTabBar.tsx`, nimic altundeva.)

- **Bara e "gestionată de backend"**: `BottomTabBar` face `GET /api/menu` (mock:
  `server.ts` → `menuConfig` din `data.ts`) și citește de-acolo `label`/`href`/`icon`
  pentru cele 4 taburi — un nucleu ar putea redenumi/reordona un tab din backend, fără
  update de aplicație. Ce rămâne cod (nu poate fi backend-driven într-o aplicație
  nativă): *care rute aparțin vizual de care tab* (starea "activ") — vezi
  `isTabActive()` din `BottomTabBar.tsx`.
- **`/menu`** citește `moreSections` din același `GET /api/menu` pentru lista de
  pagini de sub profil — la fel, backend-driven.
- **Ce ecrane au bara de jos**: `<ScreenContainer tabBar>` — toate ecranele "listă"
  (Locații, Solicitări, Activități, Beneficiari, Mentenanță, Curățenie, Notificări,
  Meniu, Dashboard, `documents/index.tsx`, și — pentru BOB — `bob/index.tsx`,
  `bob/beneficiaries/index.tsx`, `bob/shopping.tsx`, `bob/history.tsx`). **Ce ecrane NU
  o au**: formulare și detalii (`property/[id]`, `bookings/[id]`, `booking/new`,
  `beneficiaries/[id]`, `beneficiaries/new`, `maintenance/new`, `opportunities/new`,
  `documents/housing-contract`, cele cinci `[id]/edit.tsx`, `bob/beneficiaries/[id]`,
  `bob/beneficiaries/new`, `login`) —
  acelea au doar un buton de "înapoi" în antet, ca pe orice aplicație mobilă (push
  peste bara de jos, nu lângă ea).
- **FAB-urile** ("+ Solicitare nouă" etc.) pe ecranele cu `tabBar` trebuie ridicate cu
  `BOTTOM_TAB_BAR_HEIGHT + insets.bottom + spacing.md` (vezi `app/index.tsx` pentru
  exemplu) — altfel se suprapun peste bară.
- **`ScreenContainer`, propul `header`**: orice ecran cu antet nativ (`Stack.Screen
  options={{headerShown:true}}`) trebuie să pună și `header` pe `ScreenContainer`,
  altfel padding-ul de sus din `content` se adună cu spațiul antetului și apare un gol
  vizibil între ele. Locații (`app/index.tsx`) e singurul ecran principal fără antet
  nativ (își desenează titlul singur) — de-aia e singurul care NU pune `header`.
- **Tranziția între cele 4 taburi de jos** — un `<Link>`/`router.push` între rutele
  rădăcină ale taburilor (`/`, `/bookings`, `/opportunities`, `/menu`) e tot un push de
  Stack (nu o schimbare de Tabs nativ), deci moștenește implicit slide-ul de tip "pagină
  nouă" — prea încărcat pentru o simplă schimbare de tab. Cele 4 ecrane-rădăcină au
  `animation: "fade"` pe `Stack.Screen` din cauza asta; restul navigării (push spre
  detalii/formulare) rămâne pe animația implicită.

**Ca să adaugi un ecran nou "principal"** (cu bară de jos): pune `tabBar` (+ `header`
dacă are antet nativ) pe `ScreenContainer`, și adaugă-l ca element nou în
`menuConfig.moreSections` din `data.ts` (nu ca tab — cele 4 taburi rămân fixe, per
cerința inițială).

**Atenție la Fast Refresh când schimbi arborele de provideri din `_layout.tsx`:**
restructurarea provider-elor (adăugarea/mutarea unui `<XProvider>`) nu se
hot-reload-ează corect — React poate păstra o instanță veche de context montată sub
alta nouă, ceea ce dă o eroare falsă de genul "useX trebuie folosit în interiorul
<XProvider>" deși codul e corect. Dacă vezi asta după ce ai umblat prin
`_layout.tsx`, oprește serverul de dev și repornește-l cu `npx expo start --web
--clear` (cache curat) înainte să tragi concluzia că e un bug real în cod.

## Capcane de layout cunoscute (React Native Web) — citește înainte să adaugi un ecran nou

Astea au picat deja o dată (ecranul de Solicitări — taburile de filtru fie zdrobite la
câțiva pixeli, fie întinse pe tot ecranul, în funcție de câte rezultate avea lista de
sub ele) și pot pica din nou pe orice ecran nou construit după același tipar. Reține
regulile, nu doar reparația punctuală:

1. **Un `ScrollView horizontal` nu-și calculează fiabil înălțimea din conținut pe web.**
   `flexGrow:0`/`flexShrink:0` NU sunt de-ajuns (am încercat, tot s-a stricat) — dă-i o
   `height` explicită, fixă, pe `style` (nu pe `contentContainerStyle`), plus
   `alignItems: "center"` pe `contentContainerStyle` ca elementele din interior să
   rămână la înălțimea lor naturală, centrate. Exemplu funcțional: `tabsScroll` din
   `app/bookings/index.tsx`/`app/maintenance/index.tsx`.
2. **Orice `ScrollView`/`FlatList` menit să fie "restul de spațiu, scrollabil" al unui
   ecran** (adică orice listă sub un antet/rând de filtre, într-un `ScreenContainer`,
   care e `flex:1` cu `gap` între copii) **are nevoie de `style={{ flex: 1 }}`**
   explicit. Fără el, înălțimea rămâne ambiguă și fie lista nu se restrânge la spațiul
   rămas, fie pagina întreagă capătă un scroll ciudat.
3. **Regulă practică, de reținut o dată pentru totdeauna**: orice ecran nou cu un rând
   de filtre tip taburi deasupra unei liste urmează tiparul: `ScrollView` orizontal cu
   `height` fixă pentru taburi + `style={{flex:1}}` pe listă. Nu re-descoperi asta de
   la zero pe fiecare ecran — copiază tiparul din `app/bookings/index.tsx`.
4. **Antetul nativ** (`Stack.Screen options={{headerShown:true}}`) își ia stilul din
   `screenOptions` de pe `<Stack>`-ul rădăcină din `app/_layout.tsx` — dacă modifici
   temele/culorile, verifică și acolo, nu doar `tokens.ts` (antetul nu citește direct
   din `tokens.ts`, ar fi nevoie să fie recalculat pe fiecare navigare).

## Sesiune: cache și expirare

- **`src/api/sessionCache.ts`** (`cachedGet(key, fetcher)`) — cache în memorie, per
  sesiune (golit la logout din `AuthContext.logout()`, nu persistă la reload). Pus
  DOAR pe rute rar schimbate dar cerute des: `GET /api/menu` (`BottomTabBar`,
  `menu.tsx` — se cerea la fiecare montare a barei, adică la fiecare navigare) și
  `GET /api/users` (pickerele de voluntari din `maintenance/index.tsx`,
  `cleaning/index.tsx`). **Nu pune cache pe date live** (proprietăți cu status de
  unități, solicitări, notificări, oportunități) — s-ar arăta stări vechi după o
  acțiune (ex. o unitate marcată "are nevoie de curățenie" tot "Ocupată" pe ecranul
  altcuiva). Dacă mai adaugi o rută rar-schimbată-dar-des-cerută, `cachedGet` e
  tiparul de urmat; pentru orice altceva, `api.get()` direct, ca până acum.
- **`AuthGate`** din `app/_layout.tsx` — redirecționează la `/login` din ORICE ecran,
  nu doar din Locații, când `user` devine `null` (logout manual sau automat la un
  401 — vezi `AuthContext`). Înainte doar `app/index.tsx` avea propriul guard local;
  un 401 pe alt ecran te lăsa "blocat" acolo. **Nu mai adăuga guard-uri locale de
  `if (!user) return <Redirect .../>`** pe ecrane noi — `AuthGate` acoperă tot
  arborele; un `if (!user) return null;` local (fără `Redirect`) e ok doar ca
  narrowing pentru TypeScript, dacă ecranul citește `user.ceva` mai jos (vezi
  `app/index.tsx`).

## Componente reutilizabile (`src/components/`)

Nu duplica markup pentru astea — sunt deja componente:

- `ScreenContainer` — wrapper de ecran cu padding/safe-area standard; `tabBar` (vezi
  secțiunea de Navigare de mai sus) adaugă bara de jos.
- `Card` — cutie cu bordură/fundal pentru fiecare rând de listă sau secțiune.
- `BottomTabBar` — bara de jos, 4 taburi, backend-driven (vezi Navigare mai sus). Are
  și badge-ul de notificări necitite (mutat de pe fostul clopoțel din `AppNav`, acum pe
  tab-ul „Meniu").
- `PushNotificationOverlay` — bannerul de previzualizare push, montat o singură dată în
  `app/_layout.tsx` (vezi secțiunea „Notificări push” mai jos). Nu-l pune pe ecrane
  individuale — e global.
- `DatePicker` — un mic calendar (grid lună, navigare ‹ › între luni), într-un Modal —
  înlocuiește orice `TextInput` unde utilizatorul ar fi trebuit să tasteze
  "AAAA-LL-ZZ" de mână. `value`/`onChange` rămân stringuri "AAAA-LL-ZZ" (sau `""`
  pentru necompletat) — payload-urile trimise la API nu se schimbă. `optional` adaugă
  un buton "Șterge data" în footer. Nu există nicio bibliotecă nouă (native
  date-pickerele gen `@react-native-community/datetimepicker` au suport web
  neclar/incomplet — de-aia construit de la zero, doar din View/Text/Modal). Folosit
  în `booking/new.tsx` (check-in/check-out), `bookings/[id].tsx` (dată check-out,
  opțională), `opportunities/new.tsx` (data activității, opțională).
- `TimePicker` — două coloane care se derulează (oră 0-23, minut 0-59), într-un Modal,
  nu un rând de chip-uri cu ore prestabilite (prima variantă, înlocuită — utilizatorul
  a cerut explicit derulare, nu presetări). Tap pe un rând alege valoarea direct;
  "Confirmă" aplică ora, "Fără oră" golește selecția. `value`/`onChange` rămân
  stringuri "HH:MM" (sau `""`). Folosit în `opportunities/new.tsx`.
- `SelectField` — o listă de-ales dintr-un sheet (nu chip-uri) pentru opțiuni multe
  și/sau lungi — locații, voluntari. Aceeași formă de props ca `ChipPicker`
  (`options`/`value`/`onChange`), plus `label` inclus (nu mai trebuie un `<Text>`
  separat deasupra) și `placeholder`. **Nu înlocui `ChipPicker` peste tot** — pentru
  opțiuni puține și scurte (tip, prioritate, zi din săptămână, temă) `ChipPicker`
  rămâne alegerea bună; `SelectField` e doar pentru liste lungi. Folosit pentru
  Locație în `opportunities/new.tsx`, `maintenance/new.tsx`, `cleaning/index.tsx`, și
  pentru Voluntar în `cleaning/index.tsx` + `maintenance/index.tsx` (asignare).
  Propul `compact` (adăugat pentru BOB) face din `SelectField` un chip mic, fără
  eticheta de deasupra — pentru când trebuie să încapă pe același rând cu alte
  controale mici (ex. Responsabil lângă chip-urile de status în
  `bob/beneficiaries/index.tsx`); sheet-ul de alegere rămâne identic.
- `PhoneActions` (+ `PhoneField`) — număr de telefon apăsabil (Sună/WhatsApp/SMS
  printr-un mic sheet, `Linking.openURL`, fără nicio bibliotecă nouă). `PhoneActions`
  e doar textul apăsabil (pentru rânduri de listă); `PhoneField` adaugă o etichetă
  deasupra (pentru fișe, gen `InfoRow`). **Reține să chemi `e.stopPropagation()`** (deja
  făcut în `PhoneActions`) când îl pui într-un rând care are și el un `onPress` —
  altfel pe web tap-ul pe telefon declanșează și navigarea rândului-părinte. Folosit în
  `beneficiaries/index.tsx`, `beneficiaries/[id].tsx`, `bookings/index.tsx`,
  `bookings/[id].tsx`, `booking/new.tsx`, `property/[id].tsx`. Presupune numere
  românești (`+40`) la normalizare — vezi `toE164()` din fișier dacă apar beneficiari
  cu numere străine.
- `ShareActions` — același tipar de sheet ca `PhoneActions`, dar pentru un text oarecare
  (ex. adresa unei locații): „WhatsApp" (`wa.me/?text=`, fără un număr anume —
  utilizatorul alege singur conversația) sau „Copiază" (`expo-clipboard`, singura
  dependență nouă adăugată pentru asta — RN nu mai are clipboard în core din 0.65+).
  Folosit în `property/[id].tsx`, lângă adresă ("Trimite adresa").
- `Field` — input etichetat (label + TextInput).
- `ChipPicker` — selector cu opțiuni tip "chip" (status, tip, zi, utilizator).
- `PrimaryButton` — buton cu variante `primary`/`secondary`/`danger` + stare `loading`.
- `StatusPill` — pastile colorate per status (booking/unit/maintenance/cleaning/beneficiary);
  `UNIT_STATUS_META` de-aici e sursa de-adevăr pentru toate etichetele de status de unitate.
- `EmausMark` — sigla Emaus (acoperiș+coș), ca `<Image>` — alege singură varianta verde
  (light) sau mentă (dark) după `useColorScheme()`. Folosită în anteturile de pe
  `login.tsx`, `app/index.tsx` și `menu.tsx`; pune-o și în alte anteturi de ecran dacă
  are sens.
- `InfoButton` (+ `InfoLine`) — buton mic „i” care ascunde/arată informații
  suplimentare, ne-esențiale la prima privire (ex. situație materială beneficiar, cine
  a raportat o sesizare, cost estimat, interfon/chei pe o locație, statisticile
  „lifetime” de pe ecranul de Locații). Folosit în `beneficiaries/[id].tsx`,
  `maintenance/index.tsx`, `property/[id].tsx` și `app/index.tsx` — extinde-l și în alte
  ecrane cu carduri aglomerate, ca regulă generală: ce e necesar ca să înțelegi rândul
  dintr-o privire rămâne vizibil, restul intră sub `InfoButton`.

## Teme & fonturi (`src/theme/`)

- `tokens.ts` — **toate** culorile aplicației (light+dark) și `spacing`/`radius`/`fonts`.
  Niciun hex direct într-un ecran — dacă schimbi identitatea vizuală, schimbi aici.
  Light mode: fundal alb, verde de brand (`accent`/`accentInk`/`accentTint` — pornit de
  la `#008000`, apoi mai "spălăcit"/mai puțin saturat, la cerere — vezi comentariul de
  pe `light` din `tokens.ts` pentru valorile exacte și de ce). Dark mode: fundal aproape
  negru cu verde deschis, aceeași familie de culoare, doar inversată ca luminozitate —
  `ok` (stare „bine”) e deliberat pe altă nuanță de verde (mai spre smarald) ca să nu
  se confunde vizual cu verdele de brand, și n-a fost schimbat odată cu `accent`.
- `useAppFonts.ts` — încarcă Fraunces (titluri), Karla (text), IBM Plex Mono (cifre/date).

### Nu există CSS/clase în React Native — echivalentul e `StyleSheet.create()`

Nu poți avea fișiere `.css` cu clase, în sensul web — React Native (inclusiv pe web,
prin `react-native-web`) nu citește CSS, stilurile sunt obiecte JS. Regula de-aici
(deja urmată aproape peste tot, formalizată acum ca să rămână consecventă):

- Orice stil **static/structural, refolosit sau cu mai multe proprietăți** merge în
  `const styles = StyleSheet.create({...})`, la finalul fișierului ecranului/
  componentei — echivalentul RN al unei clase CSS. Fiecare ecran/componentă are deja
  al lui, colocat cu codul (nu un fișier `.styles.ts` separat — pentru fișiere de
  mărimea celor de-aici, separarea n-ar ajuta, doar ar adăuga un du-te-vino între
  fișiere).
- Culorile de temă (dependente de `colors.*`, deci calculate la fiecare render, nu
  fixe) **nu pot sta în `StyleSheet.create()`** — se calculează o singură dată, la
  încărcarea modulului, înainte să existe vreo temă. De-aia apar mereu separat, prin
  array: `style={[styles.numeStil, { color: colors.ink }]}` — partea statică din
  `styles`, partea de temă alăturată. Nu scrie un hex direct acolo, niciodată — doar
  `colors.*` din `tokens.ts`.
- Un stil folosit o singură dată, simplu (1-2 proprietăți, fără parte de temă) poate
  rămâne inline (`style={{ marginTop: spacing.sm }}`) — nu trebuie neapărat mutat în
  `StyleSheet.create()` doar de dragul regulii. Ce contează e: nicio culoare scrisă de
  mână, restul e mai mult stil de citit decât o regulă strictă.

### Alegerea de temă (Sistem/Luminos/Întunecat)

`src/state/ThemeContext.tsx` ține preferința utilizatorului (setată din `/menu`),
persistată (`localStorage` pe web, `SecureStore` pe nativ — spre deosebire de token-ul
de autentificare, o preferință de temă nu e sensibilă, deci merită să persiste și pe
web). `useThemeColors()` din `tokens.ts` citește de-acolo, nu direct `useColorScheme()`
— dacă ai nevoie de schema rezolvată (light/dark, după ce s-a aplicat "Sistem") oriunde
altundeva, ia-o din `useThemePreference().resolvedScheme`, nu re-implementa logica.

### Câmpuri noi pe `PropertyDto` (2026-09, din evidența reală)

`shortLabel` (alias scurt pentru liste — ecranul de Locații arată doar atât, nu adresa
completă), `interfon`, `keyHolders`, `keyNotes`, `lifetimeStayDays`,
`lifetimeBookingsCompleted` —
vezi comentariul de pe tip în `src/api/types.ts`. Nu sunt încă în DTO-ul C# din backend
(`Emaus.Api/Dtos`) — de adăugat acolo (entitate + DTO + migrare-ish `EnsureCreated`) când
ne reconectăm la backend-ul real. Până atunci trăiesc doar în mock.

`BookingDto.beneficiaryPhone` (tot 2026-09) — la fel, nu e încă în backend. În mock e
**calculat la servire** în `stripBooking()` din `server.ts` (caută beneficiarul curent
în `db.beneficiaries`), nu ținut duplicat pe fiecare rezervare — dacă adaugi un câmp
similar "derivat dintr-o altă entitate", urmează același tipar (calculează la servire),
nu copia valoarea la momentul creării.

`OpportunityDto.scheduledAt` (tot 2026-09) — **acum `string | null`**, nu doar
`string` — data unei activități e opțională (poate rămâne "de stabilit" la publicare).
Când e `null`, `hasTime` n-are sens (rămâne `false`) și `formatScheduled()` din
`opportunities/index.tsx` arată "Dată de stabilit"; sortarea din `GET /api/opportunities`
(`server.ts`) pune activitățile fără dată la coada listei (`?? "9999-99-99"` ca
sentinelă de comparare). Separat, `hasTime` — când `scheduledAt` există dar ora n-a
fost aleasă, `scheduledAt` ține doar data ("...T00:00" intern), iar UI-ul o arată fără
oră. Niciunul din cele două nu e încă în backend-ul real.

### `GET /api/stats/overview` (rută nouă, nu există în `docs/API.md`)

Rezumat pentru cardul de statistici de pe ecranul de Locații (`app/index.tsx`, sub un
`InfoButton`) — `locationsCount`/`unitsCount`/`occupiedUnitsCount` calculate live din
`db.properties`, `lifetimeStayDays`/`lifetimeStayYears`/`lifetimeBookingsCompleted`
însumate din câmpurile `lifetime*` de mai sus. E o rută inventată pentru mock, fără
corespondent real în backend încă — dacă rămâne utilă după ce vedeți cum arată, de
adăugat și acolo (+ actualizat `docs/API.md`).

### `GET /api/menu` (rută nouă, structura navigării — vezi secțiunea de Navigare)

Servește `menuConfig` din `data.ts` (`tabs` pentru bara de jos, `moreSections` pentru
ecranul `/menu`). Ca și `stats/overview`, fără corespondent încă în backend-ul real.

### `orgInfo` (`src/api/mock/data.ts`) — parțial placeholder, parțial real (2026-09)

`startDate` ("2022-01-24") e real, primit de la utilizator — folosit pe `/dashboard`
pentru "Activi din 24 ianuarie 2022 (X ani)" (`yearsSince()` din `dashboard.tsx`,
calculat live din data curentă, nu ținut static). `currentBalance`/`contactPhone`/
`announcement` rămân placeholder (`0` / `null` / `null`) — nu au fost primite încă.
Actualizează `orgInfo` direct în `data.ts` cu cifrele reale când le ai — `GET
/api/stats/overview` le expune neschimbate în `OverviewStatsDto`.

### `GET /api/beneficiaries` — paginat + căutare fără diacritice (2026-09)

Răspunsul e acum `PagedResult<BeneficiaryDto>` (`{ items, page, pageSize, total,
hasMore }`), nu un array simplu — orice consumator nou trebuie să citească `.items`
(vezi `booking/new.tsx` pentru un exemplu care nu are nevoie de paginare reală, doar
ignoră restul câmpurilor). Fără alt filtru, ordinea e "recenți întâi" (array-ul din
`db.beneficiaries` inversat — o intrare nouă se adaugă la final, deci inversarea dă
ordinea cronologică descrescătoare). `beneficiaries/index.tsx` încarcă în pagini de 30,
cu "load more" la scroll (`onEndReached` pe `FlatList`), nu tot dintr-o dată.

Căutarea (`?search=`) e insensibilă la diacritice prin `normalizeSearchText()` din
`server.ts` (descompune NFD + elimină semnele combinatoare U+0300–U+036F, deci "atsi"
găsește și "ățâș...") — dacă adaugi o căutare similară în altă parte, refolosește
aceeași funcție, nu re-inventa normalizarea.

## Notificări push — doar previzualizare, deocamdată (2026-09)

Nu există push real (ar cere token-uri Expo/FCM/APNs, permisiuni, un server de push —
mult peste ce are sens acum, cât mock-ul e singura "bază de date"). În loc, orice
notificare creată în mock declanșează o **previzualizare vizuală**: un banner care
coboară din vârful ecranului, în sesiunea curentă, arătând exact mesajul + cui i-ar fi
fost trimis — etichetat clar "Previzualizare", ca să nu se creadă că a ajuns cu-adevărat
la altcineva.

- **`src/api/mock/events.ts`** — un pub/sub minimal de modul (`onPushEvent`/
  `emitPushEvent`). Nu ține nimic persistent, doar transmite evenimentul mai departe.
- **`server.ts` → `notifyMany()`** — punctul unic prin care se scriu notificările în
  `db.notifications` ȘI se emite evenimentul de previzualizare. `notify()` (un singur
  destinatar), `notifyNucleus()`, `notifyVolunteers()` sunt toate implementate peste
  `notifyMany()` acum — **dacă adaugi un nou tip de notificare, folosește una din
  astea, nu scrie direct în `db.notifications`**, altfel previzualizarea nu apare.
  Emite UN SINGUR eveniment per grup de destinatari (nu unul per persoană — altfel
  "anunță toți voluntarii" ar declanșa 14 bannere deodată).
- **`src/components/PushNotificationOverlay.tsx`** — bannerul propriu-zis, montat o
  singură dată în `app/_layout.tsx` (deasupra `<Stack>`, ca să acopere orice ecran).
  Coadă simplă (un banner o dată, următorul așteaptă), auto-dispare după 5s, tap îl
  duce la ecranul relevant (după `type`/`relatedEntityType`, la fel ca `open()` din
  `notifications/index.tsx` — dacă adaugi o rută nouă acolo, adaug-o și aici).

**Declanșatori existenți**: cerere nouă de cazare, comentariu nou, decizie pe cazare,
sesizare mentenanță nouă/asignată, unitate care are nevoie de curățenie (vezi mai jos),
activitate nouă publicată (dacă e bifat "Anunță toți voluntarii").

### Curățenie — notificare automată către rotația locației

Când o unitate devine "Are nevoie de curățenie" — fie manual (`PATCH
/api/units/:id/status`, din `property/[id].tsx`, ecranul de Locații — exact exemplul
dat: "adaug că e nevoie de curățenie la locația X"), fie automat (check-out-ul unei
cazări) — sunt anunțați voluntarii din **rotația de curățenie a acelei locații**
(`cleaningVolunteerIdsFor()` → caută în `db.cleaningAssignments`), nu toți voluntarii.
Notificarea nu se retrimite dacă unitatea era deja "NeedsCleaning" (verificare
`wasNeedingCleaning`), ca să nu spamăm la fiecare salvare din formular.

### Activități (fostă "Voluntariat") — opțiune "Anunță toți voluntarii"

Redenumit doar în UI ("Voluntariat" → "Activități", pe tab, titluri, texte) — ruta
(`/opportunities`), DTO-ul (`OpportunityDto`) și fișierele (`app/opportunities/`) au
rămas neschimbate, ca să nu umblăm prin tot arborele pentru o etichetă. La creare
(`opportunities/new.tsx`), un `Switch` nou ("Anunță toți voluntarii", implicit pornit)
controlează dacă se trimite notificarea — înainte se trimitea necondiționat. Câmpul
`notifyEveryone` din body-ul `POST /api/opportunities` nu e încă în backend-ul real.

## Documente utile (Emaus, 2026-09) — contracte/formulare, deocamdată placeholder

`/documents` — trei documente (contract cazare beneficiar, contract voluntariat,
direcționare 3,5% impozit), reachable din Meniu → „Documente". **Niciunul nu are încă
fișierul PDF real** — utilizatorul urmează să-l trimită. Vezi `src/documents/registry.ts`
pentru cum se înlocuiește un placeholder cu fișierul real (`hasRealFile: true` +
`require(...)` al PDF-ului pus în `assets/documents/`) — ecranele deja verifică
flagul, nu mai e nimic altceva de umblat.

- **`src/documents/pdf.ts`** — generează PDF-uri cu `expo-print` (`printToFileAsync`
  pe nativ + `expo-sharing` pentru sheet-ul de distribuire; pe web, `printToFileAsync`
  NU e disponibil — se folosește `printAsync`, care deschide dialogul de printare al
  browserului). Orice PDF nou generat din aplicație (placeholder sau contract completat)
  trece prin `renderPdf()` de-acolo, nu reinventa ramura web/nativ în altă parte.
- **`/documents/housing-contract`** — completare automată + semnătură pentru contractul
  de cazare: cauți un beneficiar existent (`GET /api/beneficiaries?search=`, aceeași
  paginare ca lista principală — aici doar se citește `.items`, nu se mai paginează,
  set mic de rezultate pentru o căutare), textul contractului (**text PLACEHOLDER**,
  de înlocuit cu cel real) se completează cu datele lui, apoi beneficiarul semnează
  direct pe ecran (`react-native-signature-canvas` — bazat pe `react-native-webview`,
  funcționează în Expo Go, nu cere un client de dezvoltare custom). La „Generează",
  semnătura (PNG base64) + datele intră într-un HTML → PDF, gata de trimis/salvat prin
  `Sharing.shareAsync`.
- **Dependențe noi doar pentru asta**: `expo-print`, `expo-sharing`,
  `react-native-webview`, `react-native-signature-canvas` — toate funcționează în Expo
  Go (module oficiale Expo sau, pentru signature-canvas, un wrapper peste WebView, deja
  suportat acolo), fără nevoie de EAS Build/dev client custom.
- **Contractul de voluntariat și direcționarea 3,5%** sunt doar „deschide, vezi
  placeholder-ul" — nu au completare automată, sunt documente statice odată ce vine
  fișierul real.

## Box of Blessing (BOB) — al doilea proiect din aplicație (2026-09)

Aceeași aplicație, alt "proiect" activ — cutii lunare cu alimente pentru ~10
beneficiari, complet separat de cazările Emaus, dar cu ACELAȘI login/cont (nu e o
aplicație separată, doar navigarea principală se schimbă).

- **`src/state/ProjectContext.tsx`** (`useProject()`) — `activeProject: "emaus" |
  "bob"`, persistat pe dispozitiv (același tipar ca `ThemeContext`: `localStorage` pe
  web, `SecureStore` pe nativ). Comutatorul e în Meniu → cardul "Proiect"
  (`menu.tsx`). **Nu schimbă sesiunea/userul** — doar `BottomTabBar` (tabs) și
  `moreSections` din `/menu` citesc `activeProject`; cardurile Profil/Aspect/
  Securitate dispozitiv din `menu.tsx` sunt neschimbate indiferent de proiect (asta a
  fost cerința explicită).
- **`GET /api/menu?project=bob`** — `server.ts` întoarce `bobMenuConfig` (din
  `bobData.ts`) în loc de `menuConfig` când query-ul cere `bob`. Cache-ul din
  `sessionCache.ts` e cheiat `menu:${activeProject}`, nu doar `"menu"` — altfel
  schimbarea proiectului ar servi tab-urile vechi din cache.
- **Tab-urile BOB**: Dashboard (`/bob`) / Beneficiari (`/bob/beneficiaries`) /
  Cumpărături (`/bob/shopping`) / Meniu (comun) — Istoric (`/bob/history`) e în
  `moreSections`, reachable doar din Meniu (la fel ca Beneficiari/Mentenanță pentru
  Emaus). `BottomTabBar.tsx` → `isTabActive()` are cazuri noi (`bob-dashboard`/
  `bob-beneficiaries`/`bob-shopping`), plus `BOB_FALLBACK_TABS` separat de
  `FALLBACK_TABS`.
- **Tipuri**: `src/api/bobTypes.ts` — separat de `types.ts` (acela e explicit
  "oglindă a DTO-urilor din backend C#"; BOB n-are corespondent acolo, nu există în
  backend-ul real și probabil nu va exista curând).
- **Date mock**: `src/api/mock/bobData.ts` — `bobBeneficiaries` (17 rânduri, dintr-un
  tabel real trimis de utilizator; **numerele de telefon au fost ușor alterate**,
  la cererea explicită, înainte să intre în cod — nu sunt cele reale), `bobBoxCatalog`
  (catalog de ~75 articole pe 8 categorii, cu preț + bifa inițială, tot din excel-ul
  trimis). `status` (`Active`/`Former`/`Possible`) provine din secțiunile "Foști
  beneficiari"/"Posibili beneficiari" ale tabelului original (erau rânduri de
  separare, transformate aici în valoarea `status` a rândurilor de dedesubt).
  `bobConfig.maxBudgetPerBox` (99.28 lei) e preluat direct din "Conținutul Cutiei"
  din excel — presupunere: e bugetul MAXIM, nu recalculat din bifele curente.
- **EXCEPȚIE de la "totul e doar în memorie"**: `src/api/mock/bobHistoryStore.ts`
  persistă istoricul de cumpărături cu `@react-native-async-storage/async-storage`
  (singura dependență adăugată doar pentru asta) — la cererea explicită ("să se
  salveze în DB"). Supraviețuiește unui restart al serverului de dev/aplicației, spre
  deosebire de restul lui `bobData.ts`/`data.ts`. Rutele `GET`/`POST
  /api/bob/purchases` din `server.ts` sunt `async` și citesc/scriu prin acest store —
  ecranele tot vorbesc doar cu `api.*`, nu știu că persistă altfel.
- **`ShareActions`/`PhoneActions`/`openInMaps` (`src/utils/linking.ts`)** — reutilizate
  pentru beneficiarii BOB (telefon apăsabil, hartă din adresă). `openInMaps()` e un
  link universal Google Maps (`google.com/maps/search`), merge pe iOS/Android/web
  fără nicio bibliotecă nouă.
- **Sigla** — BOB folosește `EmausMark`, aceeași ca Emaus (decizie explicită a
  utilizatorului: "nu are rost să schimbăm"). Nu există un `BOBMark` separat.
- **`BOB_VOLUNTEER_OPTIONS`** (`src/api/bobTypes.ts`) — listă fixă, mock, de
  responsabili ("Cristi", "Sami", "George", "Ștefan"), cerută explicit așa de
  utilizator — NU vine din `db.users` (Emaus), "George" nu are cont acolo. Folosită cu
  `SelectField` în `bob/beneficiaries/new.tsx`, `[id]/edit.tsx`, ȘI inline în
  `bob/beneficiaries/index.tsx` (fiecare card din listă își schimbă responsabilul
  direct, fără să intri pe fișă — la fel bifele "Am vorbit"/"Livrat", devenite
  `Pressable` în listă, cu actualizare optimistă locală + `PATCH` în fundal, vezi
  `patchBeneficiary()` din acel fișier). Trăiește în `bobTypes.ts`, nu în
  `mock/bobData.ts` — e o constantă de UI, ecranele nu importă niciodată direct din
  `mock/`.
- **Prețurile articolelor din `/bob/shopping` sunt editabile direct din listă** (nu
  doar la adăugare) — se schimbă lunar ("luna asta găsim făina la 2.78, luna viitoare
  la 3.5"). `src/utils/number.ts` → `parseDecimal()` interpretează "2,78" și "2.78"
  identic (virgulă → punct înainte de `Number()`) — folosește-l la orice preț introdus
  manual, nu re-inventa normalizarea. Rândul unui articol NU mai e un singur
  `Pressable` (ca înainte) — bifa/numele sunt într-un `Pressable` separat de
  `TextInput`-ul de preț (care își comite valoarea la `onBlur`, prin `commitPrice()`),
  altfel tap-ul în câmpul de preț ar bifa/debifa accidental articolul.
- **Permisiuni**: toate rutele `/api/bob/*` sunt deschise oricui e logat (fără
  `nucleusOnly`) — proiectul e gândit ca un instrument colaborativ pentru un grup mic
  de voluntari (Sami/Cristi/George/Ligia din evidență), nu ca o ierarhie
  Nucleus/Voluntar ca la Emaus.

## Marca Emaus (`assets/emaus-mark-*.png`, iconițele din `assets/`)

Sigla completă (acoperiș + „EMAUS BUCUREȘTI”) primită de la utilizator a fost redesenată
vectorial — doar marca de acoperiș (mai puțin fragilă la dimensiuni mici) — și e sursa
pentru: `icon.png`, `favicon.png`, `splash-icon.png`, `android-icon-*.png` (toate în
`assets/`, fundal verde `#008000` + marcă albă) și cele două PNG-uri transparente
folosite în UI (`emaus-mark-green.png`, `emaus-mark-mint.png`, vezi `EmausMark` mai sus).
Dacă utilizatorul furnizează fișierul original al logo-ului (SVG/PNG de înaltă calitate),
înlocuiește direct aceste fișiere — păstrează exact aceleași nume și dimensiuni (verifică
dimensiunile curente cu `identify`/deschide fișierul înainte de suprascris) ca `app.json`
să nu aibă nevoie de nicio modificare.

## Cum vezi aplicația live cât lucrezi

```
cd mobile
npm run web      # deschide în browser, cu fast refresh — cel mai rapid feedback vizual
# sau
npm start        # QR code pentru Expo Go pe telefon fizic
```

Fast refresh de la Expo/Metro reîncarcă automat ecranul la fiecare salvare de fișier —
nu trebuie repornit serverul pentru o modificare de UI. Datele mock se resetează doar
la un restart complet al serverului de dev (nu la fast refresh).

## Verificare, după orice schimbare în `mobile/`

```
npx tsc --noEmit
```

Trebuie să iasă fără nicio eroare — vezi și lista de verificare din `../CLAUDE.md`.
