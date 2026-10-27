#!/usr/bin/env node
/**
 * VoxLex Companion - Automatisk Testsuite (scripts/test-offline-lookup.cjs)
 * Tester lokal 0 ms ordbok, synonymer, lydløs grunnordsnormalisering,
 * sammensatte ord, PII-ordvasker, Telemark IP-lås (139.164.154.162 / 139.164.0.0/16),
 * samt prosjektregler (No Emojis, Zero Lag, Zero innerHTML, maks 300 linjer).
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const Lookup = require(path.join(ROOT, 'content', 'voxlex-lookup.js'));
const Backend = require(path.join(ROOT, 'backend', 'index.js'));

// Koble lokal filinnleser for Node-testing av content/voxlex-lookup.js
Lookup.setCustomJsonLoader(async (relPath) => {
  const fullPath = path.join(ROOT, relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
});

// Forby alle emojier, men tillat det eksplisitt spesifiserte lukkesymbolet \u2715 (✕)
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{2714}\u{2716}-\u{27BF}]/u;

async function runTests() {
  let passed = 0;
  function ok(name, cond) {
    assert.strictEqual(Boolean(cond), true, `FEILET: ${name}`);
    passed++;
    console.log(`[PASS] ${name}`);
  }

  // 1. Direkte oppslag av oppslagsord, betydning og synonymer (< 1 ms)
  const t0 = process.hrtime.bigint();
  const demokrati = await Lookup.lookupLocal('demokrati');
  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
  ok('Direkte oppslag "demokrati" finnes lokalt', demokrati.found && demokrati.tier === 1);
  ok('Direkte oppslag returnerer synonymer og betydning', demokrati.synonyms.includes('folkestyre') && demokrati.definition.length > 20);
  ok(`Lokalt oppslag er lynraskt (${elapsedMs.toFixed(2)} ms)`, elapsedMs < 25);

  // 2. Klikk på synonym-pille er kryssindeksert i lokal ordbok
  const medbestemmelse = await Lookup.lookupLocal('medbestemmelse');
  ok('Kryssindeksert synonym "medbestemmelse" gir direkte lokalt treff', medbestemmelse.found && medbestemmelse.synonyms.length >= 2);

  // 3. Lydløs oppslagsnormalisering for bøyde ord i løpende tekst
  const inflectedCases = [
    ['folkestyrene', 'folkestyre'],
    ['demokratier', 'demokrati'],
    ['lærte', 'lære'],
    ['utfordringene', 'utfordring'],
    ['konsekvensene', 'konsekvens']
  ];
  for (const [surface, expectedHead] of inflectedCases) {
    const res = await Lookup.lookupLocal(surface);
    ok(`Bøyd ord i tekst "${surface}" gir betydning/synonymer for "${expectedHead}"`, res.found && res.headword === expectedHead && res.synonyms.length >= 2);
  }

  // 4. Sammensatte ord: Både direkte oppslag i fullordboka (96 600+ ord) og dynamisk compound splitter
  const directCompounds = ['samfunnsutvikling', 'klimaendring', 'arbeidsmiljø'];
  for (const word of directCompounds) {
    const res = await Lookup.lookupLocal(word);
    ok(`Oppslagsord "${word}" finnes direkte i den utvidede lokale ordboka`, res.found && res.definition.length > 10);
  }

  const dynamicCompounds = [
    ['solcelletak', 'solcelle', 'tak'],
    ['demokratiutvikling', 'demokrati', 'utvikling'],
    ['kildekritikkoppgave', 'kildekritikk', 'oppgave']
  ];
  for (const [compound, p1, p2] of dynamicCompounds) {
    const res = await Lookup.lookupLocal(compound);
    ok(
      `Dynamisk sammensatt ord "${compound}" deles i "${p1}" + "${p2}" med sammensatt forklaring`,
      res.found && res.type === 'compound' && res.parts[0] === p1 && res.parts[1] === p2
    );
  }

  // 5. Streng PII- og ord-vasker (Ingen fritekst, ingen personnummer, ingen e-post)
  ok('Ordvasker godtar gyldig ord med tegnsetting: "«Bærekraftig»," -> "bærekraftig"', Lookup.sanitizeWord('«Bærekraftig»,') === 'bærekraftig');
  ok('Ordvasker avviser fritekst med flere ord ("Ola Nordmann")', Lookup.sanitizeWord('Ola Nordmann') === '');
  ok('Ordvasker avviser fødselsnummer/tall ("12050812345")', Lookup.sanitizeWord('12050812345') === '');
  ok('Ordvasker avviser e-postadresse ("elev@skole.no")', Lookup.sanitizeWord('elev@skole.no') === '');

  // 6. Telemark fylkeskommune IP-lås (139.164.0.0/16 inkl. 139.164.154.162)
  ok('Telemark elev-IP 139.164.154.162 er godkjent i IP-låsen', Backend.isAllowedTelemarkIp('139.164.154.162'));
  ok('Telemark IPv4-mapped IPv6 ::ffff:139.164.154.162 er godkjent', Backend.isAllowedTelemarkIp('::ffff:139.164.154.162'));
  ok('Telemark subnett yttergrense 139.164.0.1 og 139.164.255.254 er godkjent', Backend.isAllowedTelemarkIp('139.164.0.1') && Backend.isAllowedTelemarkIp('139.164.255.254'));
  ok('Ekstern hjemme-IP 84.215.42.19 avvises med false', !Backend.isAllowedTelemarkIp('84.215.42.19'));

  // Test HTTP 403 respons og pedagogisk melding utenfor skolenettet
  let capturedStatus = 0;
  let capturedBody = null;
  await Backend.voxlexLookup(
    { method: 'POST', headers: { 'x-forwarded-for': '84.215.42.19' }, body: { word: 'kvantecomputer' } },
    {
      setHeader: () => {},
      end: (str) => {
        capturedBody = JSON.parse(str);
      },
      set statusCode(code) {
        capturedStatus = code;
      }
    }
  );
  ok(
    'Backend returnerer 403 og pedagogisk melding utenfor Telemark skolenett',
    capturedStatus === 403 &&
      capturedBody.message ===
        'Dette ordet finnes ikke i den lokale ordboka. Utvidet søk er kun tilgjengelig når du er koblet til skolens nettverk.'
  );

  // 7. Sjekk ikonfiler og eksakte pikseldimensjoner i PNG IHDR
  for (const size of [16, 32, 48, 128]) {
    const iconBuf = fs.readFileSync(path.join(ROOT, 'icons', `icon-${size}.png`));
    const width = iconBuf.readUInt32BE(16);
    const height = iconBuf.readUInt32BE(20);
    ok(`Ikon icons/icon-${size}.png har eksakt dimensjon ${size}x${size}px`, width === size && height === size);
  }

  // 8. Prosjektregler: Maks 300 linjer per kildefil, 0 emojier, 0 backdrop-blur, 0 innerHTML
  const codeFiles = [
    'manifest.json',
    'background/service-worker.js',
    'content/voxlex-lookup.js',
    'content/voxlex-ui.js',
    'content/voxlex-helper.js',
    'content/voxlex-helper.css',
    'backend/index.js',
    'scripts/build-dictionary.cjs',
    'scripts/test-offline-lookup.cjs'
  ];

  for (const rel of codeFiles) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const lines = content.split('\n').length;
    ok(`Filstørrelse under 300 linjer: ${rel} (${lines} linjer)`, lines <= 300);
    ok(`No Emojis Policy overholdt i ${rel}`, !EMOJI_REGEX.test(content));
    if (rel.endsWith('.js') && !rel.startsWith('scripts/')) {
      ok(`Zero innerHTML overholdt i ${rel}`, !/\binnerHTML\b/.test(content));
    }
    if (rel.endsWith('.css')) {
      ok(`Zero backdrop-blur/filter overholdt i ${rel}`, !/backdrop-filter|backdrop-blur/i.test(content));
    }
  }

  // 9. Synkroniseringskontroll (privacy-and-docs-sync)
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const swCode = fs.readFileSync(path.join(ROOT, 'background/service-worker.js'), 'utf8');
  const helperCode = fs.readFileSync(path.join(ROOT, 'content/voxlex-helper.js'), 'utf8');
  const cwsDoc = fs.readFileSync(path.join(ROOT, 'CHROMEWEBSTORE.md'), 'utf8');
  const geminiDoc = fs.readFileSync(path.join(ROOT, 'GEMINI.md'), 'utf8');
  const secSkill = fs.readFileSync(path.join(ROOT, '.agents/skills/chrome-extension-security/SKILL.md'), 'utf8');

  for (const hostPerm of manifest.host_permissions || []) {
    ok(`host_permission "${hostPerm}" i manifest.json er dokumentert i CHROMEWEBSTORE.md`, cwsDoc.includes(hostPerm));
  }
  ok(
    'Ingen tredjeparts MyMemory-API i manifest.json, service-worker.js, CHROMEWEBSTORE.md eller GEMINI.md',
    !JSON.stringify(manifest).includes('mymemory') &&
      !swCode.includes('mymemory') &&
      !cwsDoc.includes('mymemory') &&
      !geminiDoc.includes('mymemory')
  );
  for (const examHost of ['inspera.no', 'inspera.com', 'wiseflow.net', 'digiexam.com']) {
    const inManifest = (manifest.content_scripts[0].exclude_matches || []).some((m) => m.includes(examHost));
    const inHelper = helperCode.includes(examHost.replace('.', '\\.'));
    const inSkill = secSkill.includes(examHost);
    ok(
      `Eksamensplattform "${examHost}" er blokkert i manifest.json, voxlex-helper.js og dokumentert i SKILL.md`,
      inManifest && inHelper && inSkill
    );
  }

  console.log(`\n[SUKSESS] Alle ${passed} tester bestatt uten feil.`);
}

runTests().catch((err) => {
  console.error('[FEIL]', err);
  process.exit(1);
});
