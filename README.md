# VoxLex Companion – Lese- og Ordforklaringsutvidelse for Chrome (Manifest V3)

**100 % Open Source (MIT-lisens med kreditering) • Innebygd Elevpersonvern (GDPR Art. 25) • Offline-først**

VoxLex Companion er en frittstående lese- og ordforklaringsutvidelse for elever og lærere i videregående skole. Utvidelsen gir umiddelbare synonymer, enkle betydningsforklaringer, innebygd norsk taleopplesing (`nb-NO`), morsmålsstøtte og faglige fordypningslenker ved dobbeltklikk eller markering av enkeltord på nettsider og i digitale læremidler/e-bøker (Smartbok, Unibok, NDLA m.fl.).

Utvidelsen leveres som åpen kildekode slik at **skoleeiere, fylkeskommuner, IT-avdelinger og personvernombud (PVO/DPO)** fritt kan inspisere, revidere, bygge og distribuere koden i eget miljø.

- **GitHub Repository:** [https://github.com/voxcuriosa/voxlex-companion](https://github.com/voxcuriosa/voxlex-companion)
- **Nettside og Personvernerklæring:** [https://voxcuriosa.no/voxlexcompanion/](https://voxcuriosa.no/voxlexcompanion/)
- **Chrome Web Store:** [VoxLex Companion](https://chromewebstore.google.com/detail/voxlex-companion/lcjihcdpbniiakjndaacomfnojhcpgdg)

---

## Arkitektur og Personverngarantier (DPIA-grunnlag)

VoxLex Companion er konstruert etter prinsippet om **dataminimering (GDPR art. 5 nr. 1 c)** og **innebygd personvern (GDPR art. 25)**:

1. **Null innlogging, null kontoer og null elevsporing:**
   - Utvidelsen krever ingen Feide-pålogging, e-postadresse, elev-ID, passord eller sesjonstokens.
   - Det benyttes ingen informasjonskapsler (`credentials: 'omit'`), ingen nettleserfingeravtrykk og ingen analyseverktøy.
   - Brukerens av/på-valg og valgte støttespråk lagres utelukkende lokalt på enheten via `chrome.storage.local` (aldri synkronisert til sky).

2. **Tier-1: 100 % Lokal Offline-ordbok på Bokmål og Nynorsk (0 ms, 0 nettverksbytes):**
   - **130 600 norske oppslagsord** (hele Bokmålsordboka og Nynorskordboka fra UiB/Språkrådet, CC BY 4.0) samt Norske synonymer og over 385 000 bøyde ordformer ligger ferdig pakket lokalt i `data/ordbok/`. Nynorskord merkes tydelig med `[NYNORSK]`.
   - Bøyningsformer og sammensatte ord løses lokalt i nettleserens arbeidsminne (RAM) uten at en eneste byte sendes over nettverket.

3. **Teknisk PII-filter (Ingen fritekstsøk):**
   - Utvidelsen har **ingen fritekst- eller chatfelt** som elever kan skrive personopplysninger inn i. Verktøylinjeikonet fungerer kun som en ren PÅ/AV-bryter.
   - Før et markert ord kan behandles av `sanitizeWord()`, verifiseres det maskinelt at teksten kun er **ett enkelt alfabetisk ord** (`2–35` bokstaver, må starte og slutte med bokstav, ingen mellomrom eller doble bindestreker).
   - Fødselsnumre, telefonnumre, e-postadresser, navn med mellomrom og setninger avvises automatisk på klienten.
   - Utvidelsen ignorerer alle redigerbare tekstfelt (`<input>`, `<textarea>`, `contenteditable`).

4. **Tier-2: Google Cloud Vertex AI i EU (`europe-west1`) med K-anonymitet på skolenett:**
   - Kun når et ord ikke finnes i den lokale ordboka (eller når eleven aktivt ber om morsmålsoversettelse), kalles et tilstandsløst Cloud Run-endepunkt i EU (`europe-west1`, Belgia) som kommuniserer med **Google Cloud Vertex AI (`europe-west1`)**.
   - Under Google Cloud Vertex AI sine databehandlervilkår gjelder **Zero Data Retention**: forespørsler lagres ikke og brukes aldri til trening av KI-modeller.
   - Endepunktet har **streng IP-lås i flyktig RAM** som foreløpig er aktivert for Telemark fylkeskommunes skolenett (`139.164.0.0/16` / `NO-TELEFYKOMM`). Ingen IP-adresser logges. Fordi tusenvis av elever deler samme utgående NAT-IP på skolenettet, oppnås full **k-anonymitet**.
   - **Gratis tilgang for andre fylker og kommuner:** Andre fylkeskommuner, kommuner og skoler kan ta kontakt (`christian@chromo.no`) og oppgi sin offentlige IP-rekke (IP-range / CIDR) for å få åpnet gratis tilgang til skolenett-funksjonene.
   - Utenfor skolenettet vises merket `[LOKAL MODUS]` med forklarende tooltip, og KI-endepunktet avviser forespørsler med `HTTP 403` slik at elevens private hjemme-IP aldri behandles av KI-modellen.

5. **Automatisk deaktivering på eksamens- og sensitive plattformer:**
   - Utvidelsen er teknisk ekskludert (`exclude_matches` i `manifest.json` samt runtime-sjekk i `content/voxlex-helper.js`) fra å kjøre på:
     - **Digitale prøve- og eksamensplattformer:** Safe Exam Browser (`*://*.voxcuriosa.no/seb/*`, `/seb/start/*`, `/seb/exam/*`, `/seb/quit`, `?seb=1`), Inspera (`*://*.inspera.no/*`, `*://*.inspera.com/*`), Wiseflow (`*://*.wiseflow.net/*`), DigiExam (`*://*.digiexam.com/*`) og Privex (`*://*.privex.no/*`).
     - **Bank, helse og offentlige innloggingsportaler:** BankID, Vipps, DNB, SpareBank 1, Nordea, Handelsbanken, Sbanken, ID-porten, Altinn, NAV, Helsenorge, Skatteetaten, Lånekassen, Feide og Dataporten.

---

## Mappestruktur

```text
voxlex-companion/
├── manifest.json                  # Manifest V3 (kun "storage"-rettighet + eksplisitte domenesperrer)
├── background/
│   └── service-worker.js          # PÅ/AV-bryter og cookiefri proxy (credentials: 'omit')
├── content/
│   ├── voxlex-lookup.js           # 0 ms lokal oppslagsmotor, bøyningsløser og orddeler
│   ├── voxlex-ui.js               # Høykontrast flytende kort (DOM-sikker uten innerHTML)
│   ├── voxlex-helper.js           # Capture-fase klikkdeteksjon og blob:/EPUB iframe-støtte
│   └── voxlex-helper.css          # WCAG AAA/AA høykontrast-stilark (60 FPS, null backdrop-blur)
├── data/
│   └── ordbok/                    # 96 600+ oppslagsord og synonymer (a.json ... aa.json + lemma.json)
├── backend/
│   ├── index.js                   # Cloud Run / Vertex AI (europe-west1) proxy med skolenett IP-lås
│   └── package.json
├── scripts/
│   ├── build-dictionary.cjs       # Byggeskript for lokal ordbokindeks (inkl. homonym-rangering)
│   └── test-offline-lookup.cjs    # 70 automatiske sikkerhets-, personvern- og enhetstester
├── GEMINI.md                      # Arkitektur- og sikkerhetsregler
└── LICENSE                        # MIT-lisens med krav om kreditering
```

---

## Verifisering, Bygging og Egen Drift for IT-avdelinger

Fylkeskommuner og kommuner som ønsker å verifisere koden eller drifte sitt eget Vertex AI-endepunkt med egne skolenett-IP-er (`ALLOWED_CIDRS`), kan gjøre følgende:

```bash
# 1. Klon kildekoden
git clone https://github.com/voxcuriosa/voxlex-companion.git
cd voxlex-companion

# 2. Kjør alle 70 automatiske personvern-, sikkerhets- og oppslagstester
npm test

# 3. (Valgfritt) Bygg lokal ordbokindeks på nytt
npm run build

# 4. (Valgfritt) Rull ut eget Cloud Run Vertex AI-endepunkt i europe-west1
gcloud run deploy voxlex-lookup \
  --source backend \
  --region europe-west1 \
  --set-env-vars="ALLOWED_CIDRS=139.164.0.0/16" \
  --allow-unauthenticated
```

---

## Lisens og Kreditering

Utviklet av **Christian Borchgrevink-Vigeland / VoxCuriosa ([voxcuriosa.no](https://voxcuriosa.no))**.
Lisensiert under **MIT License with Attribution Requirement** – se [`LICENSE`](LICENSE).
Ordbokdata bygger på Bokmålsordboka (Universitetet i Bergen og Språkrådet, CC BY 4.0).
