---
name: no-emojis
description: >-
  Strengt forbud mot emojier i brukergrensesnitt, knapper, kildekode, kommentarer,
  dokumentasjon og logger i VoxLex Companion.
---

# No Emojis Policy

VoxLex Companion følger en absolutt **No Emojis Policy** i hele kodebasen.

## 1. Hvorfor
- Emojier gjengis ulikt på tvers av operativsystemer (Windows, ChromeOS, macOS) og kan skape visuell støy for elever med lese- og konsentrasjonsvansker.
- Skjermlesere leser ofte opp lange, forvirrende tekniske beskrivelser av emojier midt i en faglig ordforklaring.
- Tekstetiketter som `[ORDBOK]`, `LYD`, `STOPP` og `✕` er krystallklare, forutsigbare og høykontrast.

## 2. Regler
1. **Ingen Unicode-emojier** (f.eks. høyttaler-emoji, bok-emoji, flagg-emoji, stopp-emoji, hake-emoji) i HTML, CSS, JavaScript, JSON eller Markdown.
2. **Tillatte symboler og ikoner:**
   - Rene tekstmerker med høy kontrast: `[ORDBOK]`, `[FAGORD]`, `[SAMMENSATT]`, `LYD`, `STOPP`, `AV`, `PÅ`.
   - Standard typografisk lukkekryss: `✕` (`\u2715`) eller ren inline SVG med `aria-hidden="true"`.
3. **Automatisk verifikasjon:**
   - Testskriptet `scripts/test-offline-lookup.cjs` skanner alle prosjektfiler og feiler bygget dersom det oppdages emoji-tegn i koden.
