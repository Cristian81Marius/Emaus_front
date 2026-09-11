# Arhitectură

Două proiecte independente care comunică doar prin API HTTP — niciun cod comun, ca fiecare
să poată fi lucrat, testat și chiar înlocuit separat.

```
emausApp/
  backend/    ASP.NET Core (.NET 8) — API + bază de date
  mobile/     Expo (React Native + TypeScript) — mobil ȘI web, din același cod
  docs/       documentele astea
```

## Backend — trei straturi, o singură direcție de dependență

```
Emaus.Api  →  Emaus.Infrastructure  →  Emaus.Domain
```

- **`Emaus.Domain`** — entitățile (`Booking`, `Unit`, `Beneficiary`, ...) și enumurile
  (`UnitStatus`, `BookingStatus`, ...). Zero dependențe externe — se compilează cu doar
  .NET, fără NuGet. Dacă adaugi o regulă care descrie *ce e* o cazare sau *ce stări* poate
  avea o locație, aici intră.
- **`Emaus.Infrastructure`** — `AppDbContext` (EF Core), `DbSeeder` (datele inițiale),
  `PasswordHasher`, și implementările de repository (`Repositories/EfRepository.cs` etc.).
  Tot ce ține de *cum se salvează* lucrurile.
- **`Emaus.Api`** — controllere, servicii, DTO-uri (`Dtos/`), autentificare JWT, Swagger.
  Tot ce ține de *cum se cere/primește* ceva prin HTTP și *ce reguli* se aplică.

### Controller → Service → Repository

Fiecare zonă funcțională (Bookings, Beneficiaries, Properties, ...) are trei straturi,
fiecare cu o singură responsabilitate:

```
Controller   traduce HTTP ↔ apel de serviciu — nicio regulă de business aici
   ↓
Service      logica propriu-zisă (validări, tranziții de stare, notificări)
   ↓
Repository   citire/scriere entități — nicio regulă de business aici
```

- **Controllere** (`Controllers/`) — subțiri: primesc requestul, cheamă serviciul, întorc
  rezultatul prin `ServiceResult.ToActionResult(this)` (`Common/ServiceResultExtensions.cs`).
  Un controller nu vede niciodată `AppDbContext`.
- **Servicii** (`Services/<Zonă>/`) — o clasă per zonă funcțională (`BookingService`,
  `BeneficiaryService`, `PropertyService`, ...), injectată cu `IRepository<T>` +
  `IUnitOfWork` (+ alte servicii, ex. `NotificationService`). Întorc `ServiceResult`/
  `ServiceResult<T>` (`Common/ServiceResult.cs`) — nu `ActionResult` — ca să rămână
  independente de ASP.NET Core și testabile fără un server HTTP pornit.
- **Repository** (`Emaus.Domain/Repositories/IRepository.cs`, implementat în
  `Emaus.Infrastructure/Repositories/EfRepository.cs`) — un singur `IRepository<TEntity>`
  generic (`Query()`, `GetByIdAsync`, `Add`, `Remove`), plus `IUnitOfWork.SaveChangesAsync()`.
  Două excepții justificate, cu interfață proprie: `IUserRepository` (căutare după telefon,
  la login) și `ILocalityRepository` (cheie `int`, nu `Guid`). Nu există un repository per
  entitate — ar fi doar cod repetitiv peste EF Core fără beneficiu real la scara asta;
  `IQueryable<T>` din `Query()` acoperă orice filtrare/`Include` de care are nevoie un
  serviciu, exact cum ar face `DbContext` direct, dar în spatele unei interfețe testabile
  (poți substitui `IRepository<T>` cu o listă în memorie într-un test, fără bază de date).

Dacă adaugi o zonă nouă: o entitate în `Emaus.Domain`, un `Service` care primește
`IRepository<T>` + `IUnitOfWork` prin constructor, un `Controller` subțire care îl cheamă.

## Mobil — ecrane pe fișiere, stare minimă globală

```
app/            un fișier = o rută (expo-router) — inclusiv app/bob/*, vezi mai jos
src/api/        client HTTP + tipuri (types.ts = oglindă a DTO-urilor din backend;
                bobTypes.ts = DTO-uri pentru BOB, fără corespondent încă în backend)
src/state/      AuthContext (sesiunea), ThemeContext (light/dark), DeviceLockContext
                (PIN/Face ID pe dispozitiv), ProjectContext (Emaus vs. BOB — vezi mai jos),
                ApiModeContext (mock vs. backend real — comutator pe ecranul de login)
src/theme/      culori + fonturi, aceeași identitate ca planul aplicației
src/components/ ~20 componente reutilizabile (formulare, pickere, pastile de status,
                acțiuni de telefon/share) — nu 4, cum spunea versiunea inițială a
                acestui document; crește firesc cu aplicația
src/utils/      helpere mici, fără stare (normalizare de text/numere, deschidere Maps)
```

