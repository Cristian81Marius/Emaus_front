# Note pentru asistentul AI care lucrează pe acest proiect

Acest fișier e adresat ție, Claude (sau orice asistent AI care preia lucrul pe acest
repo mai târziu) — nu utilizatorului final. Scopul: să nu redescoperi de la zero, de
fiecare sesiune, structura proiectului și capcanele mediului, și să nu risipești
tokeni re-explorând ce e deja documentat sau re-livrând fișiere într-un mod ineficient.
Citește-l înainte să începi orice task pe acest proiect.

## Ce e proiectul, pe scurt

Aplicație de organizare a cazărilor pentru Asociația Emaus (locuințe gratuite pentru
pacienți oncologici). Stivă: backend ASP.NET Core 8 + EF Core + SQLite
(`backend/`), aplicație mobilă+web Expo/React Native + TypeScript cu expo-router
(`mobile/`), documentație funcțională și tehnică în `docs/`.

**Citește întâi `docs/ARCHITECTURE.md` și `docs/API.md`** — descriu exact organizarea
pe straturi și fiecare endpoint. Nu re-derivezi structura umblând prin tot arborele de
fișiere; citește doar entitatea/DTO-ul/serviciul/controllerul concret implicat în task-ul curent.

## Convenția de backend — Controller → Service → Repository

Urmeaz-o exact, nu inventa alta:

- **Controller** (`Emaus.Api/Controllers/`) — doar traduce HTTP ↔ apel de serviciu:
  `(await xService.FaceCevaAsync(...)).ToActionResult(this)` sau
  `.ToCreatedResult(this, nameof(Actiune))`. Niciodată `AppDbContext` sau logică de
  business într-un controller.
- **Service** (`Emaus.Api/Services/<Zonă>/`) — primește `IRepository<TEntity>` +
  `IUnitOfWork` (+ alte servicii, ex. `NotificationService`) prin constructor primar,
  întoarce `ServiceResult`/`ServiceResult<T>` (niciodată `ActionResult`).
- **Repository** — un singur `IRepository<TEntity>` generic (`Query/GetByIdAsync/Add/Remove`)
  + `IUnitOfWork.SaveChangesAsync()`. Doar două excepții cu interfață proprie:
  `IUserRepository` (căutare după telefon) și `ILocalityRepository` (cheie `int`). Nu
  adăuga un repository nou fără un motiv la fel de întemeiat.

**Listă de verificare pentru o funcționalitate nouă în backend:** entitate (dacă e cazul)
în `Emaus.Domain/Entities` → DTO-uri în `Emaus.Api/Dtos/<Zonă>` → serviciu în
`Emaus.Api/Services/<Zonă>` → controller subțire → înregistrează serviciul (și orice
repository nou) în DI, în `Program.cs`.

**Actualizează `docs/ARCHITECTURE.md` și `docs/API.md`** la orice schimbare structurală
sau de endpoint — sunt referința pe care chiar o citește utilizatorul.

## Constrângeri de rețea — DIFERITE după context de execuție, nu presupune orbește

Există DOUĂ contexte diferite în care rulezi pe acest proiect, cu acces la rețea diferit —
verifică o singură dată la începutul sesiunii care ești, nu presupune:

- **Containerul cloud / `device_bash` pe mașina utilizatorului (control de la distanță):**
  `api.nuget.org` și `api.expo.dev` sunt blocate de politica organizației acolo. Nu relua și
  nu ocoli niciodată un 403/407 de pe ele. În acest context, doar `Emaus.Domain` (zero
  pachete externe) poate fi compilat pentru verificare — rețeta: scrie un `backend/NuGet.Config`
  temporar cu `<packageSources><clear/></packageSources>`, rulează `dotnet build
  src/Emaus.Domain/Emaus.Domain.csproj`, apoi **șterge imediat acel NuGet.Config**. Pentru
  `Emaus.Infrastructure`/`Emaus.Api`, încearcă întâi `dotnet build <proiect> --no-restore` —
  dacă `obj/project.assets.json` există deja dintr-un restore anterior (de obicei da, scheletul
  a fost restaurat o dată), compilarea chiar reușește fără rețea (vezi punctul următor). Doar
  dacă asta eșuează cu adevărat cu o eroare de restore/rețea, revizuiește manual și spune-i
  limpede utilizatorului că n-ai putut compila efectiv acele proiecte.
- **Sesiune nativă, locală, pe mașina utilizatorului (extensia VSCode, Bash/PowerShell direct —
  NU `device_bash`):** verificat empiric (2026-09-10) — `api.nuget.org` E accesibil de aici,
  `dotnet restore`/`dotnet add package` chiar funcționează pentru pachete noi. Deci în acest
  context poți: (a) compila normal `Emaus.Infrastructure`/`Emaus.Api` (chiar și cu `--no-restore`
  din cache-ul deja populat), (b) porni efectiv serverul (`dotnet run`) și testa endpoint-uri cu
  `curl`, (c) adăuga pachete NuGet noi (ex. pentru un proiect de teste). Nu presupune orbește
  blocajul din CLAUDE.md ca fiind valabil universal — verifică o dată cu un `dotnet build
  <proiect> --no-restore`, sau chiar un `dotnet restore` direct, înainte să te resemnezi la
  "doar revizuire manuală".
