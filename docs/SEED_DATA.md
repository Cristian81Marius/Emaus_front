# Date inițiale (seed) pentru baza de date

Datele de mai jos sunt cele deja în `mobile/src/api/mock/data.ts` (Emaus) și
`mobile/src/api/mock/bobData.ts` (Box of Blessing) — folosite acum doar pentru ca
aplicația mobilă să aibă ce arăta fără backend pornit, dar cea mai mare parte NU e
inventată: vine din evidența reală a asociației, trimisă de utilizator. Documentul
ăsta le extrage curat, într-un loc, ca să știe exact ce să pună în baza de date la
prima rulare (`DbSeeder`/migrare) — nu trebuie citit codul TypeScript ca să afli asta.

**Legendă**, la fiecare secțiune:
- 🟢 **Real** — din evidența asociației, de păstrat ca atare la seed.
- 🟡 **Exemplu sintetic** — inventat doar ca să nu fie ecranele goale în demo (fără
  corespondent real trimis) — opțional la seed, poate fi omis sau înlocuit direct cu
  date reale dacă/când apar.
- 🔵 **Cont de test** — date de dezvoltare (parole, conturi de login) — NU pentru producție.

**ID-urile de mai jos** (`"ben-cotulbea"`, `"prop-laborator-124"` etc.) sunt identificatori
mock, textuali, folosiți DOAR ca să se poată referi unele pe altele în acest document
(ex. o cazare → beneficiarul ei) — o bază de date reală își generează proprii identificatori
(GUID/identity). Păstrează relațiile (cine referă pe cine), nu valorile literale de ID.

---

## 1. Emaus

### 1.1 Utilizatori 🔵 (conturi de test — nume reale din rotația de curățenie/chei, parole/telefoane sintetice)

Parolă pentru toate: `Emaus2026!`. Alexandra e singurul cont Nucleus; restul, Voluntar.

| Nume | Telefon | Email | Rol |
|---|---|---|---|
| Alexandra | 0700000000 | alexandra@emaus.ro | Nucleus |
| David | 0711111111 | — | Volunteer |
| Alina | 0722010203 | — | Volunteer |
| Ligia | 0722020304 | — | Volunteer |
| Ioana | 0722030405 | — | Volunteer |
| Ștefan | 0722040506 | — | Volunteer |
| Dominic | 0722050607 | — | Volunteer |
| Ema | 0722060708 | — | Volunteer |
| Sami | 0722070809 | — | Volunteer |
| Cristi | 0722080910 | — | Volunteer |
| Rebeca | 0722091011 | — | Volunteer |
| Elena | 0722101112 | — | Volunteer |
| Miriam | 0722111213 | — | Volunteer |
| Florentina | 0722121314 | — | Volunteer |
| Diandra | 0722131415 | — | Volunteer |

### 1.2 Locații & unități 🟢 (adrese, chei, totaluri istorice — reale)