Mock-ul (`src/api/mock/`) simulează tot backend-ul cât timp `USE_MOCK_API = true` în
`src/api/client.ts` — vezi `mobile/CLAUDE.md` pentru detalii de dezvoltare. Important
pentru cine implementează backend-ul real: **`src/api/mock/server.ts` e sursa de-adevăr
de facto pentru orice regulă care nu e (încă) scrisă în acest document sau în
`docs/API.md`** — dacă ceva pare ambiguu aici, verifică handler-ul rutei respective
acolo înainte să presupui un comportament.

Fiecare ecran își cere singur datele de la API (`api.get(...)` într-un `useEffect`/
`useFocusEffect`) — nu există un store central de date. E intenționat: la scara actuală,
un store global ar adăuga complexitate fără să rezolve o problemă reală. Dacă apar ecrane
care au nevoie de aceleași date (ex. lista de locații, cerută din mai multe locuri), pasul
următor firesc e `@tanstack/react-query` pentru cache + refetch automat, nu un Redux complet.

## Box of Blessing (BOB) — al doilea proiect, ce înseamnă pentru backend

Aplicația mobilă găzduiește acum două proiecte ale asociației, comutabile dintr-un meniu,
**cu ACELAȘI cont/sesiune** — nu e o a doua aplicație, nu sunt useri separați. Emaus
(cazări) e tot ce descrie restul acestui document. BOB (cutii lunare cu alimente pentru
beneficiari) e implementat în `backend/`, cu entitățile în `Emaus.Domain/Bob/` — vezi
`docs/API.md` → "Box of Blessing (BOB)" pentru contractul complet de endpoint-uri.

**Decizii de arhitectură confirmate cu utilizatorul înainte de implementare:**
1. **Schemă/proiect separat sau parte din `Emaus.Domain`?** → Entități noi în
   `Emaus.Domain/Bob/` (namespace/folder separat), NU un proiect .NET separat — BOB nu
   împarte nicio entitate cu Emaus (beneficiarii sunt alte persoane, catalogul de
   articole n-are corespondent), dar deployment-ul și autentificarea rămân comune.
   Urmează același tipar Controller → Service → Repository ca restul, cu
   `IRepository<TEntity>` generic (nicio excepție de tip `IUserRepository` necesară aici).
2. **Permisiuni.** → Toate rutele BOB rămân deschise oricui e autentificat, fără
   `[Authorize(Roles = "Nucleus")]` — spre deosebire de Emaus, unde acțiunile
   administrative sunt clar Nucleus-only. Alegere de produs confirmată (grup mic,
   colaborativ, fără ierarhia Nucleus/Voluntar de la Emaus).
3. **`AssignedVolunteerName` e text liber** pe `BobBeneficiary`, NU o cheie străină spre
   `User` — confirmat: permite responsabili fără cont Emaus (ex. "George", din lista
   mock de 4 nume: Cristi, Sami, George, Ștefan).
4. **Istoricul de cumpărături persistă real** — `BobDeliveryRecord`/`BobDeliveryRecordItem`,
   tabele obișnuite în aceeași bază SQLite; articolele salvate sunt un instantaneu
   (nume+preț din momentul cumpărăturii), nu o referință live la `BoxItem` din catalog.

## De ce aceste alegeri, pe scurt

| Decizie | Alternativă luată în calcul | De ce asta |
|---|---|---|
| SQLite pentru dezvoltare | SQL Server/PostgreSQL de la început | Zero instalare, `dotnet run` merge imediat; schimbi un rând când treci la producție |
| JWT simplu, fără ASP.NET Core Identity | Identity complet | Identity aduce multe funcții (confirmare email, 2FA) nefolosite azi |
| Auto-înregistrare + aprobare Nucleus, nu doar creare directă | Doar creare directă de cont de către Nucleus | Nucleus tot decide cine intră (aprobă/respinge), dar nu mai trebuie să tasteze el datele fiecărui voluntar — cel care cere accesul își introduce singur telefon/email + parolă; ambele căi coexistă (`POST /api/auth/register` + aprobare, sau `POST /api/users` direct) |
| expo-router | React Navigation configurat manual | Rutele sunt fișiere; hărțile URL pentru varianta web vin gratis |
| Fără bibliotecă de UI | Tamagui / NativeBase / React Native Paper | 4 componente proprii, ușor de citit, fără convenții externe de învățat |
| Fără Redux/Zustand | Store global | Fiecare ecran își cere datele; suficient la scara actuală |

## Fluxul de date pentru o solicitare nouă (exemplu complet, cap-coadă)