- Pentru pachete mobile, folosește `npm install <pachet>@<versiune-exactă>` în loc de
  `npx expo install` (care apelează `api.expo.dev`) — rămâne valabil oriunde, restricția pe
  `api.expo.dev` nu a fost re-verificată în contextul nativ local.

## Livrarea fișierelor pe calculatorul utilizatorului — pasul cel mai scump, optimizează-l

- Verifică legătura cu UN singur apel `get_device_info`. Dacă eșuează, mai încearcă o
  singură dată, apoi treci pe varianta de rezervă — nu bate la ușă în buclă.
- **Dacă e conectat:** un singur apel `SendUserFile` cu toate fișierele schimbate (≤50),
  apoi un singur apel `device_commit_files` care mapează fiecare `fileUuid` la calea
  exactă `E:\project\emausApp\...`. Ăsta e SINGURUL mod acceptabil de livrare când
  dispozitivul e conectat — nu construi comenzi `device_bash` care includ conținutul
  fișierelor inline (base64/heredoc): consumă context degeaba, pentru același rezultat
  pe care `SendUserFile`+`device_commit_files` îl obține fără să printeze nimic în
  conversație.
- **Dacă nu e conectat** (sau uneltele `mcp__remote-devices__*` raportează "not connected"):
  împachetează fișierele schimbate într-o singură arhivă zip care păstrează căile relative
  sub `emausApp/...`, livrează prin `SendUserFile`, și spune-i utilizatorului să o
  dezarhiveze peste folderul lui. Nu reîncerca legătura de mai multe ori în aceeași tură.
- Rădăcina folderului conectat e `E:\project`, montată la `$HOME/mnt/project` în
  `device_bash` — `$HOME/mnt/project/emausApp/x` acolo e `E:\project\emausApp\x` pe
  mașina utilizatorului.

## Stare curentă a implementării (2026-09-10)

Toate cele 13 secțiuni din `docs/API.md` sunt implementate în `backend/`, inclusiv Box of
Blessing (§13, entități în `Emaus.Domain/Bob/`) și seed-ul complet din `docs/SEED_DATA.md`.
Nu presupune că mai lipsește ceva doar pentru că pare recent adăugat în cod — verifică
`docs/API.md` (are secțiunea completă) înainte să reimplementezi ceva care există deja.
Deciziile de arhitectură BOB (schemă, permisiuni, `assignedVolunteerName` text liber) au
fost confirmate cu utilizatorul și sunt reflectate ca atare (nu ca întrebări deschise) în
`docs/ARCHITECTURE.md` și `docs/API.md` §13.

## Teste unitare (`backend/tests/Emaus.Api.Tests`)

Proiect xUnit, testează serviciile direct (fără server HTTP pornit) — exact motivul pentru
care serviciile întorc `ServiceResult`/`ServiceResult<T>` în loc de `ActionResult` (vezi
convenția de mai sus). Rulează cu `dotnet test tests/Emaus.Api.Tests/Emaus.Api.Tests.csproj`
(sau `dotnet test Emaus.sln` din `backend/`).

- **`TestDoubles/SqliteTestDatabase.cs`** — un `AppDbContext` REAL peste o bază SQLite în
  memorie (conexiune deschisă manual, unică per test), NU o listă în memorie/fake. S-a încercat
  inițial un `IRepository<T>` fals peste `List<T>.AsQueryable()` (motivat de nota din
  `docs/ARCHITECTURE.md` despre substituirea `IRepository<T>` cu o listă într-un test) — a picat
  în practică: EF Core face join-uri/"relationship fixup" reale prin `Include()`, iar operatorii
  asincroni (`ToListAsync`, `SingleAsync`...) cer `IAsyncEnumerable`, pe care LINQ-to-Objects
  simplu nu-l are. SQLite în memorie dă fidelitate 100% (aceeași cale de cod ca producția) cu
  cost mic. A și prins un bug real la scriere: SQLite (EF Core) nu poate traduce `Sum` pe
  `decimal` direct în SQL — serviciile care agregă sume trebuie să materializeze lista întâi
  (`.Select(...).ToListAsync()` apoi `.Sum()` în memorie), nu `.SumAsync()` direct pe coloane
  `decimal`. Vezi `BobStatsService`/`StatsService` pentru tipar.
- Adaugă teste noi lângă serviciul pe care îl acoperă, în `Services/<Zonă>ServiceTests.cs`,
  cu acest tipar (SqliteTestDatabase per test, seed minim în constructor, un `_sut` per clasă).

## Cache (`Emaus.Api/Common/CacheExtensions.cs`, `IMemoryCache`)

