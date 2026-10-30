# Chrome Web Store Listing - VoxLex Companion

> Last Updated: 2026-10-27

## Store Listing

**Extension Name** [REQUIRED]
VoxLex Companion

**Short Description** [REQUIRED]
Rask, 100 % personverntrygg ordforklarings- og synonymutvidelse med opplesing og morsmålsstøtte for videregående skole.

**Detailed Description** [REQUIRED]
VoxLex Companion er en universell lese- og ordforklaringsutvidelse for elever og lærere i videregående skole. Utvidelsen gir deg umiddelbare synonymer, enkle ordforklaringer på bokmål og nynorsk, taleopplesing og flerspråklig støtte når du dobbeltklikker eller markerer enkeltord på nettsider og i digitale læremidler.

FUNKSJONER OG NYTTE
- Umiddelbare synonymer: Få opp klikkbare alternativer som gjør det lettere å forstå fagtekster og variere språket.
- Komplett norsk ordbok (Bokmål og Nynorsk): Hele Bokmålsordboka og Nynorskordboka (130 600 oppslagsord og over 385 000 bøyde ordformer) ligger innebygd lokalt med korte definisjoner tilpasset videregående skole. Nynorskord merkes tydelig med [NYNORSK].
- Fungerer i digitale lærebøker og e-bøker: Sømløs støtte for Smartbok, Unibok, NDLA, Brettboka, Aschehoug Univers og vanlige nettsider.
- Norsk taleopplesing: Ett klikk på LYD leser opp ordet og forklaringen med naturlig norsk stemme (nb-NO).
- Flerspråklig morsmålsstøtte og utvidet søk på skolenett: På skolens nettverk kan du velge støttespråk direkte i kortet for oversettelse til ukrainsk, arabisk, engelsk, somali, polsk, tigrinja, spansk, kurdisk, persisk eller vietnamesisk. (Foreløpig aktivert på skoler i Telemark fylkeskommune – andre fylker og kommuner får gratis tilgang ved å oppgi sin IP-range.)
- Faglig fordypning: Direkte kildelenker til Ordbøkene.no, Store norske leksikon (SNL) og Wikipedia når du er på nett.
- Høy kontrast og dysleksivennlig design: Skarp typografi, mørkt høykontrast-kort og null forstyrrende elementer.

SLIK BRUKER DU UTVIDELSEN
1. Dobbeltklikk på eller marker et ord i teksten du leser.
2. Et lesevennlig kort åpnes rett ved ordet med synonymer og en enkel forklaring.
3. Klikk på et synonym for å utforske det videre, eller trykk LYD for å høre uttalen.
4. Klikk på utvidelsesikonet i verktøylinjen dersom du ønsker å slå hjelpen midlertidig av eller på.

PERSONVERN OG GDPR (100 % TRYGG I SKOLEN)
VoxLex Companion er bygget etter prinsippet om innebygd personvern (Privacy by Design) og oppfyller de strengeste kravene til personvern i skolesektoren:
- Ingen brukerkonto eller innlogging: Krever ingen Feide, e-post, elev-ID, passord eller tokens.
- Ingen sporing eller profilering: Utvidelsen samler aldri inn nettleserhistorikk, enhetsdata eller brukeratferd.
- Ingen informasjonskapsler (cookies): Det benyttes ingen cookies eller analyseverktøy (null Google Analytics eller sporingspiksler).
- Sikret mot utilsiktet deling av personopplysninger: Utvidelsen har intet fritekstsøkefelt. Det er teknisk umulig for elever å taste inn navn, fødselsnummer eller meldinger. Kun ett enkelt markert oppslagsord kan behandles.
- Lokal lagring på enheten: Dine innstillinger (av/på-status og valgt støttespråk) lagres utelukkende lokalt i din egen nettleser (chrome.storage.local) og synkroniseres aldri til eksterne skytjenester.
- Full offline-integritet: Den lokale ordboken med 130 600 oppslagsord på bokmål og nynorsk ligger lagret lokalt i utvidelsen og fungerer overalt helt uten internettforbindelse.
- Automatisk eksamens- og domenesperre: Utvidelsen deaktiverer seg selv automatisk på digitale eksamensplattformer (SEB, Inspera, Wiseflow, DigiExam) samt på BankID, ID-porten, Helsenorge, NAV og Feide.
- 100 % Åpen kildekode (MIT-lisens): Hele kildekoden kan fritt inspiseres av IKT-avdelinger og personvernombud på GitHub.