| ID | Adresă | Etichetă scurtă | Interfon | Are cheile | Note chei | Zile cazare (lifetime) | Cazări încheiate (lifetime) |
|---|---|---|---|---|---|---|---|
| `prop-laborator-124` | Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124 | Str. Laborator nr. 124, ap. 124 | — | Alexandra, David | 1 cheie - la beneficiari | 997 | 58 |
| `prop-laborator-94` | Str. Laborator, nr. 124, bl. 40, sc. A, et. 8, ap. 94 | Str. Laborator nr. 124, ap. 94 | — | Alexandra, Ștefan, Ligia, Diandra | 1 cheie - la beneficiari | 789 | 52 |
| `prop-dristorului-893` | Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893 | Str. Dristorului nr. 97-119, ap. 893 | 9316 c (SC 3 stânga) | Alexandra, Ștefan, Ligia | 1 cheie la beneficiari | 742 | 32 |
| `prop-dristorului-parter` | Str. Dristorului, nr. 97-119 — Parter | Str. Dristorului nr. 97-119, parter | — | — | — | — | — |
| `prop-vlad-judetul` | Str. Vlad Județul, nr. 4, bl. V13, sc. 1, et. 3, ap. 37 | Str. Vlad Județul nr. 4, ap. 37 | — | Alexandra, Ștefan | 1 cheie la beneficiari | 568 | 29 |
| `prop-traian-popovici` | Str. Traian Popovici, nr. 132, bl. B3D, sc. A, et. 5, ap. 28 | Str. Traian Popovici nr. 132, ap. 28 | 528 | Alexandra, Cristi | 2 chei la beneficiari | 523 | 51 |
| `prop-stanescu-gheorghe` | Str. Stănescu Gheorghe, nr. 1, bl. 213, sc. A, et. 1, ap. 6 | Str. Stănescu Gheorghe nr. 1, ap. 6 | — | Alexandra, Miriam | 2 chei la beneficiari | 191 | 25 |
| `prop-elev-stefanescu` | Str. Elev Ștefan Ștefănescu, nr. 9, bl. 449, sc. A, et. 2, ap. 32 | Str. Elev Ștefan Ștefănescu nr. 9, ap. 32 | — | — | — | 801 | 37 |
| `prop-airbnb-temporar`* | Locații AirBnB / temporare | Locații temporare | — | — | — | 94 | 25 |

\* `isTemporary: true`, `notes: "Cazări scurte, ad-hoc, în afara celor 7 locații fixe — rezervate punctual când e nevoie."`

Unități (toate `status: Available`, în afară de cele marcate):

| ID unitate | Locație | Nume | Capacitate | Status |
|---|---|---|---|---|
| `unit-laborator-124` | prop-laborator-124 | Ap. 124 | 3 | Available |
| `unit-laborator-94` | prop-laborator-94 | Ap. 94 | 3 | Available |
| `unit-dristorului-893` | prop-dristorului-893 | Ap. 893 | 3 | **Occupied** |
| `unit-dristorului-parter` | prop-dristorului-parter | Parter | 2 | Available |
| `unit-vlad-judetul` | prop-vlad-judetul | Ap. 37 | 2 | **Occupied** |
| `unit-traian-sufragerie` | prop-traian-popovici | Sufragerie | 3 | **Occupied** |
| `unit-traian-dormitor` | prop-traian-popovici | Dormitor | 2 | **Occupied** |
| `unit-stanescu-sufragerie` | prop-stanescu-gheorghe | Sufragerie | 3 | **Occupied** |
| `unit-stanescu-dormitor` | prop-stanescu-gheorghe | Dormitor | 2 | **Occupied** |
| `unit-elev-stefanescu` | prop-elev-stefanescu | Ap. 32 | 3 | Available |
| `unit-airbnb` | prop-airbnb-temporar | Locație temporară | 2 | Available |

*(Statusul unităților reflectă cazările Active din 1.4 — dacă seed-ul include cazările,
statusul unităților trebuie derivat de-acolo, nu ținut separat, ca să nu ajungă
desincronizate.)*

### 1.3 Beneficiari 🟢 (nume reale din evidență — restul câmpurilor, minimal completate)

Toți `status: Active`, `accountBalance: 0`, în afară de cei marcați.

| Nume | Telefon | Localitate | Provenit din | Observații |
|---|---|---|---|---|
| Cotulbea Marian | — | — | — | — |
| Șerban Emilia | — | — | — | — |
| Nuțu Dumitru | — | — | — | — |
| Cianca Mihalache | — | — | — | — |
| Micu Ramona | — | — | — | — |
| Tirsoreanu Matilda | — | — | — | — |
| Daniela Adina | — | — | — | — |
| Mama și copil | — | — | — | — |
| Fam. Bulandra | — | — | — | — |
| Beneficiar hospice | — | — | — | Pacient în îngrijire paliativă. |
| Olariu | — | — | — | **status: Blocked**, motiv: „Motiv nespecificat în evidența preluată." |
| Jingă Florina | — | — | — | — |
| Bărculescu Claudia | — | — | — | — |
| Fam. Duroi | — | — | Mehedinți | — |
| Andrei Mihai | — | — | — | — |
| Silochi Viorica | — | — | — | — |
| Ovcearenco Victor | — | — | — | — |
| Mazilu Florin | — | — | — | — |
| Ivan Erik | 0766884441 | Constanța (text liber) | — | — |
| Chesa Dumitru | 0726852804 | Constanța (text liber) | — | — |
| Fam. Enache | — | — | — | — |

