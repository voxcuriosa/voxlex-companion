# Chrome Web Store Listing - VoxLex Companion

> Last Updated: 2026-10-27

## Store Listing

**Extension Name** [REQUIRED]
VoxLex Companion

**Short Description** [REQUIRED]
Rask, 100 % personverntrygg ordforklarings- og synonymutvidelse med opplesing og morsmålsstøtte for videregående skole.

**Detailed Description** [REQUIRED]
VoxLex Companion gir elever og lærere umiddelbare synonymer, enkle ordforklaringer og taleopplesing ved dobbeltklikk eller markering av enkeltord på nettsider og i digitale læremidler.

Nøkkelfunksjoner:
Lynrask lokal ordbok som fungerer overalt – på skolen, hjemme og uten nettilgang.
Tydelige synonymer og korte, lettleste forklaringer tilpasset elever i videregående skole.
Innebygd norsk taleopplesing av oppslagsord og forklaring.
Morsmålsstøtte med oversettelse til sentrale støttespråk direkte i oppslagskortet.
Direkte fordypningslenker til Ordbøkene.no, Store norske leksikon (SNL) og Wikipedia når du er på nett.
Høykontrast og dysleksivennlig visning som fungerer sømløst også inne i digitale e-bøker.

Slik bruker du utvidelsen:
1. Dobbeltklikk på eller marker et enkeltord på en nettside eller i en digital lærebok.
2. Et lesevennlig kort viser umiddelbart synonymer og en enkel forklaring på ordet.
3. Klikk på LYD for å få ordet og forklaringen lest opp, eller velg ønsket morsmål i menyen øverst i kortet.
4. Klikk på utvidelsesikonet i verktøylinjen dersom du ønsker å slå utvidelsen midlertidig av eller på.

Personvern og sikkerhet (100 % GDPR-trygg):
VoxLex Companion krever ingen innlogging, lagrer ingen personopplysninger, bruker ingen informasjonskapsler (cookies) og sporer aldri hva du leser. Valgt språk og av/på-status lagres kun lokalt på din egen maskin.

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
