# Referință API

Contract complet pentru implementarea backend-ului real (ASP.NET Core, `backend/`).
Sursa de-adevăr comportamentală până la implementare e mock-ul din
`mobile/src/api/mock/server.ts` (+ `data.ts`/`bobData.ts`/`bobTypes.ts`/`types.ts`) —
orice ambiguitate de mai jos se rezolvă verificând acolo, nu presupunând.

Pentru DATELE cu care trebuie populată baza la prima rulare (utilizatori, locații,
beneficiari, catalogul BOB etc.), vezi `docs/SEED_DATA.md` — document separat, ca să nu
amestecăm contractul de rută cu conținutul propriu-zis.

Bază: `http://localhost:5017`. Toate endpoint-urile, în afară de `POST /api/auth/login`,
cer header-ul `Authorization: Bearer <token>` — lipsă → `401`. Cele marcate **Nucleus**
cer în plus rolul respectiv — un voluntar primește `403`. Explorare interactivă:
`/swagger`, cu exemple în `backend/src/Emaus.Api/Emaus.Api.http`.

## Cuprins

1. [Convenții generale](#1-convenții-generale)
2. [Autentificare & profil propriu](#2-autentificare--profil-propriu)
3. [Utilizatori](#3-utilizatori)
4. [Locații & unități](#4-locații--unități)
5. [Beneficiari](#5-beneficiari)
6. [Solicitări & cazări](#6-solicitări--cazări-fluxul-central)
7. [Curățenie & chei](#7-curățenie--chei)
8. [Mentenanță](#8-mentenanță)
9. [Activități (voluntariat)](#9-activități-voluntariat)
10. [Notificări](#10-notificări)
11. [Dashboard & meniu](#11-dashboard--meniu)
12. [Jurnal de cereri (debugging)](#12-jurnal-de-cereri-debugging)
13. [Box of Blessing (BOB) — al doilea proiect](#13-box-of-blessing-bob--al-doilea-proiect)

---

## 1. Convenții generale

**Format erori** — corp JSON `{ "error": "mesaj în română, gata de-afișat" }`, coduri
HTTP standard: `400` date invalide, `401` neautentificat, `403` fără rol, `404`
inexistent, `409` conflict de stare (ex. acțiune pe o entitate în starea greșită).

**Date calendaristice** — două formate distincte, NU interschimbabile:
- **Dată simplă** (`"AAAA-LL-ZZ"`, ex. `"2026-09-10"`) — pentru câmpuri care sunt doar
  o zi, fără oră: `requestedCheckIn`, `actualCheckOut`, `scheduledDate` etc.
- **Dată+oră completă** (ISO 8601 cu oră, ex. `"2026-09-10T14:32:00.000Z"`) — pentru
  timestamp-uri: `createdAt`, `decidedAt`, `resolvedAt`, `completedAt`.

**Paginare** — unde e cazul (deocamdată doar `GET /api/beneficiaries`), forma e:
```
{ items: T[], page: number, pageSize: number, total: number, hasMore: boolean }
```

**Câmpuri "încă nu există în backend"** — marcate explicit `[NOU]` mai jos. Sunt deja
folosite de aplicația mobilă (fie din mock, fie trimise real la server) — de adăugat la
entitate/DTO/migrare ca partea de mobil să nu mai trebuiască adaptată la reconectare.

**Enumuri** (serializate ca text, prin `JsonStringEnumConverter` — vezi `Program.cs`,
nu ca index numeric):

| Enum | Valori |
|---|---|
| `UserRole` | `Volunteer`, `Nucleus` |
| `UnitStatus` | `Available`, `Occupied`, `NeedsCleaning`, `CleaningInProgress`, `Unavailable` |
| `BeneficiaryStatus` | `Active`, `Blocked` |
| `BookingStatus` | `PendingApproval`, `Approved`, `Rejected`, `Active`, `Completed`, `Cancelled` |
| `MaintenanceTicketType` | `Supplies`, `Repair`, `Urgent` |
| `MaintenanceTicketPriority` | `Low`, `Medium`, `High`, `Urgent` |
| `MaintenanceTicketStatus` | `New`, `Assigned`, `InProgress`, `Resolved` |
| `CleaningTaskStatus` | `Pending`, `InProgress`, `Done` |
| `DayOfWeekName` | `Sunday`…`Saturday` (nume `System.DayOfWeek`, nu 0-6) |
| `OpportunityType` | `Cleaning`, `Event`, `Visit`, `Promotion` |
| `NotificationType` | `NewBookingRequest`, `BookingDecided`, `NewCommentOnBooking`, `UnitNeedsCleaning`, `NewMaintenanceTicket`, `MaintenanceTicketAssigned`, `NewOpportunityPublished`, `NewUserRequest` |
| `BobBeneficiaryStatus` **[NOU — BOB]** | `Active`, `Former`, `Possible` |
| `BobMobility` **[NOU — BOB]** | `Deplasabil`, `Nedeplasabil` |
| `UserStatus` **[NOU]** | `PendingApproval`, `Active`, `Rejected` |

---

## 2. Autentificare & profil propriu

### `POST /api/auth/login` — public
Login cu telefon SAU email, în același câmp (`identifier`), case-insensitive pe email.

Body: `{ identifier: string, password: string }`
Response: `{ token: string, user: UserDto }` — `401` dacă nu se potrivește nimic, parola e
greșită, sau contul nu e (încă) `Active` (vezi mai jos ordinea exactă a verificărilor).

```ts
UserDto { id, fullName, phone: string | null, email: string | null, role: UserRole }
```
`phone` **nullable** — un cont poate exista doar cu email (auto-înregistrare cu un singur
identificator).

**Ordinea verificărilor la login** (parola ÎNAINTE de status, ca să nu se dezvăluie starea
unui cont cuiva care doar ghicește un telefon/email fără parola corectă):
1. Cont inexistent SAU parolă greșită → `401`, mesaj generic ("Telefon/email sau parolă greșite.").
2. Parolă corectă, dar `Status == PendingApproval` → `401`, "Contul tău așteaptă aprobare din partea Nucleului."
3. Parolă corectă, dar `Status == Rejected` → `401`, "Cererea ta de acces a fost respinsă."
4. Parolă corectă, `Status == Active`, dar `IsActive == false` (dezactivat ulterior) → `401`, "Contul a fost dezactivat."
5. Altfel → `200` cu token.

### `POST /api/auth/register` — public **[NOU]**
Auto-înregistrare — **NU creează un cont utilizabil imediat**, doar o cerere de acces.
Body: `{ fullName: string, phone?: string, email?: string, password: string, requestedRole: UserRole }`
Response: `204` — `400` dacă nu e completat niciunul din `phone`/`email`, dacă `fullName` e
gol după `trim()`, sau dacă `password` are sub 6 caractere; `409` dacă `phone`/`email` sunt
deja folosite de alt cont.
Regulă: contul se creează cu `Status: PendingApproval`, cu rolul cerut (`requestedRole`) —
NU poate face login până nu decide cineva din Nucleus (§3, `approve`/`reject`).
Efect: notifică Nucleus (`NewUserRequest`).

### `GET /api/auth/me`
Response: `UserDto` propriu.

### `PATCH /api/auth/me`
Body: `{ fullName: string }` — `400` dacă gol/lipsă după `trim()`.
Response: `UserDto` actualizat.
Regulă: numele afișat pe conținutul deja creat (comentarii, "raportat de", rotația de
curățenie) NU se retroactivează — rămâne instantaneul de la momentul acțiunii.

---

## 3. Utilizatori

Există DOUĂ căi ca cineva să capete un cont, care coexistă:
- **Auto-înregistrare cu aprobare** (§2, `POST /api/auth/register`) — cererea pornește
  `PendingApproval`, un Nucleus o aprobă sau o respinge mai jos.
- **Creare directă de către Nucleus** (`POST /api/users` de mai jos) — contul pornește direct
  `Active`, fără cerere; util când Nucleus vrea să adauge pe cineva fără să mai aștepte.

### `GET /api/users` — Nucleus
Response: `UserDto[]` — conturile active (`Status: Active` ȘI `IsActive: true`) — nu include
cereri în așteptare sau respinse.

### `GET /api/users/pending` — Nucleus **[NOU]**
Response: `PendingUserDto[]`, cele mai vechi cereri primele.
```ts
PendingUserDto { id, fullName, phone: string | null, email: string | null, requestedRole: UserRole, createdAt: string }
```

### `POST /api/users` — Nucleus
Creează un cont nou direct (voluntar sau nucleu), fără cerere — pornește `Status: Active`.
Body: `{ fullName: string, phone?: string, email?: string, password: string, role: UserRole }`
Response: `UserDto` nou — `409` dacă `phone` e deja folosit.

### `POST /api/users/{id}/approve` — Nucleus **[NOU]**
Body: `{ role?: UserRole }` — opțional, ca Nucleus să corecteze rolul cerut înainte de
aprobare (ex. cineva a bifat greșit "Nucleus" în loc de "Voluntar"); dacă lipsește, rămâne
rolul cerut la înregistrare.
Response: `UserDto` — `Status → Active` — `404` dacă cererea nu există, `409` dacă a fost
deja procesată (aprobată sau respinsă).

### `POST /api/users/{id}/reject` — Nucleus **[NOU]**
Body: `{ reason?: string }`.
Response: `204` — `Status → Rejected`, `IsActive → false` — `404`/`409` la fel ca la approve.

### `POST /api/users/{id}/deactivate` — Nucleus
Dezactivează un cont deja activ (`IsActive → false`) — separat de respingerea unei cereri.

---

## 4. Locații & unități

### `GET /api/properties`
Response: `PropertyDto[]` — toate, cu unitățile lor.

### `GET /api/properties/{id}`
Response: `PropertyDto` — `404` dacă nu există.

```ts
PropertyDto {
  id, address: string, shortLabel: string, isTemporary: boolean, notes: string | null,
  interfon: string | null,        // [NOU]
  keyHolders: string[],           // [NOU]
  keyNotes: string | null,        // [NOU]
  lifetimeStayDays: number | null,          // [NOU]
  lifetimeBookingsCompleted: number | null, // [NOU]
  units: UnitDto[]
}
UnitDto { id, propertyId, name, capacity: number, status: UnitStatus, statusNotes: string | null }
```
`shortLabel` — etichetă scurtă pentru liste (adresa completă apare doar pe fișa
locației). `keyHolders`/`keyNotes`/`interfon` — cine are cheile locației, cum se intră.
`lifetimeStayDays`/`lifetimeBookingsCompleted` — totaluri istorice REALE, introduse
manual (istoricul complet dinainte de aplicație nu se reintroduce rând-cu-rând) — NU
calculate din rândurile de `Booking`.

### `POST /api/properties` — Nucleus
Adaugă o adresă nouă.

### `PATCH /api/properties/{id}` — Nucleus
Body: `{ address?, shortLabel?, notes?, interfon?, keyHolders?: string[], keyNotes? }`
Response: `PropertyDto` actualizat. Editează identitatea locației — NU statusul
unităților (asta e ruta de mai jos).

### `POST /api/properties/{id}/units` — Nucleus
Adaugă o unitate cazabilă la o adresă.

### `PATCH /api/units/{id}/status`
Body: `{ status: UnitStatus, statusNotes: string | null }`
Response: `UnitDto` actualizat.
Efect: dacă noul status e `NeedsCleaning` și înainte NU era (evită retrimitere la
fiecare salvare), notifică (`UnitNeedsCleaning`) voluntarii din rotația de curățenie a
locației respective (vezi §7 — `cleaningAssignments` filtrate pe `propertyId`).

### `GET /api/units/available`
Response: `UnitDto[]` — toate unitățile cu `status == Available`, din toate locațiile.

---

## 5. Beneficiari

### `GET /api/beneficiaries?search=&page=&pageSize=`
**Paginat** — `page` implicit `1`, `pageSize` implicit `30`.
Response:
```ts
PagedResult<BeneficiaryDto>   // { items, page, pageSize, total, hasMore }
```
- **Ordine implicită "recenți întâi"** dacă nu se cere altceva — are nevoie de o
  coloană `CreatedAt` pe entitate ca să poată sorta așa (mock-ul simulează prin ordinea
  de inserare, care nu există fără o coloană explicită într-o bază relațională).
- **`search` trebuie să ignore diacriticele** — "atsi" trebuie să găsească un nume ca
  "Ștefănescu". Normalizează AMBELE părți (textul căutat și numele din bază)
  eliminând diacriticele înainte de comparație. Căutarea se aplică pe `fullName`
  (fără diacritice) SAU `phone` (`Contains` simplu, cifrele nu sunt afectate de
  normalizare).

```ts
BeneficiaryDto {
  id, fullName, phone: string | null,
  localityId: number | null, localityName: string | null, localityFreeText: string | null,
  address: string | null,          // [NOU] — domiciliul stabil, strada/numărul (Locality = doar localitate/județ)
  idCardSeries: string | null,     // [NOU]
  idCardNumber: string | null,     // [NOU]
  supportPersonName: string | null,   // [NOU] — persoana de sprijin desemnată de beneficiar
  supportPersonPhone: string | null,  // [NOU]
  age: number | null, materialSituation: string | null, referralSource: string | null,
  status: BeneficiaryStatus, blockedReason: string | null, accountBalance: number,
  notes: string | null
}
```
`address`/`idCardSeries`/`idCardNumber`/`supportPersonName`/`supportPersonPhone` — cerute de
"Contractul de acordare a serviciilor sociale" (I. Părțile contractului), nu doar de fișa
internă a beneficiarului. `supportPersonName`/`Phone` NU e managerul de caz (acela e pe
`Booking`, §6 — poate diferi de la o cazare la alta; persoana de sprijin ține de beneficiar
ca persoană, nu de un contract anume).

### `GET /api/beneficiaries/{id}`
Response: `BeneficiaryDto` — `404` dacă nu există.

### `POST /api/beneficiaries`
Body: `{ fullName, phone?, localityId?, localityFreeText?, address?, idCardSeries?, idCardNumber?, supportPersonName?, supportPersonPhone?, age?, materialSituation?, referralSource?, notes? }`
Response: `BeneficiaryDto` nou — `status: Active`, `accountBalance: 0`, `blockedReason: null` implicit.

### `PATCH /api/beneficiaries/{id}`
Body: aceleași câmpuri ca la creare (oricare, opțional) — **NU** și `status`/
`blockedReason`/`accountBalance`, alea sunt treaba rutelor de mai jos.
Response: `BeneficiaryDto` actualizat.

### `POST /api/beneficiaries/{id}/block` — Nucleus
Body: `{ reason: string }` (implicit `"Nespecificat"` dacă gol).
Response: `BeneficiaryDto` — `status → Blocked`, `blockedReason` setat.

### `POST /api/beneficiaries/{id}/unblock` — Nucleus
Response: `BeneficiaryDto` — `status → Active`, `blockedReason → null`.

---

## 6. Solicitări & cazări (fluxul central)

Mașina de stări a unui `Booking`:
```
PendingApproval ──decide(approved=false)──> Rejected
       │
       ├──decide(approved=true)──> Approved ──allocate──> Active ──checkout──> Completed
       │                               │
       └──cancel──> Cancelled <────────┘ (cancel, doar dacă încă nealocată)
```

### `GET /api/bookings?status=&unitId=&propertyId=&beneficiaryId=`
Response: `BookingDto[]`, sortate `createdAt` descrescător. Toate filtrele opționale,
combinabile — `unitId`/`propertyId` sunt ce folosește ecranul unei locații ca să arate
cine stă acum + istoricul (o cerere încă nealocată n-are `unitId`, deci nu apare
filtrată pe locație); `beneficiaryId` e ce folosește fișa unui beneficiar ca să-i arate
tot istoricul, indiferent de locație.

```ts
BookingDto {
  id, beneficiaryId, beneficiaryName: string,
  beneficiaryPhone: string | null,   // CALCULAT la servire, vezi mai jos
  unitId: string | null, unitName: string | null, propertyAddress: string | null,
  requestedCheckIn: string, requestedCheckOut: string,   // dată simplă
  actualCheckIn: string | null, actualCheckOut: string | null,   // dată simplă
  status: BookingStatus,
  createdByName: string, createdAt: string,   // dată+oră
  decidedByName: string | null, decidedAt: string | null, decisionNote: string | null,
  caseManagerUserId: string | null, caseManagerName: string | null,   // [NOU]
  comments: BookingCommentDto[]
}
BookingCommentDto { id, authorUserId, authorName, text, createdAt }
```
**`beneficiaryPhone`** — NU se stochează pe `Booking`, se preia LIVE din
`Beneficiary.Phone` la fiecare răspuns (join, nu duplicare) — ca telefonul afișat să
rămână mereu sincronizat cu fișa curentă a beneficiarului, fără fetch separat din mobil.

**`caseManagerUserId`/`caseManagerName`** — managerul de caz cerut de "Contractul de
acordare a serviciilor sociale" (I. Părțile contractului), desemnat PER CAZARE (poate diferi
de la o cazare la alta a aceluiași beneficiar) — orice utilizator din echipă (voluntar sau
Nucleus), setat/schimbat prin `PATCH /api/bookings/{id}` de mai jos, indiferent de status.

### `GET /api/bookings/{id}`
Response: `BookingDto` — `404` dacă nu există.

### `GET /api/bookings/{id}/contract` **[NOU]**
Response: PDF-ul "Contract de acordare a serviciilor sociale" (`application/pdf`,
descărcabil), completat cu datele beneficiarului/cazării — vezi
`Emaus.Api/Services/Contracts/BookingContractDocument.cs` pentru textul integral (reprodus
din contractul real folosit de Centrul EMAUS). `404` dacă solicitarea nu există. Deschis
oricui e autentificat (nu doar Nucleus) — managerul de caz desemnat pe o cazare poate fi un
voluntar, care trebuie să poată genera/printa contractul pentru semnare. Câmpurile lipsă
(beneficiarul n-are încă C.I./adresă/persoană de sprijin completate, sau nu s-a desemnat
încă un manager de caz) apar ca linie punctată de completat manual, la fel ca pe formularul
pe hârtie — nu blochează generarea.

### `POST /api/bookings`
Body: `{ beneficiaryId, requestedCheckIn, requestedCheckOut }`
Response: `BookingDto` nou — `status: PendingApproval`, `createdByName`/`createdByUserId` = userul curent.
Efect: notifică Nucleus (`NewBookingRequest`).

### `PATCH /api/bookings/{id}` — Nucleus
Body: `{ requestedCheckIn?, requestedCheckOut?, caseManagerUserId? }`
Response: `BookingDto` actualizat — `404` dacă `caseManagerUserId` nu corespunde niciunui
utilizator; `409` dacă se schimbă `requestedCheckIn`/`requestedCheckOut` și statusul nu e
`PendingApproval`/`Approved` (vezi regula de mai jos) — desemnarea managerului de caz NU are
această restricție, se poate face oricând.
Regulă: perioada CERUTĂ se editează doar înainte de alocare — după (`Active`), perioada
reală (`actualCheckIn`/`actualCheckOut`) preia rolul, cererea inițială nu se mai atinge.

### `POST /api/bookings/{id}/comments`
Body: `{ text: string }`
Response: `BookingDto` cu comentariul adăugat.
Efect: notifică Nucleus (`NewCommentOnBooking`).

### `POST /api/bookings/{id}/decide` — Nucleus
Body: `{ approved: boolean, note?: string }`
Response: `BookingDto` — `409` dacă statusul nu e `PendingApproval`.
Regulă: `status → Approved`/`Rejected`, `decidedByName`/`decidedAt`/`decisionNote` setate.
Efect: notifică autorul cererii (`BookingDecided`).

### `POST /api/bookings/{id}/allocate` — Nucleus
Body: `{ unitId: string }`
Response: `BookingDto` — `409` dacă statusul nu e `Approved` SAU unitatea nu e `Available`; `404` dacă unitatea nu există.
Regulă: unitate `→ Occupied`; `booking.unitId/unitName/propertyAddress` setate,
`actualCheckIn → azi`, `status → Active`.

### `POST /api/bookings/{id}/checkout` — Nucleus
Body: `{ actualCheckOutDate?: string }` (implicit azi dacă lipsă).
Response: `BookingDto` — `409` dacă statusul nu e `Active` sau n-are `unitId`.
Regulă: `actualCheckOut` setat, `status → Completed`, unitate `→ NeedsCleaning` +
creează automat un `CleaningTask` nou (`status: Pending`, `scheduledDate: azi`).
Efect: notifică (`UnitNeedsCleaning`) voluntarii din rotația de curățenie a locației.

### `POST /api/bookings/{id}/cancel` — Nucleus
Response: `BookingDto` — `409` dacă are deja `unitId` SAU statusul nu e
`PendingApproval`/`Approved` (doar o cerere încă nealocată poate fi anulată).
Regulă: `status → Cancelled`.

---

## 7. Curățenie & chei

### `GET /api/cleaning/tasks?onlyPending=`
Response: `CleaningTaskDto[]`, sortate `scheduledDate` crescător. `onlyPending=true`
exclude cele cu `status: Done`.
```ts
CleaningTaskDto { id, unitId, unitName, propertyAddress, scheduledDate: string,
  status: CleaningTaskStatus, completedByName: string | null, completedAt: string | null, notes: string | null }
```

### `POST /api/cleaning/tasks/{id}/complete`
Response: `CleaningTaskDto` — `status → Done`, `completedByName`/`completedAt` = userul curent.
Efect: unitatea aferentă `→ Available`.

### `GET /api/cleaning/assignments?propertyId=`
Response: `CleaningAssignmentDto[]` — rotația de responsabili, opțional filtrată pe locație.
```ts
CleaningAssignmentDto { id, propertyId, propertyAddress, volunteerUserId, volunteerName,
  scheduledDayOfWeek: DayOfWeekName | null }
```

### `POST /api/cleaning/assignments` — Nucleus
Body: `{ propertyId, volunteerUserId, scheduledDayOfWeek?: DayOfWeekName }`
Response: `CleaningAssignmentDto` nou — `404` dacă locația sau voluntarul nu există.

---

## 8. Mentenanță

### `GET /api/maintenance?status=`
Response: `MaintenanceTicketDto[]`, sortate `createdAt` descrescător, opțional filtrate pe status.
```ts
MaintenanceTicketDto { id, propertyId, propertyAddress, type: MaintenanceTicketType,
  description: string, priority: MaintenanceTicketPriority, status: MaintenanceTicketStatus,
  estimatedCost: number | null, actualCost: number | null, photoUrl: string | null,
  reportedByName: string, createdAt: string, assignedToName: string | null, resolvedAt: string | null }
```

### `POST /api/maintenance`
Body: `{ propertyId, type, description, priority, estimatedCost?, photoUrl? }`
Response: `MaintenanceTicketDto` nou — `status: New`, `reportedByName` = userul curent — `404` dacă locația nu există.
Efect: notifică Nucleus (`NewMaintenanceTicket`).

### `POST /api/maintenance/{id}/assign` — Nucleus
Body: `{ assignedToUserId: string }`
Response: `MaintenanceTicketDto` — `status → Assigned`, `assignedToName` setat — `404` dacă sesizarea sau persoana nu există.
Efect: notifică persoana asignată (`MaintenanceTicketAssigned`).

### `POST /api/maintenance/{id}/resolve`
Body: `{ actualCost?: number }`
Response: `MaintenanceTicketDto` — `status → Resolved`, `actualCost`/`resolvedAt` setate.

---

## 9. Activități (voluntariat)

Rută/DTO-uri rămân denumite "opportunities" — doar eticheta din UI a devenit
"Activități" (fostă "Voluntariat"), fără nicio schimbare de contract.

### `GET /api/opportunities`
Response: `OpportunityDto[]`, sortate după `scheduledAt` crescător — cele fără dată
stabilită coboară la coada listei.
```ts
OpportunityDto {
  id, type: OpportunityType, title: string, description: string | null,
  scheduledAt: string | null,   // [NOU] acum nullable — "dată de stabilit"
  hasTime: boolean,             // [NOU] — separat de existența datei: are și ORĂ aleasă?
  propertyId: string | null, propertyAddress: string | null, capacity: number | null,
  signedUpCount: number, currentUserSignedUp: boolean
}
```
`signedUpCount`/`currentUserSignedUp` — calculate la servire din lista de înscriși
(nu returna lista brută de user id-uri către client).

### `GET /api/opportunities/{id}`
Response: `OpportunityDto` — `404` dacă nu există.

### `POST /api/opportunities` — Nucleus
Body: `{ type, title, description?, scheduledAt: string | null, hasTime: boolean, propertyId?: string, capacity?: number, notifyEveryone: boolean }`
Response: `OpportunityDto` nou.
`notifyEveryone` **NU se stochează pe entitate** — doar controlează efectul:
Efect: dacă `notifyEveryone === true`, notifică TOȚI voluntarii (`NewOpportunityPublished`); dacă `false`, nicio notificare.

### `PATCH /api/opportunities/{id}` — Nucleus
Body: aceleași câmpuri ca la creare, FĂRĂ `notifyEveryone` (n-are sens la o editare ulterioară).
Response: `OpportunityDto` actualizat — nu retrimite nicio notificare.

### `POST /api/opportunities/{id}/signup`
Response: `OpportunityDto` — `409` dacă `capacity` atins și userul curent nu era deja înscris.
Regulă: adaugă userul curent la lista de înscriși (idempotent — nu duplică dacă e deja înscris).

### `DELETE /api/opportunities/{id}/signup`
Response: `OpportunityDto` — scoate userul curent din lista de înscriși.

---

## 10. Notificări

### `GET /api/notifications/mine?onlyUnread=`
Response: `NotificationDto[]`, doar ale userului curent, sortate `createdAt` descrescător.
```ts
NotificationDto { id, type: NotificationType, message: string,
  relatedEntityType: string | null, relatedEntityId: string | null, isRead: boolean, createdAt: string }
```

### `POST /api/notifications/{id}/read`
Response: `NotificationDto` — `isRead → true` — `404` dacă notificarea nu există SAU nu aparține userului curent.

### `POST /api/notifications/push-token` **[NOU]**
Body: `{ token: string, platform?: string }` — `token` = tokenul FCM al dispozitivului curent,
`platform` opțional (`"ios" | "android" | "web"`, doar informativ). Apelat de mobil după login
și după orice reînnoire de token dată de sistemul de operare. Idempotent — `token` e unic
global (nu per utilizator): dacă același token apare din nou legat de alt cont (device
resetat, alt login pe același telefon), se reasignează userului curent, nu se duplică.
Response: `204`.

### `DELETE /api/notifications/push-token`
Body: `{ token: string }`. Apelat la logout, ca dispozitivul să nu mai primească push pentru
contul din care utilizatorul tocmai a ieșit. `204` indiferent dacă tokenul mai există sau nu.

**Push real (FCM), nu doar notificarea în-app** — `NotifyRoleAsync`/`NotifyUserAsync`/
`NotifyUsersAsync` (folosite de toate efectele de mai sus din document: solicitare nouă,
decizie, comentariu, unitate ce necesită curățenie, sesizare de mentenanță, activitate nouă)
scriu întotdeauna rândul de notificare în bază ȘI trimit un push real către tokenurile
înregistrate ale destinatarilor, prin Firebase Cloud Messaging. Dacă push-ul nu e configurat
(fără cont Firebase încă, vezi `backend/CLAUDE.md`) sau eșuează, notificarea în-app tot se
salvează normal — push-ul e cel mai bun efort, nu o condiție pentru restul fluxului.

---

## 11. Dashboard & meniu

### `GET /api/stats/overview`
```ts
OverviewStatsDto {
  locationsCount, unitsCount, occupiedUnitsCount: number,        // calculate LIVE din Property/Unit
  lifetimeStayDays: number, lifetimeStayYears: number,           // suma Property.lifetimeStayDays / 365
  lifetimeBookingsCompleted: number,                              // suma Property.lifetimeBookingsCompleted
  volunteersCount: number,                                        // count User where Role == Volunteer
  beneficiariesThisYear: number,   // beneficiari DISTINCȚI cu o cazare Activă/Încheiată al cărei actualCheckIn e în anul curent
  startDate: string,                // "2022-01-24" — REALĂ, dată fixă de configurare (nu calculată)
  currentBalance: number,           // sold curent — valoare de configurare, PLACEHOLDER (0)
  estimatedMonthlyExpenses: number, // cheltuieli lunare estimative — valoare de configurare, PLACEHOLDER (0)
  contactPhone: string | null,      // telefonul asociației — valoare de configurare, PLACEHOLDER (null)
  announcement: string | null       // o singură "noutate" afișată — valoare de configurare, PLACEHOLDER (null)
}
```
Ultimele 4 (`currentBalance`/`estimatedMonthlyExpenses`/`contactPhone`/`announcement`)
NU se calculează din alte date — au nevoie de un loc editabil (un ecran mic de
setări-organizație pentru Nucleus, sau măcar o coloană editabilă direct în bază la
început). `startDate` e singura reală; restul, placeholder până vin cifrele.

### `GET /api/menu?project=emaus|bob`
```ts
MenuConfigDto {
  tabs: MenuItemDto[],              // EXACT 4 — ultimul mereu spre Meniu
  moreSections: MenuSectionDto[]
}
MenuItemDto { key: string, label: string, href: string, icon: string }   // icon = emoji
MenuSectionDto { title: string, items: MenuItemDto[] }
```
`?project=bob` servește meniul BOB (§13) în loc de cel Emaus (implicit) — vezi §13
pentru context complet despre cele două proiecte din aceeași aplicație. Scop general al
rutei: un Nucleus să poată redenumi/reordona un tab din backend fără update de
aplicație — la scara actuală, conținutul poate fi și hardcodat într-un singur loc pe
server, nu neapărat editabil prin UI încă.

---

## 12. Jurnal de cereri (debugging)

### `GET /api/logs?method=&path=&statusCode=&take=` — Nucleus
Ultimele cereri HTTP către API, cele mai noi primele. Toate filtrele opționale,
combinabile — ex. `GET /api/logs?method=POST&statusCode=409&take=50`. `take` limitat la
500 per cerere.

Fiecare cerere e înregistrată automat de `RequestLoggingMiddleware` (metodă, cale+query,
cod status, durată ms, cine a făcut cererea dacă autentificat, IP, mesajul erorii dacă a
picat). Util în dezvoltare — vezi direct din Swagger ce trimite aplicația.

Notă: tabela crește nelimitat (fără curățare automată încă) — de adăugat un job de
ștergere periodică (păstrează doar ultimele 30 de zile) înainte de producție.

---

## 13. Box of Blessing (BOB) — al doilea proiect

**Context, esențial de înțeles înainte de a implementa:** aceeași aplicație mobilă
găzduiește acum DOUĂ proiecte ale asociației — Emaus (§1-12, cazări) și "Box of
Blessing" (cutii lunare cu alimente pentru beneficiari, de mai jos). Utilizatorul
comută între ele dintr-un meniu ("Proiect: Emaus / Box of Blessing" — ecranul Meniu),
dar rămâne LOGAT CU ACELAȘI CONT — nu sunt două aplicații sau doi useri, doar
navigarea principală se schimbă (§11 → `GET /api/menu?project=`). BOB nu are propriul
sistem de autentificare — `Authorization: Bearer <token>`, la fel ca restul.

**Permisiuni — decizie de produs confirmată cu utilizatorul:** toate rutele BOB de mai
jos sunt deschise oricui e logat, fără restricție de rol — spre deosebire de Emaus, unde
acțiunile administrative sunt clar Nucleus-only. Proiectul BOB e gândit ca un instrument
colaborativ pentru un grup mic de voluntari, fără ierarhia Nucleus/Voluntar de la Emaus.

**Arhitectură** (detaliat în `ARCHITECTURE.md`): entități noi, într-un namespace/folder
separat în `Emaus.Domain` (`Emaus.Domain/Bob/`) — NU un proiect .NET separat, ar
complica deployment-ul și autentificarea comună fără beneficiu real la scara asta.
Același tipar Controller → Service → Repository ca restul backend-ului.

### 13.1 Beneficiari BOB — entitate SEPARATĂ de `Beneficiary` (Emaus)

Nu reutiliza entitatea `Beneficiary` de la Emaus — listă de oameni diferită, câmpuri
diferite (fără sold/blocare, cu mobilitate și responsabil).

```ts
BobBeneficiaryDto {
  id, fullName: string, phone: string | null,
  mobility: BobMobility | null,       // "Deplasabil" | "Nedeplasabil"
  address: string | null,             // folosit și pt. link direct spre Maps în mobil (client-side)
  assignedVolunteerName: string | null,
  status: BobBeneficiaryStatus,       // "Active" | "Former" | "Possible"
  contacted: boolean,   // bifa "Am vorbit" — pt. runda curentă de livrare
  delivered: boolean,   // bifa "Livrat" — pt. runda curentă de livrare
  notes: string | null
}
```
- `status` vine dintr-un tabel original trimis de utilizator, unde erau secțiuni
  separate ("Foști beneficiari"/"Posibili beneficiari") — UI-ul mobil arată implicit
  doar `Active`, cu opțiune explicită de-a le arăta pe toate.
- `assignedVolunteerName` — **text liber, dintr-o listă fixă mock în UI**
  ("Cristi"/"Sami"/"George"/"Ștefan"), NU o cheie străină spre `User` — confirmat cu
  utilizatorul: rămâne text liber, ca să permită responsabili fără cont Emaus (ex. "George").
- `contacted`/`delivered` sunt pentru RUNDA CURENTĂ — rămân câmpuri simple, resetate
  manual din UI la începutul unei runde noi (nu există o rutină automată de resetare,
  și nu devin istoric per-rundă — doar `BobDeliveryRecord`, §13.3, ține istoric real).

| Metodă & rută | Cine | Ce face |
|---|---|---|
| `GET /api/bob/beneficiaries` | autentificat | toți (fără paginare — set mic, ~10-20) |
| `GET /api/bob/beneficiaries/{id}` | autentificat | unul — `404` dacă nu există |
| `POST /api/bob/beneficiaries` | autentificat | body = orice subset de câmpuri de mai sus (fără `id`); implicit `status: Active`, `contacted`/`delivered: false` |
| `PATCH /api/bob/beneficiaries/{id}` | autentificat | body = orice subset, aplicat câmp-cu-câmp (folosit inclusiv pt. toggle rapid `contacted`/`delivered`/`assignedVolunteerName` direct din listă, un câmp o dată) |

### 13.2 Catalog cutie — articole + bifă "în cutia curentă"

```ts
BoxCategoryDto { key: string, title: string, items: BoxItemDto[] }
BoxItemDto { id, name: string, price: number, checked: boolean }
```
`checked` = "face parte din runda de cumpărături în lucru ACUM", nu un istoric — vezi
§13.3 pentru asta.

| Metodă & rută | Cine | Ce face |
|---|---|---|
| `GET /api/bob/box` | autentificat | toate categoriile, cu articolele lor |
| `PATCH /api/bob/box/items/{id}` | autentificat | body: `{ checked?, price?, name? }`, oricare independent — `404` dacă articolul nu există |
| `POST /api/bob/box/items` | autentificat | body: `{ categoryKey, name, price }` — adaugă articol nou într-o categorie existentă, `checked: true` implicit — `404` dacă categoria nu există |

**`price` se editează des** (prețurile la raft se schimbă lunar) — pe fir circulă mereu ca
`number` JSON (`decimal` pe backend), nu text. Normalizarea unei intrări cu virgulă
("5,99") în număr e responsabilitatea clientului, ÎNAINTE de trimitere (mobilul face asta
în `parseDecimal()`, vezi `mobile/src/utils/number.ts`) — backend-ul primește deja un
`number` valid, fără ambiguitate de separator zecimal.

**Configurare separată** (nu pe catalog): buget maxim per cutie — momentan valoare fixă
(99.28 lei, din excel-ul original trimis de utilizator), la fel ca `currentBalance` de
la Emaus (§11): are nevoie de un loc editabil, nu calculat.

### 13.3 Istoric cumpărături — **TREBUIE să persiste real**

Singura parte din tot ce precede care nu e doar "de dezvoltare" — utilizatorul a cerut
explicit persistență reală ("să se salveze"). Mock-ul o ține temporar cu `AsyncStorage`
pe dispozitiv EXACT ca să nu se piardă până există un backend; odată ce există bază de
date reală, un tabel obișnuit rezolvă asta — nu reproduce "persistență pe dispozitiv"
în spate, doar salvează normal, ca orice altă entitate.

```ts
BobDeliveryRecordDto {
  id, date: string,                      // dată simplă, ziua cumpărăturilor
  items: { name: string, price: number }[],   // INSTANTANEU, nu referință live la BoxItem
  total: number,                          // calculat la salvare, NU recalculat ulterior
  note: string | null
}
```
`items` e un instantaneu (nume + preț DIN MOMENTUL cumpărăturii) — dacă prețul curent al
articolului se schimbă ulterior, istoricul trebuie să rămână corect, deci nu ține o
referință live la `BoxItem`.

| Metodă & rută | Cine | Ce face |
|---|---|---|
| `GET /api/bob/purchases` | autentificat | istoricul, cele mai recente primele |
| `POST /api/bob/purchases` | autentificat | body: `{ note?: string }` — `400` dacă nimic bifat |

**`POST /api/bob/purchases`** ia TOATE articolele curent `checked` din §13.2, calculează
totalul, salvează un rând nou persistent. **Nu golește bifele** după salvare — runda
următoare pornește din aceleași bife, ajustate.

### 13.4 Dashboard BOB

### `GET /api/bob/stats/overview`
```ts
BobStatsDto {
  beneficiariesCount: number,     // count BobBeneficiary where status == Active
  maxBudgetPerBox: number,        // valoare de configurare (§13.2)
  daysUntilNextDelivery: number,  // zile calendaristice până la sfârșitul lunii curente (livrarea e lunară, la final de lună)
  lastDeliveryDate: string | null,// data celui mai recent BobDeliveryRecord, sau null
  currentBoxTotal: number,        // suma articolelor BIFATE acum (§13.2, runda în lucru)
  volunteersInvolved: number      // count DISTINCT assignedVolunteerName printre beneficiarii Active
}
```