`OrganizationSettings`/`BobSettings` (rânduri singleton, citite la fiecare încărcare de
dashboard) sunt cache-uite 10 minute prin `IMemoryCache.GetOrAddSettingsAsync` — TTL fix, nu
invalidare pe scriere, pentru că azi nu există niciun endpoint care le editează. **Dacă
adaugi un endpoint de editare pentru oricare din ele, cheamă `cache.Remove(cheia)` imediat
după `SaveChangesAsync()`** — altfel schimbarea nu se vede până expiră cache-ul. Meniul
(`GET /api/menu`) e static (hardcodat în `MenuService`) — nu recalculat, doar marcat cu
`[ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Client)]` ca fiecare client
să-l țină cache-uit local o oră, fără să mai bată la server la fiecare navigare.

## Push notifications (FCM) — `Emaus.Api/Services/Notifications/`

`NotificationService` scrie mereu rândul de notificare în-app ȘI încearcă push real prin
`IPushNotificationSender`. **Fără credențiale Firebase configurate, aplicația pornește
normal** — se înregistrează `NullPushNotificationSender` (no-op), doar push-ul real nu pleacă,
notificările în-app tot funcționează. Ca să activezi push-ul real: pune fișierul JSON al unui
cont de service Firebase undeva pe disc și setează calea în `Firebase:ServiceAccountKeyPath`
din `appsettings.Development.json` (NU commite fișierul JSON în git — e o cheie privată).
Nu presupune că notificările "nu merg" dacă push-ul nu ajunge pe telefon în dezvoltare —
verifică întâi log-ul de pornire (avertizează explicit dacă push-ul e dezactivat) înainte să
consideri asta un bug. Detalii de design în `docs/ARCHITECTURE.md` → "Notificări push (FCM)".

## Capcanele bazei de date locale (`backend/src/Emaus.Api/emaus.db`, `EnsureCreated`, fără migrații încă)

- Adăugarea unei entități/tabel noi cere ștergerea `emaus.db`-ului existent ca noul tabel
  să apară de fapt (`EnsureCreated` nu modifică o bază deja existentă). Ștergerea unui
  fișier pe mașina utilizatorului cere întâi un apel `device_request_delete_permission`,
  cu domeniul restrâns la folderul necesar și un motiv clar, pe o singură linie.
- `DbSeeder` dă contului inițial de Nucleu un `Guid` nou, aleator, de fiecare dată când
  baza e (re)creată — ștergerea `emaus.db` invalidează orice JWT emis înainte (Guid-ul
  din token nu mai corespunde niciunui utilizator). `Program.cs` (`OnTokenValidated`)
  transformă asta într-un 401 curat în loc de un 500 brut de foreign-key, dar tot
  avertizează utilizatorul să facă logout/login din nou după orice resetare de bază de
  date de dezvoltare pe care o faci tu.

## Comunicare

- Răspunde în română — așa comunică utilizatorul și așa sunt scrise toate documentele
  din proiect.
- Ține actualizările de progres scurte; nu renarra pas cu pas ce se vede deja din apelurile
  de unelte.
- Când ceva se strică din cauza unei acțiuni de-a ta (ex. ștergerea `emaus.db`), explică
  limpede cauza și rezolvarea — nu doar repara pe tăcute.

## Verificare, după orice schimbare

- **Backend, sesiune nativă locală** (vezi secțiunea de rețea de mai sus): `dotnet build
  Emaus.sln` din `backend/` — dacă merge (de obicei da), ai o verificare REALĂ de compilator,
  nu doar recitire manuală. Rulează și `dotnet test tests/Emaus.Api.Tests/Emaus.Api.Tests.csproj`
  — teste unitare existente pentru fluxul de solicitări, beneficiari, proprietăți, activități,
  BOB. Dacă schimbi o regulă de business, adaugă/actualizează testul corespunzător, nu doar
  codul. Ideal, pornește și efectiv serverul (`dotnet run`) și lovește 2-3 endpoint-uri cu
  `curl` pentru fluxul modificat — a prins cel puțin un bug real (SQLite + `Sum(decimal)`) pe
  care compilarea singură nu l-ar fi prins.
- **Backend, container cloud / `device_bash`:** doar `Emaus.Domain` garantat compilabil (trucul
  NuGet.Config temporar, apoi șterge-l imediat) — încearcă `--no-restore` pe Infrastructure/Api
  întâi (vezi secțiunea de rețea), altfel recitește manual fișierele noi/schimbate față de
  câmpurile reale din entități/DTO-uri.
- Mobil: `cd mobile && npx tsc --noEmit` — fără ieșire/erori.
- Livrare (doar atunci când lucrezi de la distanță, prin `device_bash`): rezultatul
  `device_commit_files` trebuie să listeze toate căile în `"written"` și `"rejected": []` —
  dacă ceva e respins, re-verifică înainte să spui că ai terminat. Într-o sesiune nativă locală
  (ca aceasta), editezi fișierele direct, fără `SendUserFile`/`device_commit_files`.