### 1.4 Solicitări & cazări 🟢 (calendarul real la momentul preluării evidenței)

Datele de mai jos sunt FIXE (nu relative la azi) — reflectă starea reală la momentul
transmiterii evidenței (final august/septembrie 2026). La seed într-un mediu nou,
decide dacă le păstrezi ca istoric fix (probabil corect, sunt fapte reale petrecute) sau
le regenerezi relativ la data de pornire — NU le trata implicit ca "relative la azi", nu
sunt generate așa cum sunt `maintenanceTickets`/`opportunities`/`notifications` (1.5-1.7).

**Active — ocupanții curenți (6):**

| Beneficiar | Unitate | Check-in cerut → cerut | Check-in real | Cerută de | Decisă de |
|---|---|---|---|---|---|
| Cotulbea Marian | Ap. 893 (Dristorului) | 2026-08-31 → 2026-10-09 | 2026-08-31 | Ștefan | Alexandra — comentariu: *"Cotulbea Marian s-a instalat, totul e în regulă."* (Ligia, 2026-08-31) |
| Șerban Emilia | Ap. 37 (Vlad Județul) | 2026-07-02 → 2026-09-30 | 2026-07-02 | Alexandra | Alexandra |
| Nuțu Dumitru | Sufragerie (Traian Popovici) | 2026-08-10 → 2026-10-10 | 2026-08-10 | Cristi | Alexandra |
| Cianca Mihalache | Dormitor (Traian Popovici) | 2026-08-17 → 2026-10-09 | 2026-08-17 | Cristi | Alexandra |
| Micu Ramona | Sufragerie (Stănescu Gheorghe) | 2026-08-31 → 2026-09-18 | 2026-08-31 | Miriam | Alexandra |
| Tirsoreanu Matilda | Dormitor (Stănescu Gheorghe) | 2026-09-09 → 2026-09-11 | 2026-09-09 | Miriam | Alexandra |

**În așteptare (2):**

| Beneficiar | Cerut: check-in → check-out | Cerută de |
|---|---|---|
| Daniela Adina | 2026-09-15 → 2026-10-13 | Ligia |
| Mama și copil | 2026-09-14 → 2026-09-25 | Ligia |

**Aprobate, nealocate încă (2):**

| Beneficiar | Cerut: check-in → check-out | Decisă de |
|---|---|---|
| Fam. Bulandra | 2026-09-16 → 2026-09-24 | Alexandra |
| Beneficiar hospice | 2026-09-25 → 2026-10-09 | Alexandra |

**Respinsă (1):** Olariu, 2026-09-13 → 2026-09-15, cerută de Ligia, respinsă de Alexandra — notă: *"Beneficiar blocat."*

**Anulată (1):** Fam. Enache, 2026-09-20 → 2026-09-28, cerută de David.

**Încheiate — eșantion din istoric (10)** — *totalurile reale complete per locație sunt
`lifetimeStayDays`/`lifetimeBookingsCompleted` de la 1.2; istoricul integral (sute de
rânduri) nu e reintrodus rând-cu-rând, doar acest eșantion + totalurile:*

