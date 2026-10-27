---
name: modular-file-size-discipline
description: >-
  Holder alle kildekodefiler og moduler i VoxLex Companion under 250-300 linjer
  med tydelig ansvarsdeling.
---

# Modular File Size Discipline

For å holde VoxLex Companion lettlest, reviderbar for IKT-/personvernrådgivere og enkel å vedlikeholde, gjelder en streng grense for filstørrelse.

## 1. Maksimal Filstørrelse
- **Mål:** Alle JavaScript- og CSS-filer skal ligge under **250 linjer**.
- **Absolutt tak:** Ingen enkeltstående kildekodefil (`content/*.js`, `content/*.css`, `background/*.js`, `backend/*.js`) skal overstige **300 linjer**.

## 2. Modulær Ansvarsdeling i Content Scripts
I stedet for én monolittisk fil lastes tre fokuserte moduler i rekkefølge via `manifest.json`:
1. `content/voxlex-lookup.js`: Ansvarlig for lokal ordbok-indeks (`data/ordbok/*.json`), suffiks-/grunnordsnormalisering, sammensatte ord (compound splitting) og kommunikasjon med Service Worker.
2. `content/voxlex-ui.js`: Ansvarlig for trygg DOM-bygging av `.voxlex-synonym-popup`, taleopplesing (`window.speechSynthesis`), språkvelger og klamret viewport-posisjonering.
3. `content/voxlex-helper.js`: Ansvarlig for hendelseslytting (`dblclick` og `mouseup` i capture-fasen), `caretRangeFromPoint`-fallback i e-bøker, og domenesperrer.
4. `content/voxlex-helper.css`: Rent høykontrast-stilark uten `backdrop-blur`.
