---
name: seb-zero-student-tracking
description: >-
  Sikrer 100 % null sporing, null telemetri, null cookies og full SEB-/eksamensbevissthet
  i VoxLex Companion.
---

# SEB Zero Student Tracking & Eksamensbevissthet

Elever som bruker VoxLex Companion skal aldri spores, identifiseres, logges eller telles i noen form for statistikk.

## 1. 100 % Null Sporing og Null Identifikatorer
1. **Ingen analyseverktøy eller telemetri:** Ingen kall til Google Analytics, Matomo, Plausible, interne loggendepunkter eller geolokasjonstjenester (`geojs.io`, `country.is` osv.).
2. **Ingen unike ID-er:** Aldri generer eller lagre `visitor_id`, `session_id`, `uuid` eller tidsstempler i `localStorage` eller `chrome.storage`.
3. **Ingen cookies eller referrers:** Alle nettverkskall fra Service Worker skal tvinge:
   ```javascript
   fetch(url, {
     credentials: 'omit',
     referrerPolicy: 'no-referrer',
     cache: 'no-store'
   });
   ```
   Slik sikres det at utvidelsen aldri avslører hvilken nettside eller e-bok eleven leser på.

## 2. Full Taushet på SEB-prøvelenker og Offline/Kiosk-modus
1. **Blokkering på SEB-elevlenker:** Utvidelsen skal ikke injisere eller gjøre nettverkskall på eksamens- og SEB-ruter (`/seb/start/*`, `/seb/exam/*`, `/seb/quit`, eller URL-er med `?seb=1`).
2. **SEB- og Offline-bevissthet i Popup-kortet:**
   - Dersom `navigator.onLine === false` eller nettleseren kjører i nedlåst offline-modus, skjules alle eksterne fordypningslenker (`[Ordbøkene]`, `[SNL]`, `[Wikipedia]`) og knappen `Vis SNL-utdrag` automatisk.
   - Utvidelsen fungerer da som en 100 % ren, lokal offline-ordbok uten utgående lenker.