| Beneficiar | Unitate | Check-in → check-out real | Cerută de |
|---|---|---|---|
| Jingă Florina | Ap. 124 (Laborator) | 2026-08-03 → 2026-09-09 | David |
| Bărculescu Claudia | Ap. 124 (Laborator) | 2026-07-21 → 2026-07-23 | David |
| Fam. Duroi | Ap. 94 (Laborator) | 2026-09-06 → 2026-09-09 | Ligia |
| Andrei Mihai | Ap. 94 (Laborator) | 2026-09-01 → 2026-09-03 | Ligia |
| Silochi Viorica | Ap. 893 (Dristorului) | 2026-07-26 → 2026-08-27 | Ștefan |
| Tirsoreanu Matilda | Ap. 893 (Dristorului) | 2026-07-22 → 2026-07-24 | Ștefan |
| Ovcearenco Victor | Ap. 37 (Vlad Județul) | 2026-02-09 → 2026-06-30 | Alexandra |
| Mazilu Florin | Sufragerie (Traian Popovici) | 2026-08-13 → 2026-08-17 | Cristi |
| Fam. Corduneanu\* | Sufragerie (Stănescu Gheorghe) | 2026-09-02 → 2026-09-04 | Miriam |
| Ivan Erik | Ap. 32 (Elev Ștefănescu) | 2025-09-27 → 2025-10-12 | Alexandra |
| Chesa Dumitru | Ap. 32 (Elev Ștefănescu) | 2025-10-20 → 2025-10-22 | Alexandra |

\* Inconsistență moștenită din evidența originală: numele afișat pe această cazare era
"Fam. Corduneanu", dar `beneficiaryId`-ul din datele sursă leagă spre beneficiarul
"Fam. Enache". Backend-ul (spre deosebire de mock) NU ține un `beneficiaryName` separat
pe `Booking` — numele beneficiarului e mereu calculat live prin join, ca la
`beneficiaryPhone` (§6 din API.md) — deci nu există un loc unde să reproducem un
instantaneu diferit de beneficiarul legat. La seed, această cazare a fost legată de
"Fam. Enache" (beneficiarul real din relație) și apare deci cu acest nume, nu
"Corduneanu" — tratată ca o greșeală de transcriere în evidența originală, nu ca
intenționată.

Toate deciziile de mai sus au fost luate de **Alexandra** (singurul cont Nucleus).

### 1.5 Sesizări mentenanță 🟡 (exemple, fără corespondent real în evidență — pe locații reale)

| Locație | Tip | Descriere | Prioritate | Status | Cost estimat | Cost real | Raportat de | Asignat | Creat acum |
|---|---|---|---|---|---|---|---|---|---|
| Ap. 124 (Laborator) | Supplies | Lipsesc becuri în baie. | Low | New | 40 lei | — | David | — | -2 zile |
| Ap. 893 (Dristorului) | Repair | Robinet care picură în bucătărie. | Medium | Assigned | 120 lei | — | Ligia | Ștefan | -5 zile |
| Ap. 32 (Elev Ștefănescu) | Urgent | Fără apă caldă. | Urgent | InProgress | 300 lei | — | Alexandra | Cristi | -1 zi |
| Ap. 28 (Traian Popovici) | Repair | Ușă dulap ieșită din balamale. | Low | Resolved | 30 lei | 25 lei | Cristi | Cristi | -8 zile (rezolvat -3 zile) |

### 1.6 Curățenie 🟢 (rotația reală) + 🟡 (ture — exemple)

**Rotația de responsabili** (real, din "Repartizare locații EMAUS pentru curățenie"):

| Locație | Responsabili | Zi din săptămână |
|---|---|---|
| Ap. 124 (Laborator) | David, Alina | Duminică |
| Ap. 94 (Laborator) | Ligia, Ioana | Joi |
| Ap. 893 (Dristorului) | Ștefan, Alina, Dominic, Ema | Sâmbătă |
| Ap. 37 (Vlad Județul) | Sami, Cristi | Sâmbătă |
| Ap. 28 (Traian Popovici) | Rebeca, Elena | Sâmbătă |
| Ap. 6 (Stănescu Gheorghe) | Alexandra, Miriam, Florentina | Sâmbătă |

