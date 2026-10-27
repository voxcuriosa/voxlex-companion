---
name: chrome-extension-security
description: >-
  Sikkerhetskrav for Manifest V3, PII-vasking av oppslagsord, trygg DOM-manipulasjon
  og domenesperrer i VoxLex Companion.
---

# Chrome Extension Security (Manifest V3)

VoxLex Companion er bygget etter strenge sikkerhetsprinsipper for skolesektoren og Chrome Web Store.

## 1. Streng PII- og Enkeltord-Vasker (Ingen Fritekst)
For å gjøre det teknisk umulig å sende personopplysninger (navn, fødselsnummer, e-post, fritekstsetninger) ut av nettleseren:
- Utvidelsen har **ingen fritekstsøkefelt**.
- Før et ord kan sendes til Service Worker eller eksterne oppslag, vaskes det av `sanitizeWord(raw)`:
  1. Trimmes og konverteres til lowercase.
  2. Må være **nøyaktig ett ord** (ingen mellomrom).
  3. Må kun bestå av gyldige bokstaver og eventuell bindestrek inne i ordet (`/^[a-zæøåéèêóòôäöüß\-]+$/`).
  4. Ingen siffer (`0-9`), ingen `@`, ingen punktum eller URL-tegn.
  5. Lengde mellom `2` og `35` tegn.

## 2. Trygg DOM-Bygging (Zero XSS)
- **ALDRI bruk `innerHTML`, `outerHTML`, `insertAdjacentHTML` eller `eval()`** i content scripts eller Service Worker.
- Alle UI-elementer i `.voxlex-synonym-popup` opprettes utelukkende med `document.createElement()` og tekst settes med `textContent`.

## 3. Domenesperrer (Exclude Matches + Runtime Guard)
Utvidelsen skal aldri kjøre på:
- Bank- og betalingstjenester (`*://*.bankid.no/*`, `*://*.vipps.no/*`, `*://*.dnb.no/*`, `*://*.sparebank1.no/*`, `*://*.nordea.no/*`)
- Offentlige innloggings- og helseportaler (`*://*.idporten.no/*`, `*://*.altinn.no/*`, `*://*.nav.no/*`, `*://*.helsenorge.no/*`, `*://*.skatteetaten.no/*`, `*://*.feide.no/*`)
- Eksamen og digitale prøveplattformer (`*://*.voxcuriosa.no/seb/*`, `*://*.inspera.no/*`, `*://*.inspera.com/*`, `*://*.wiseflow.net/*`, `*://*.digiexam.com/*`, `*://*.privex.no/*`)