KONTAKT OG TILBAKEMELDINGER
Utviklet for og i samarbeid med skolesektoren. Andre fylkeskommuner og kommuner kan ta kontakt for gratis åpning av skolenett-funksjoner (IP-range).
Nettsted og personvern: https://voxcuriosa.no/voxlexcompanion/

**Category** [REQUIRED]
Accessibility

**Single Purpose** [REQUIRED]
Gir umiddelbare synonymer, enkle ordforklaringer, opplesing og oversettelse når brukeren dobbeltklikker eller markerer et enkeltord på en nettside.

**Primary Language** [REQUIRED]
Norwegian (Bokmål)

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128x128 PNG | Ready | `icons/icon-128.png` |
| Toolbar Icon 48 | 48x48 PNG | Ready | `icons/icon-48.png` |
| Toolbar Icon 32 | 32x32 PNG | Ready | `icons/icon-32.png` |
| Toolbar Icon 16 | 16x16 PNG | Ready | `icons/icon-16.png` |
| Screenshot 1 [REQUIRED] | 1280x800 JPEG | Ready | `store-assets/screenshot-1-reading.jpg` |
| Screenshot 2 [RECOMMENDED] | 1280x800 JPEG | Ready | `store-assets/screenshot-2-multilingual.jpg` |
| Small Promo Tile [RECOMMENDED] | 440x280 JPEG | Ready | `store-assets/promo-small-440x280.jpg` |
| Marquee Promo Tile [RECOMMENDED] | 1400x560 JPEG | Ready | `store-assets/promo-marquee-1400x560.jpg` |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Lagrer kun brukerens lokale av/på-valg og valgte støttespråk lokalt på enheten (`chrome.storage.local`). Ingen data synkroniseres til skyen. |
| `https://voxlex-lookup-180422997316.europe-west1.run.app/*` | host_permissions | Kaller skolens anonyme, EU-baserte Vertex AI-endepunkt (`europe-west1`, IP-låst til skolenettet `139.164.0.0/16`) for utvidet oppslag og morsmålsoversettelse av enkeltord uten lagring eller sporing. |
| `https://snl.no/*` | host_permissions | Henter offisielle, korte fagartikkel-ingressutdrag fra Store norske leksikons åpne API ved oppslag av fagbegreper. |
| `https://no.wikipedia.org/*` | host_permissions | Henter korte artikkelsammendrag fra norsk Wikipedias åpne REST API som fallback ved oppslag av faguttrykk. |

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** No

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | No | No | Kun ett enkelt vasket oppslagsord sendes ved utvidet oppslag uten tilknyttet URL eller bruker-ID. | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy & Support

**Privacy Policy URL** [REQUIRED]
https://voxcuriosa.no/voxlexcompanion/

**Homepage URL** [RECOMMENDED]
https://voxcuriosa.no/voxlexcompanion/

**Support URL / Contact** [RECOMMENDED]
https://voxcuriosa.no/voxlexcompanion/

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.4 | 2026-10-30 | Klikkbar Hjelp/GDPR-lenke (`VoxLex Lesehjelp`) i popup-footer og full synkronisering av dokumentasjon og hjelpesenter. | Archived |
| 1.0.5 | 2026-10-30 | 100 % av Bokmålsordboka + Nynorskordboka offline (`130 600` oppslagsord, `[NYNORSK]`-merke) samt `[LOKAL MODUS]`-indikator med tooltip utenfor skolenett. | Ready |
| 1.0.3 | 2026-10-30 | Frekvensrangering og sammenslåing (`1) ... 2) ...`) av alle 3 396 homonymer i Bokmålsordboka, forbedret håndtering av sammensatte ord, og fleksibel header uten tekstkutt. | Superseded |
| 1.0.2 | 2026-10-29 | Lagt til full støtte for `blob:`/XHTML EPUB-iframer i Unibok/Smartbok (`match_origin_as_fallback` + direkte `contentDocument`-bro og koordinattransformasjon). | Superseded |
| 1.0.1 | 2026-10-29 | Oppdatert Ordbøkene-lenke (`/nob/bm,nn/`), lagt til 26 892 sterke/uregelmessige bøyningsformer i lokal `lemma.json`, og skjerpet `sanitizeWord`. | Superseded |
| 1.0.0 | 2026-10-27 | Første utgivelse av VoxLex Companion med lokal offline-ordbok, høykontrast-kort, taleopplesing, morsmålsstøtte, SNL/Wikipedia-integrasjon og Telemark skolenett-backend. | Superseded |