1. `mobile/app/booking/new.tsx` → `POST /api/beneficiaries`, apoi `POST /api/bookings`
2. `BookingsController.Create` primește requestul și cheamă `BookingService.CreateAsync`,
   care salvează cererea (`Emaus.Domain.Entities.Booking`) cu status `PendingApproval`
   prin `IRepository<Booking>` + `IUnitOfWork`
3. Tot `BookingService` cheamă `NotificationService.NotifyRoleAsync(UserRole.Nucleus, ...)`,
   care creează câte o notificare pentru fiecare membru activ al nucleului
4. Nucleul deschide `mobile/app/bookings/index.tsx` (`GET /api/bookings`) și apasă
   „Aprobă”/„Respinge” → `POST /api/bookings/{id}/decide` → `BookingService.DecideAsync`
5. La aprobare + alocare (`POST /api/bookings/{id}/allocate` → `BookingService.AllocateAsync`),
   unitatea trece `Occupied`
6. La check-out (`POST /api/bookings/{id}/checkout` → `BookingService.CheckOutAsync`),
   unitatea trece `NeedsCleaning` și se creează automat un `CleaningTask`

Fiecare pas de business trăiește în `BookingService` (`Emaus.Api/Services/Bookings/`),
niciodată în `BookingsController` — controllerul din pasul 2 are o singură linie pe metodă.

Orice ecran/endpoint nou ar trebui să urmeze același tipar: un DTO clar, un endpoint care
face o singură schimbare de stare, și o notificare dacă schimbarea privește pe altcineva.

## Contractul PDF (`GET /api/bookings/{id}/contract`)

Generat cu **QuestPDF** (`Emaus.Api/Services/Contracts/BookingContractDocument.cs`) —
licența Community, gratuită pentru organizații/persoane cu venit anual sub 1.000.000 USD
(Asociația Emaus se încadrează clar; vezi `QuestPDF.Settings.License` în `Program.cs`).
Textul legal (secțiunile II-VIII) e reprodus integral din contractul real pe hârtie folosit
de Centrul EMAUS — orice modificare de conținut legal trebuie făcută cu grijă, în acord cu
varianta pe hârtie, nu doar parafrazată. Câmpurile variabile (§I, IV, semnătură) vin din
`Beneficiary`/`Booking`/`ApplicationUser`; cele lipsă apar ca linie punctată de completat
manual, exact ca pe formular — generarea nu blochează pe date incomplete. Fontul implicit
QuestPDF (fără `FontFamily` explicit) acoperă corect diacriticele românești moderne
(ș/ț cu virgulă, U+0219/U+021B) — verificat cu extragere de text din PDF-ul generat, nu doar
vizual; nu presupune că trebuie fixat un font anume dacă apare vreodată o problemă de
afișare — verifică întâi dacă datele intrate au ajuns corect codificate UTF-8 până la
DB/serviciu, înainte de-a suspecta fontul (o corupere de „ț” în „Constanța” întâlnită în
dezvoltare s-a dovedit a fi o problemă de encoding în terminal, nu în PDF).

## Notificări push (FCM)

`NotificationService.NotifyRoleAsync`/`NotifyUserAsync`/`NotifyUsersAsync` (pasul 3 de mai
sus, și toate celelalte efecte similare din `docs/API.md`) fac DOUĂ lucruri, mereu împreună:
salvează rândul de notificare în-app (`Notification`, citit prin polling) ȘI trimit un push
real prin `IPushNotificationSender` (`Emaus.Api/Services/Notifications/`) către tokenurile
înregistrate ale destinatarilor (`UserPushToken`, `POST/DELETE /api/notifications/push-token`).

Trimiterea efectivă (Firebase Cloud Messaging) e în spatele unei interfețe, nu apelată direct
din `NotificationService`, ca push-ul să poată lipsi complet fără să strice restul aplicației:

- **`FcmPushNotificationSender`** — implementarea reală, activă doar dacă
  `Firebase:ServiceAccountKeyPath` din `appsettings` arată spre un fișier JSON de cont de
  service Firebase valid (vezi Program.cs).
- **`NullPushNotificationSender`** — folosită implicit (dezvoltare, fără cont Firebase încă);
  notificările în-app tot funcționează normal, doar push-ul real nu pleacă. Un avertisment
  apare o singură dată în log la pornire dacă push-ul e dezactivat.

Un token de push aparține unui dispozitiv/instalare, NU unui utilizator pe viață (`Token` e
unic global, nu per user) — dacă apare din nou legat de alt cont (device resetat, alt login
pe același telefon), se reasignează, nu se duplică. FCM raportează tokenurile devenite
invalide (aplicație dezinstalată) la trimitere — `NotificationService` le șterge automat din
bază când se întâmplă, ca să nu încerce la nesfârșit un dispozitiv care nu mai există.
