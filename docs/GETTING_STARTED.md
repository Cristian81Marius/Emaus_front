# Pornire rapidă

Presupune Windows, cu proiectul în `E:\project\emausApp`. Ai nevoie de două lucruri instalate
o singură dată, apoi pornești două procese (backend + mobil) de fiecare dată când lucrezi.

## 1. Instalări o singură dată

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org) (pentru aplicația mobilă/web)
- Aplicația **Expo Go** pe telefon ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)), dacă vrei să testezi pe telefon fizic

## 2. Pornește backend-ul

```powershell
cd E:\project\emausApp\backend
dotnet restore
dotnet run --project src/Emaus.Api
```

Lasă fereastra asta deschisă — API-ul rulează pe `http://localhost:5017`. Prima pornire
creează baza de date (`emaus.db`) și o populează cu cele 8 locații reale + un cont de test.
Deschide `http://localhost:5017/swagger` ca să vezi toate endpoint-urile.

## 3. Pornește aplicația mobilă/web (într-o fereastră nouă de terminal)

```powershell
cd E:\project\emausApp\mobile
npm install
npm run web
```

Se deschide automat în browser. Intră cu:

```
Telefon:  0700000000
Parolă:   Emaus2026!
```

Pentru varianta de telefon fizic: `npm start`, apoi scanează codul QR cu Expo Go — dar vezi
`mobile/README.md`, secțiunea despre `apiBaseUrl`, altfel telefonul nu găsește backend-ul.

## Ce faci dacă ceva nu compilează

Acest scaffold a fost scris fără acces la internet în mediul în care a fost generat (nu s-a
putut testa `dotnet build` cu pachetele reale — vezi `backend/README.md` pentru detalii).
Codul urmează tipare standard ASP.NET Core 8 / EF Core 8, dar dacă `dotnet restore` sau
`dotnet build` scot o eroare, trimite mesajul exact și o reparăm împreună — de obicei e
o versiune de pachet care nu se potrivește exact.

Partea de mobil (`mobile/`) **a fost testată** în mediul de generare: `npx tsc --noEmit` trece
fără erori și `npx expo export --platform web` construiește cu succes toate ecranele.

## Următorul pas recomandat

Vezi `docs/ARCHITECTURE.md` pentru cum sunt organizate cele două proiecte, și
`backend/schema.md` pentru raționamentul din spatele bazei de date, înainte să adaugi
ecrane/endpoint-uri noi.
