# Emaus — aplicație de organizare a cazărilor

Scheletul aplicației pentru asociația Emaus: urmărirea locațiilor de găzduire gratuită,
solicitările de cazare, curățenia, cheile, cheltuielile de întreținere și implicarea
voluntarilor — vezi `docs/plan-aplicatie.html` pentru contextul complet și raționamentul
din spatele fiecărei decizii.

## Pentru asistenți AI

`CLAUDE.md` (rădăcina proiectului) conține reguli de lucru pentru un asistent AI care
continuă dezvoltarea aici — structură, capcane de mediu, convenția de livrare a
fișierelor. Nu e pentru citit de utilizatori, dar rămâne în repo ca referință.

## Pornire rapidă

Vezi **`docs/GETTING_STARTED.md`** — doi pași: pornești backend-ul, apoi aplicația mobilă/web.

## Structură

```
emausApp/
  backend/    ASP.NET Core (.NET 8) + EF Core + SQLite — vezi backend/README.md
  mobile/     Expo (React Native + TypeScript), mobil + web dintr-un singur cod — vezi mobile/README.md
  docs/
    plan-aplicatie.html   planul funcțional original (roluri, fluxuri, propuneri)
    ARCHITECTURE.md         cum sunt organizate cele două proiecte și de ce
    API.md                  toate endpoint-urile backend-ului, într-un tabel
    DESIGN_SYSTEM.md        culori + fonturi, aceleași în plan și în aplicație
    GETTING_STARTED.md      pas cu pas, pentru cineva care deschide proiectul azi
```

## Stare curentă

Backend-ul a fost scris integral (model de date, autentificare JWT, toate endpoint-urile din
`docs/API.md`), dar **nu a putut fi compilat** în mediul în care a fost generat — fără acces
la NuGet acolo. Rulează primul `dotnet restore && dotnet build` pe mașina ta ca verificare;
detalii în `backend/README.md`.

Aplicația mobilă/web **a fost testată** în mediul de generare — compilează fără erori de tip
(`tsc --noEmit`) și se construiește cu succes pentru web (`expo export`). Are cinci ecrane
funcționale (login, tabloul locațiilor, detaliu locație, listă solicitări cu aprobare, cerere
nouă) care vorbesc cu API-ul real. Restul ecranelor (curățenie, cheltuieli, voluntariat,
notificări) au endpoint-urile gata pe backend — urmează pe același tipar, vezi
`mobile/README.md` → „Ce urmează”.

## Contul de test

Creat automat la prima pornire a backend-ului:

```
Telefon:  0700000000
Parolă:   Emaus2026!
```

Schimbă-l după prima intrare (`POST /api/users` pentru un cont nou, apoi
`POST /api/users/{id}/deactivate` pe cel de test).
