---
name: privacy-and-docs-sync
description: >-
  Sikrer at kode, manifest.json, personvernerklæring (voxcuriosa.no/voxlexcompanion/#personvern),
  CHROMEWEBSTORE.md, GEMINI.md og sikkerhets-skills alltid er 100 % synkronisert ved enhver endring.
---

# Privacy & Documentation Synchronization (`privacy-and-docs-sync`)

Enhver endring i nettverkskall, API-endepunkter, `host_permissions`, `exclude_matches`, språklister eller personvernlogikk i **VoxLex Companion** MÅ følges av en synkron oppdatering av alle dokumentasjons-, hjelpe- og personvernflater.

## 1. Filer som ALLTID må være 100 % synkroniserte

Når du endrer en av kodefilene (`manifest.json`, `background/service-worker.js`, `content/voxlex-helper.js`, `content/voxlex-ui.js`, `backend/index.js`), skal følgende filer sjekkes og oppdateres i samme arbeidsøkt:

1. **`GEMINI.md`**:
   - Sjekk at seksjon `2.1 Null Innlogging og 100 % GDPR-Sikkerhet` og `2.2 Smart 3-Trinns Oppslagsarkitektur` beskriver nøyaktig de endepunktene og mekanismene som faktisk brukes i koden (kun lokal ordbok + Vertex AI i `europe-west1` på skolenettet + SNL/Wikipedia).
2. **`CHROMEWEBSTORE.md`**:
   - Tabell under `## Permissions Justification` må ha 1-til-1 samsvar med `permissions` og `host_permissions` i `manifest.json`. Ingen gamle eller fjernede domener skal stå igjen.
3. **`.agents/skills/chrome-extension-security/SKILL.md`**:
   - Seksjon `3. Domenesperrer` må inneholde alle kategorier av blokkerte domener i `manifest.json` (`exclude_matches`) og `content/voxlex-helper.js` (`BLOCKED_HOST_PATTERNS`), inkludert bank, offentlige portaler, Feide og eksamensplattformer (`inspera.no`, `inspera.com`, `wiseflow.net`, `digiexam.com`, `voxcuriosa.no/seb/*`).
4. **Offentlig hjelpe- og personvernside (`../vox_portal/voxlexcompanion/index.html`)**:
   - Seksjonen `#personvern` og funksjonsbeskrivelsen på `https://voxcuriosa.no/voxlexcompanion/` må alltid speile den faktiske arkitekturen (100 % lokal ordbok, Vertex AI i EU `europe-west1` låst til skolenett med *Zero Data Retention*, null tredjeparts oversettelses-API-er, og automatisk deaktivering på eksamensplattformer).
   - Etter oppdatering av `../vox_portal/voxlexcompanion/index.html` eller `.zip`-pakken skal endringen lastes opp til produksjon med `upload_ftp.py`.
5. **Automatisk test (`scripts/test-offline-lookup.cjs`)**:
   - `npm test` skal verifisere maskinelt at `manifest.json`, `background/service-worker.js`, `content/voxlex-helper.js`, `GEMINI.md`, `CHROMEWEBSTORE.md` og `.agents/skills/chrome-extension-security/SKILL.md` er i synk.
