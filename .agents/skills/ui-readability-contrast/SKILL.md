---
name: ui-readability-contrast
description: >-
  WCAG AAA/AA høykontrast, dysleksivennlig typografi og full tilgjengelighet (a11y)
  for VoxLex Companion.
---

# UI Readability & High Contrast (WCAG AAA/AA)

VoxLex Companion er et lesestøtteverktøy utviklet spesielt for elever i videregående skole, inkludert elever med dysleksi, lese- og skrivevansker eller nedsatt syn.

## 1. Fargepalett og Kontrastkrav
- **Kortbakgrunn (`.voxlex-synonym-popup`):** `#0f172a` (dyp skifermarine, 100 % ugjennomsiktig).
- **Primær brødtekst (ordforklaring):** `#f8fafc` mot `#0f172a` (kontrastforhold > 17:1, overgår WCAG AAA).
- **Oppslagsord i header:** `#fbbf24` (varm gyllen) mot `#0f172a` (kontrastforhold > 10:1, WCAG AAA).
- **Synonym-piller (`.voxlex-pill`):** Bakgrunn `#1e293b`, kantlinje `#475569`, tekst `#e2e8f0`, hover `#334155` med `#fbbf24` kant.
- **Sekundærtekst / kildelenker:** `#cbd5e1` (kontrastforhold > 11:1).

## 2. Dysleksivennlig Typografi
- **Fontfamilie:** Systemets mest lesbare sans-serif (`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Skriftstørrelse og linjeavstand:** Minimum `15px` på brødtekst, `line-height: 1.55`, og `letter-spacing: 0.01em`.
- **Linjebredde:** Kortbredde mellom `320px` og `380px` (maks 55–65 tegn per linje) for å unngå øyesprang.
- **Aldri kursiv eller blokkbokstaver på lengre tekst:** Ordforklaringer skal alltid stå i vanlig rett skrift (normal) med venstrejustert tekst (aldri `text-align: justify`).

## 3. Tastatur, Skjermleser og Språkmerking
- Alle interaktive knapper og synonym-piller skal være ekte `<button>`- eller `<a>`-elementer med minimum `24x24px` klikkflate og tydelig `:focus-visible`-ramme (`2px solid #fbbf24`).
- Oversatte tekstbokser skal merkes med korrekt `lang`-attributt (og `dir="rtl"` for høyre-til-venstre-språk som arabisk og persisk).
