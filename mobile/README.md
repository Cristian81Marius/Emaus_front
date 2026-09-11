# Emaus — aplicație mobilă + web

Expo (React Native + TypeScript) cu `expo-router`. Din **același cod** rulează pe telefon
(Android/iOS, prin Expo Go sau build nativ) și în browser (`react-native-web`) — exact ideea
din plan: un singur cod pentru mobil și web.

Testat în acest scaffold: `npx tsc --noEmit` (fără erori) și `npx expo export --platform web`
(bundle-ul web se construiește curat, toate cele 5 ecrane). Nu am putut testa build-ul nativ
Android/iOS în mediul în care a fost generat acest schelet — pentru asta ai nevoie de
Android Studio / Xcode sau, mai simplu, de aplicația **Expo Go** pe telefon (vezi mai jos).

## Structură

```
mobile/
  app/                  ecrane, rutate automat după numele fișierului (expo-router)
    _layout.tsx           layout rădăcină: fonturi, AuthProvider, stack de navigare
    login.tsx
    index.tsx              "toate locațiile, dintr-o privire"
    property/[id].tsx       detaliu locație
    bookings/index.tsx      lista de solicitări (+ aprobare/respingere pentru Nucleus)
    booking/new.tsx          solicitare nouă
  src/
    api/            client HTTP + tipuri (oglindă a DTO-urilor din backend)
    state/          AuthContext (sesiune, token JWT)
    theme/          culori + fonturi — aceeași identitate ca planul aplicației
    components/     StatusPill, Card, PrimaryButton, ScreenContainer
```

## Rulare locală

Necesită [Node.js](https://nodejs.org) 20+.

```bash
cd mobile
npm install
npm run web       # varianta browser — cea mai rapidă pentru dezvoltare
# sau
npm start         # deschide Expo Dev Tools; scanează codul QR cu aplicația Expo Go pe telefon
```

Backend-ul (`../backend`) trebuie pornit separat, pe portul implicit `5017`.

### Conectarea la backend de pe telefon fizic

`app.json` → `expo.extra.apiBaseUrl` e setat pe `http://localhost:5017`, ceea ce funcționează
doar în browser (web) sau în emulator Android cu redirecționare automată. **Pe un telefon fizic,
"localhost" înseamnă telefonul însuși**, nu calculatorul tău. Găsește IP-ul local al
calculatorului (`ipconfig` pe Windows, caută "IPv4 Address") și schimbă valoarea în:

```json
"extra": { "apiBaseUrl": "http://192.168.1.20:5017" }
```

(telefonul și calculatorul trebuie să fie pe aceeași rețea Wi-Fi).

## Ce e deja funcțional

- Autentificare (telefon + parolă) cu sesiune păstrată local (`expo-secure-store`).
- Tabloul locațiilor, cu statusul fiecărei unități live din API.
- Detaliu locație.
- Lista de solicitări, cu aprobare/respingere (rol Nucleus) — exact fluxul din plan.
- Formular de solicitare nouă (creează beneficiar + cerere).

## Ce urmează, pe același tipar

Fiecare din astea e un ecran nou plus, eventual, un endpoint nou pe backend — nu o schimbare
de arhitectură:

- Căutare beneficiar existent înainte de a crea unul nou (endpoint deja există: `GET /api/beneficiaries?search=`).
- Alocarea unei unități unei solicitări aprobate (`POST /api/bookings/{id}/allocate`).
- Curățenie: lista turelor + marcare „igienizat” (`GET/POST /api/cleaning/...`).
- Cheltuieli/mentenanță: raportare + asignare (`/api/maintenance`).
- Oportunități de voluntariat + înscriere (`/api/opportunities`).
- Notificări reale în aplicație (endpoint-ul `/api/notifications/mine` există; lipsește doar ecranul).
- Adăugare beneficiar din agenda telefonului (`expo-contacts`) — Nivelul 1 din secțiunea WhatsApp a planului.

## De ce aceste alegeri

**expo-router** în loc de React Navigation configurat manual — rutele sunt fișiere, exact ca în
Next.js; mai puțin cod de navigare de întreținut, și hărțile URL (utile pentru varianta web)
vin gratis.

**Context API (`AuthContext`) în loc de Redux/Zustand** — starea globală reală e doar sesiunea
utilizatorului; restul datelor (locații, solicitări) se cer direct de la API în fiecare ecran,
fără cache global. Simplu de urmărit; dacă aplicația crește mult, `@tanstack/react-query` e
următorul pas natural pentru cache și refetch automat.

**Fără bibliotecă de UI (Tamagui/NativeBase etc.)** — patru componente mici (`Card`,
`PrimaryButton`, `StatusPill`, `ScreenContainer`) acoperă tot ce apare azi în ecrane, toate
citind culorile din `src/theme/tokens.ts`. Mai ușor de înțeles pentru cineva nou în proiect
decât o bibliotecă externă cu convenții proprii.