**Ture punctuale** (exemple):

| Unitate | Dată programată | Status | Finalizat de | Note |
|---|---|---|---|---|
| Ap. 124 (Laborator) | azi | Pending | — | Verificare înainte de sosirea Danielei Adina (15/09). |
| Ap. 893 (Dristorului) | -6 zile | Done | Ștefan | — |

### 1.7 Activități 🟡 (exemple, fără corespondent real în evidență — pe locații reale)

| Titlu | Tip | Data programată | Are oră | Locație | Capacitate | Înscriși |
|---|---|---|---|---|---|---|
| Curățenie generală Ap. 124 | Cleaning | azi + 2 zile, 10:00 | da | Ap. 124 (Laborator) | 4 | David |
| Zi de socializare cu beneficiarii | Event | azi + 7 zile, 16:00 | da | — | — | David, Ligia |
| Vizită de evaluare locație nouă | Visit | azi + 3 zile | nu (doar dată) | — | 2 | — |
| Stand de informare la eveniment caritabil | Promotion | azi + 12 zile, 18:00 | da | — | 6 | — |
| Renovare mică la Ap. 32 — dată de stabilit | Event | **de stabilit** (`null`) | — | Ap. 32 (Elev Ștefănescu) | — | — |

### 1.8 Notificări 🟡 (exemple, relative la "azi")

| Pentru | Tip | Mesaj | Citită | Acum cu |
|---|---|---|---|---|
| Alexandra | NewBookingRequest | Cerere nouă de cazare pentru Daniela Adina. | Nu | -1 zi |
| Alexandra | NewBookingRequest | Cerere nouă de cazare pentru Mama și copil. | Nu | -1 zi |
| Alexandra | NewCommentOnBooking | Comentariu nou la solicitarea lui Cotulbea Marian. | Da | -10 zile |
| Alexandra | NewMaintenanceTicket | Sesizare nouă: Fără apă caldă. | Nu | -1 zi |
| David | NewOpportunityPublished | Activitate nouă: Zi de socializare cu beneficiarii. | Da | -6 zile |
| David | UnitNeedsCleaning | Ap. 124 are nevoie de verificare înainte de următoarea cazare. | Nu | azi |

### 1.9 Configurare organizație (`GET /api/stats/overview`, câmpurile de configurare)

| Câmp | Valoare | Stare |
|---|---|---|
| `startDate` | `2022-01-24` | 🟢 Real |
| `currentBalance` | `0` | ⚪ Placeholder — de completat |
| `estimatedMonthlyExpenses` | `0` | ⚪ Placeholder — de completat |
| `contactPhone` | `null` | ⚪ Placeholder — de completat |
| `announcement` | `null` | ⚪ Placeholder — de completat |

### 1.10 Meniu (`GET /api/menu`, implicit — proiectul Emaus)

```
tabs: Locații (/) · Solicitări (/bookings) · Activități (/opportunities) · Meniu (/menu)
moreSections:
  "Gestiune": Beneficiari (/beneficiaries) · Mentenanță (/maintenance) ·
              Curățenie (/cleaning) · Notificări (/notifications)
```

---

## 2. Box of Blessing (BOB)

### 2.1 Beneficiari 🟢 (dintr-un tabel real trimis de utilizator — telefoanele au fost ușor alterate înainte de a intra în cod, la cererea utilizatorului; NU sunt numerele reale)

Toți: `contacted: false`, `delivered: false` implicit.

**Activi (10):**

