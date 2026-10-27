# GEMINI.md - Prosjektregler og Arkitektur for VoxLex Companion

Dette dokumentet er den ufravikelige arkitektoniske og sikkerhetsmessige grunnloven for **VoxLex Companion** (Chrome-utvidelse / Manifest V3).

---

## 1. Prosjektets Formål
VoxLex Companion er en frittstående lese- og ordforklaringsutvidelse for elever og lærere i videregående skole. Utvidelsen gir umiddelbare synonymer, enkle betydningsforklaringer, innebygd taleopplesing (`nb-NO`), flerspråklig morsmålsstøtte og faglige fordypningslenker ved dobbeltklikk eller markering av enkeltord på nettsider og i digitale læremidler/e-bøker (Smartbok, Unibok, NDLA m.fl.).

---

## 2. Ufravikelige Kjerneprinsipper

### 2.1 Null Innlogging og 100 % GDPR-Sikkerhet
1. **Ingen kontoer eller identifikatorer:** Ingen Feide-innlogging, e-post, elev-ID, sesjonstokens eller cookies brukes noe sted i utvidelsen.
2. **Kun lokal innstillingslagring:** Innstillinger (PÅ/AV-status og valgt støttespråk) lagres utelukkende lokalt på maskinen via `chrome.storage.local` (aldri `chrome.storage.sync`).
3. **Ingen fritekstsøk (DPIA-sikring):** For å forhindre at elever taster inn personopplysninger, tillater utvidelsen kun oppslag fra ett markert/dobbeltklikket enkeltord (`2–35` bokstaver, kun alfabetiske tegn `/^[\p{L}\-]+$/u`, tvunget til lowercase). Verktøylinjeikonet fungerer kun som en ren PÅ/AV-bryter.
4. **K-anonymitet og Telemark IP-lås:** Tier-2-backenden aksepterer kun forespørsler fra Telemark fylkeskommunes skolenett (`139.164.0.0/16` / `NO-TELEFYKOMM`, inkludert `139.164.154.162`, samt eventuelle ekstra subnett i `ALLOWED_CIDRS`). Ingen IP-adresser logges til disk eller konsoll.

### 2.2 Smart 3-Trinns Oppslagsarkitektur
1. **Tier-1 (0 ms Lokal Offline-ordbok):**
   - Ligger ferdig indeksert i `data/ordbok/a.json` ... `å.json` + `lemma.json`.
   - Gir umiddelbart synonymer og enkel betydning på 0 millisekunder og 0 nettverksbytes.
   - Bøyningsformer og sammensatte ord løses lydløst i bakgrunnen til grunnordets betydning og synonymer (grammatiske bøyningsparadigmer vises ikke i UI-et).
2. **Tier-2 (Google Cloud Vertex AI i `europe-west1` på skolenettet) + SNL/Wikipedia Parallelt Fallback:**
   - Kun når et ord ikke finnes i lokal ordbok, spør Service Workeren Tier-2-backenden (`https://voxlex-lookup-180422997316.europe-west1.run.app`) og SNL/Wikipedia åpne API-er parallelt.
   - Prosessering skjer 100 % i EU (`europe-west1`, Belgia) via Vertex AI med *Zero Data Retention* (ingen lagring og ingen modelltrening).
   - Utenfor skolenettet (HTTP 403 fra Tier-2) vises offisielt SNL/Wikipedia-sammendrag dersom det finnes, og ellers en vennlig pedagogisk melding:
     *«Dette ordet finnes ikke i den lokale ordboka. Utvidet søk er kun tilgjengelig når du er koblet til skolens nettverk.»*
3. **Morsmålsstøtte:**
   - Språkvelger direkte i headeren på `.voxlex-synonym-popup`.
   - Oversettelse hentes utelukkende via Tier-2 (Google Cloud Vertex AI i `europe-west1`, IP-låst til Telemark fylkeskommunes skolenett `139.164.0.0/16`). Ingen eksterne tredjeparts oversettelses-API-er benyttes.

---

## 3. Obligatoriske Prosjekt-Skills (`.agents/skills/`)

Alle endringer i kodebasen skal etterleve følgende skills:
1. [`ui-performance-zero-lag`](file:///Users/christianborchgrevink-vigeland/Documents/Privat/VoxSyn/.agents/skills/ui-performance-zero-lag/SKILL.md): Strengt forbud mot `backdrop-blur`/`backdrop-filter`, kun `transform` og `opacity`-animasjoner, 60 FPS på rimelige elev-PC-er.
2. [`no-emojis`](file:///Users/christianborchgrevink-vigeland/Documents/Privat/VoxSyn/.agents/skills/no-emojis/SKILL.md): Ingen emojier i brukergrensesnitt, knapper, kode, kommentarer eller logger. Bruk rene tekstmerker (`[ORDBOK]`, `LYD`, `STOPP`, `✕`) eller ren SVG.
3. [`ui-readability-contrast`](file:///Users/christianborchgrevink-vigeland/Documents/Privat/VoxSyn/.agents/skills/ui-readability-contrast/SKILL.md): WCAG AAA/AA kontrastkrav (`#0f172a` bakgrunn, `#f8fafc` tekst, `#fbbf24` oppslagsord), dysleksivennlig typografi.
4. [`seb-zero-student-tracking`](file:///Users/christianborchgrevink-vigeland/Documents/Privat/VoxSyn/.agents/skills/seb-zero-student-tracking/SKILL.md): 100 % null sporing, null telemetri, null cookies, full taushet på SEB-elevlenker og automatisk deaktivering av eksterne lenker i offline-modus.
5. [`modular-file-size-discipline`](file:///Users/christianborchgrevink-vigeland/Documents/Privat/VoxSyn/.agents/skills/modular-file-size-discipline/SKILL.md): Hold alle kildefiler og moduler under 250–300 linjer.
6. [`chrome-extension-security`](file:///Users/christianborchgrevink-vigeland/Documents/Privat/VoxSyn/.agents/skills/chrome-extension-security/SKILL.md): Sikre Manifest V3-prinsipper, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, trygg DOM-bygging uten `innerHTML`, og ekskludering av sensitive domener (bank, helse, ID-porten, NAV, Inspera, Wiseflow, DigiExam).
7. [`privacy-and-docs-sync`](file:///Users/christianborchgrevink-vigeland/Documents/Privat/VoxSyn/.agents/skills/privacy-and-docs-sync/SKILL.md): Sikrer at kode, `manifest.json`, personvernerklæring, `CHROMEWEBSTORE.md` og hjelpefiler alltid er 100 % synkroniserte.
