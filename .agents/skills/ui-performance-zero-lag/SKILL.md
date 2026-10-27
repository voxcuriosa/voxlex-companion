---
name: ui-performance-zero-lag
description: >-
  Sikrer 60 FPS og null forsinkelse på rimelige elev-PC-er i VoxLex Companion.
  Forbyr tunge CSS-filtre som backdrop-blur og krever lettvekts DOM- og minnehåndtering.
---

# UI Performance Zero Lag

VoxLex Companion kjører som et content script på tvers av tunge digitale læremidler og e-bøker på skole-PC-er med begrenset CPU/GPU-kapasitet.

## 1. Strengt Forbudte CSS-egenskaper
- **ALDRI bruk `backdrop-filter` eller `backdrop-blur-*`**: Gjennomsiktig uskarphet tvinger nettleseren til kostbar GPU-komposisjon på hver bilderamme over komplekse e-bøker.
- **ALDRI bruk tunge, animerte `box-shadow`-overganger**: Bruk én statisk, subtil skygge på `.voxlex-synonym-popup`.
- **ALDRI animer layout-egenskaper**: Animer aldri `width`, `height`, `top`, `left`, `margin` eller `padding`.

## 2. Tillatte Animasjoner og Overganger
- Kun `opacity` og `transform` (`translate3d` / `translateY` / `scale`) er tillatt i `transition`.
- Hold overgangstiden kort og responsiv (`100ms`–`140ms` `ease-out`).
- Respekter alltid `@media (prefers-reduced-motion: reduce)` ved å sette `transition: none !important`.

## 3. Minne- og CPU-disiplin i Content Scripts
- **Lazy-loading av ordbok-chunks**: Last kun inn den aktuelle forbokstav-filen (`data/ordbok/<bokstav>.json`) når eleven faktisk klikker på et ord, og cache den i minnet.
- **Kun ett popup-element i DOM**: Gjenbruk eller fjern eksisterende `.voxlex-synonym-popup` umiddelbart før et nytt opprettes.
- **Ingen `MutationObserver` på hele dokumentet**: Utvidelsen skal være 100 % hendelsesdrevet (`dblclick` og `mouseup`), slik at den bruker 0 % CPU når eleven bare leser eller scroller.
