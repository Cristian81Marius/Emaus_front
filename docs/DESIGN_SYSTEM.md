# Identitate vizuală

Aceleași tokenuri în trei locuri — documentul de plan (`docs/plan-aplicatie.html`),
`mobile/src/theme/tokens.ts` — ca aplicația să nu arate ca un exercițiu separat de
documentația care a pornit-o. Dacă schimbi un hex, schimbă-l în `tokens.ts` (sursa de
adevăr pentru aplicație) și, dacă vrei consistență completă, și în `plan-aplicatie.html`.

## Culoare

| Rol | Light | Dark | Unde apare |
|---|---|---|---|
| Fundal pagină | `#EEF1EE` | `#141F1B` | `bg` |
| Suprafață (card) | `#FFFFFF` | `#1B2620` | `surface` |
| Suprafață secundară | `#E4EAE5` | `#223027` | `surface2` |
| Text principal | `#1E2A26` | `#ECEFEA` | `ink` |
| Text secundar | `#52635D` | `#A9B7B0` | `inkSoft` |
| Text discret | `#7C8B85` | `#77887F` | `inkFaint` |
| Linii/borduri | `#D2DBD5` | `#324137` | `line` |
| Accent (brand) | `#A85A2E` | `#E0965E` | butoane primare, linkuri, eticheta activă din navigare |

**Culori semantice** (statusuri — separate de accent, niciodată aceeași nuanță):

| Sens | Light (text / fundal) | Dark (text / fundal) | Folosit pentru |
|---|---|---|---|
| Pozitiv | `#3F7D5C` / `#DEEEE4` | `#78C79A` / `#1E3A2A` | Liber & igienizat, Aprobată, Rezolvat |
| Informativ | `#3E5C78` / `#E1E8EE` | `#8FB0CE` / `#212F3D` | Ocupat, Activă, În așteptare |
| Atenție | `#A5790F` / `#F2E7CC` | `#E2C066` / `#3A2F16` | Necesită curățenie |
| Critic | `#A5372C` / `#F4DEDA` | `#E48A7D` / `#3D231F` | Blocat, Respinsă, Indisponibil |

Aplicația mobilă preia tema sistemului automat (`useColorScheme()` din React Native) —
nu există un buton manual de light/dark încă.

## Tipografie

Trei familii, fiecare cu un rol clar — niciodată amestecate în același element:

- **Fraunces** (serif cu caracter) — titluri de ecran, identitatea vizuală a documentului de plan.
- **Karla** (sans umanist) — tot textul curent: etichete, paragrafe, butoane.
- **IBM Plex Mono** — cifre și date care trebuie să se alinieze sau să pară „date exacte”:
  perioade de cazare, capacități, sold de cont.

În aplicația mobilă, cele trei fonturi se încarcă prin `@expo-google-fonts/*` — vezi
`mobile/src/theme/useAppFonts.ts`. Documentul de plan le încarcă direct de la Google Fonts
prin `<link>`.

## De ce această paletă

Amestecul de verde-pin închis (fundal) cu accent sienna cald a fost ales să evoce „adăpost,
lumină la geam” — potrivit pentru o organizație care oferă găzduire — și, la fel de important,
să evite paleta implicit generată de AI (crem + terracotta cu serif, sau negru cu un singur
accent neon). Dacă brandul Emaus are deja o identitate vizuală (logo, culori oficiale),
aceasta se poate înlocui direct în `tokens.ts` — restul aplicației nu se schimbă.