| Nume | Telefon | Mobilitate | Adresă | Responsabil |
|---|---|---|---|---|
| Vintilă Alexandra | 0771.699.441 | Deplasabil | Str. Valea Ialomiței 6, Bl C10, Sc C, Et 10, Ap 192 | Sami |
| Szatmari Sanda | 0771.472.907 | Nedeplasabil | Moinești, Bl 127, Sc 2, Et 3, Ap 56 | Sami |
| Pleșca Adela Nicoleta | 0762.421.721 | Deplasabil | Str. Fabricii nr 2B-A, Bl 15D, Sc A, Et 6, Ap 32 | Cristi |
| Iliescu Gheorghe\* | 0770 778 981 | Deplasabil | Str. Ernest Juvara 31-33, Bl 1, Et 2, Ap 3 | Cristi |
| Neacșu Marioara | 0769.171.653 | Nedeplasabil | Strada Straja 12, Bl.52, Sc.2, Et 7, Ap 108 | Sami |
| Marin Alexe | — | Deplasabil | Strada Sergent Turturică 81 | George |
| Coporan Florian | 0760197138 | Deplasabil | Biserica Tuturor Sfinților Români | George |
| Fam. cu copii - Ligia | — | — | — | Ligia |
| Laurențiu Ierusalim | 0725157241 | — | — | Sami |
| Ștefănescu Rădița | 0770.256.557 | Deplasabil | Str. Rusetu 6, Bl G13, Sc 1, Et 1, Ap 6 | Sami |

\* Observație: „0314308981 - fix" (telefon fix, alterat la fel ca mobilul).

**Foști beneficiari (5):**

| Nume | Telefon | Mobilitate | Adresă |
|---|---|---|---|
| Mihăilă Smaranda | 021.745.33.11 | Nedeplasabil | Str. Latea Gheorghe 16, Bl C36, Et 5, Ap 64 |
| Chiran Gheorghița | 0727.588.971 | Deplasabil | Str Partiturii 8, Bl 62, Sc 1, Et 4, Ap 20 |
| Stoica Aurica\* | 0736.129.761 | Nedeplasabil | Drumul Cioroglarlei 147A |
| Ionescu Lucrețiu | 0733.433.427 | Deplasabil | Bd. 1 Mai nr. 26, Bl. 6S14, Sc. 1, Et 5, Ap. 62 |
| Anghelina Costinel | 0726.901.119 | Deplasabil | Str. Topazului, Bragadiru |

\* Observație: „pachet pentru cămin".

**Posibili beneficiari (2):**

| Nume | Telefon | Adresă |
|---|---|---|
| Simionescu Catinca | 021.772.60.11 | Str. Răsăritului nr. 2, Bl. M9, Sc.1, Et. 5, Ap. 34 |
| Kurt Ștefania | 0764542668 | Intrarea Drumul la Roșu nr. 8 |

### 2.2 Catalog cutie 🟢 (din excel-ul trimis de utilizator — prețuri + bifă inițială exacte)

**Băcănie:**

| Articol | Preț (lei) | Bifat |
|---|---|---|
| Făină | 1.69 | ✓ |
| Zahăr | 3.79 | ✓ |
| Sare | 2.75 | |
| Ulei | 7.59 | ✓ |
| Oțet | 3.49 | |
| Mălai | 1.99 | ✓ |
| Orez | 5.89 | |
| Fasole | 3.50 | |
| Griș | 3.19 | |

**Conserve nepreparate:**

| Articol | Preț (lei) | Bifat |
|---|---|---|
| Suc de roșii / Bulion | 5.49 | ✓ |
| Mazăre | 4.00 | |
| Fasole roșie | 3.45 | |
| Fasole albă | 3.49 | ✓ |
| Linte | 3.79 | |
| Năut | 2.99 | |
| Ciuperci | 5.99 | ✓ |
| Porumb | 4.99 | |
| Măsline | 3.89 | |
| Castraveți murați | 5.59 | |
| Varză murată | 5.30 | ✓ |
| Sfeclă roșie | 7.59 | |
| Fasole păstăi | 5.99 | |
| Roșii pastă | 3.55 | |
| Porumb (cutie mică) | 3.05 | |
| Mix de legume | 8.49 | ✓ |

**Conserve preparate:**

| Articol | Preț (lei) | Bifat |
|---|---|---|
| Hering în suc de roșii | 6.09 | ✓ |
| Hering în ulei | 4.95 | |
| Sardine | 4.49 | |
| Ton mărunțit | 4.95 | ✓ |
| Pate vegetal (mic) | 2.20 | |
| Tocană | 3.49 | ✓ |
| Zacuscă | 3.99 | |
| Pate | 6.99 | ✓ |
| Fasole cu cârnăciori | 2.99 | |
| Chiftelțe marinate | 11.19 | ✓ |
| Ciorbă fasole afumătură | 9.99 | ✓ |
| Iahnie de fasole | 7.29 | |
| Pate vegetal | 3.99 | |
| Pastă de măsline | 4.99 | |

**Făinoase:**

| Articol | Preț (lei) | Bifat |
|---|---|---|
| Supă plic | 3.39 | |
| Fidea | 2.49 | |
| Spaghetti | 2.39 | |
| Tăiței | 2.59 | ✓ |
| Penne | 3.79 | ✓ |
| Melcișori | 4.89 | |

**Dulciuri:**

| Articol | Preț (lei) | Bifat |
|---|---|---|
| Covrigi | 5.19 | ✓ |
| Corn | 4.00 | |
| Grisine | 3.49 | |
| Biscuiți sărați | 3.99 | |
| Biscuiți dulci | 1.19 | ✓ |
| Croissant | 1.69 | |
| Napolitane | 4.50 | |
| Bomboane | 8.99 | |
| Cozonac / Chec | 13.99 | |
| Ciocolată | 4.95 | |
| Prăjiturică | 1.39 | |
| Compot piersici | 7.99 | |
| Stafide | 5.99 | |

**Condimente:**

| Articol | Preț (lei) | Bifat |
|---|---|---|
| Cafea | 3.89 | |
| Ceai | 4.19 | |
| Piper | 5.99 | |
| Boia | 3.95 | |
| Busuioc | 3.95 | |
| Cacao | 5.39 | |

**Igienă & curățenie:**

| Articol | Preț (lei) | Bifat |
|---|---|---|
| Săpun | 5.99 | |
| Pastă de dinți | 2.39 | |
| Gel de duș | 4.79 | |
| Șervețele | 1.00 | |
| Detergent de vase | 5.05 | |
| Domestos | 11.50 | |
| Spirt | 5.20 | |

**Diverse & perisabile:**

| Articol | Preț (lei) | Bifat |
|---|---|---|
| Suncă pui | 8.00 | |
| Mezel | 12.00 | |
| Lapte UHT | 4.75 | |
| Brânză topită | 5.29 | |
| Drojdie | 3.57 | |

### 2.3 Configurare BOB

| Câmp | Valoare | Stare |
|---|---|---|
| `maxBudgetPerBox` | `99.28` lei | 🟢 Real — din "Conținutul Cutiei" al excel-ului trimis |
| Responsabili posibili (dropdown) | Cristi, Sami, George, Ștefan | 🟡 Listă fixă mock — vezi `docs/API.md` §13.1 pentru nota despre ce înseamnă asta pentru o cheie străină viitoare |

### 2.4 Meniu (`GET /api/menu?project=bob`)

```
tabs: Dashboard (/bob) · Beneficiari (/bob/beneficiaries) · Cumpărături (/bob/shopping) · Meniu (/menu)
moreSections:
  "Box of Blessing": Istoric cumpărături (/bob/history)
```

### 2.5 Istoric cumpărături — gol la pornire

Nu există încă niciun rând salvat (funcționalitatea a fost adăugată recent, mock-ul o
persistă local pe dispozitiv — vezi `docs/API.md` §13.3). Nimic de seed aici, doar
tabela trebuie să existe, goală, gata să primească primul `POST /api/bob/purchases`.
