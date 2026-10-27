#!/usr/bin/env node
/**
 * VoxLex Companion - Fullskala Lokal Ordbok- og Ikonbygger
 * Bygger data/ordbok/a.json ... å.json med kun betydning (d) og synonymer (s)
 * fra Bokmålsordboka (UiB/Språkrådet), UiO Norske Synonymer, Norsk Synonymordbok (MyThes)
 * og VGS-kjerneordforrådet. Ingen bøyningsparadigmer lagres eller vises.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SEED_PATH = path.join(__dirname, 'dictionary-seed.json');
const OUT_DIR = path.join(ROOT, 'data', 'ordbok');
const ICON_DIR = path.join(ROOT, 'icons');

const BM_GZ_PATH = '/tmp/bm_article.json.gz';
const UIO_SYN_PATH = '/tmp/norwegian-synonyms.json';
const MYTHES_PATH = '/tmp/th_nb_NO_v2.dat';

const ALPHABET = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'ae', 'oe', 'aa'
];

const ENTITY_MAP = {
  jf: 'jamfør', el: 'eller', e_l: 'eller lignende', o_l: 'og lignende',
  o_a: 'og annet', f_eks: 'for eksempel', bl_a: 'blant annet',
  overf: 'i overført betydning', mots: 'motsatt av', t_forsk_f: 'til forskjell fra',
  sm_o_s: 'samme som', forh: 'forhold', saerl: 'særlig', oppr: 'opprinnelig',
  trol: 'trolig', fork: 'forkortelse', fork_ing: 'forkorting for',
  adv: 'adverb', adj: 'adjektiv', subst: 'substantiv', bf: 'bestemt form'
};

const VALID_WORD_RX = /^[a-zæøåéèêëóòôöäàâüùûß\-]{2,35}$/;

function normalizeKey(word) {
  return String(word || '').trim().toLowerCase();
}

function getBucketLetter(word) {
  const first = normalizeKey(word).charAt(0);
  if (first === 'æ') return 'ae';
  if (first === 'ø') return 'oe';
  if (first === 'å') return 'aa';
  if (ALPHABET.includes(first)) return first;
  if ('éèêë'.includes(first)) return 'e';
  if ('óòôö'.includes(first)) return 'o';
  if ('äàâ'.includes(first)) return 'a';
  if ('üùû'.includes(first)) return 'u';
  return 'a';
}

function resolveExplanation(elem) {
  if (!elem || typeof elem.content !== 'string') return { def: '', syns: [] };
  const items = Array.isArray(elem.items) ? elem.items : [];
  const rawContent = elem.content.trim();

  // Sjekk om hele forklaringen kun er kryssreferanser ("$" eller "$, $") -> dette er direkte synonymer!
  if (/^(\$\s*,\s*)*\$$/.test(rawContent) && items.length > 0) {
    const refSyns = [];
    for (const it of items) {
      const lemma = it.word_form || (it.lemmas && it.lemmas[0] && it.lemmas[0].lemma);
      if (lemma) refSyns.push(normalizeKey(lemma));
    }
    return { def: '', syns: refSyns };
  }

  let idx = 0;
  const text = rawContent.replace(/\$/g, () => {
    const it = items[idx++];
    if (!it) return '';
    if (it.word_form) return it.word_form;
    if (it.lemmas && it.lemmas[0] && it.lemmas[0].lemma) return it.lemmas[0].lemma;
    if (it.id && ENTITY_MAP[it.id]) return ENTITY_MAP[it.id];
    if (it.text) return it.text;
    return it.id || '';
  });

  const clean = text.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
  if (!clean || /^jamfør\b|^se\b|^av\b|^det å\b/i.test(clean)) {
    const fallbackSyns = [];
    for (const it of items) {
      const lemma = it.lemmas && it.lemmas[0] && it.lemmas[0].lemma;
      if (lemma) fallbackSyns.push(normalizeKey(lemma));
    }
    return { def: /^det å\b/i.test(clean) ? clean : '', syns: fallbackSyns };
  }
  return { def: clean, syns: [] };
}

function extractArticleData(art) {
  const defs = [];
  const syns = [];
  function walkElements(elements) {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (!el || typeof el !== 'object') continue;
      if (el.type_ === 'explanation') {
        const res = resolveExplanation(el);
        if (res.def && defs.length < 2) defs.push(res.def);
        for (const s of res.syns) {
          if (s && !syns.includes(s)) syns.push(s);
        }
      } else if (Array.isArray(el.elements)) {
        walkElements(el.elements);
      }
    }
  }
  if (art && art.body && Array.isArray(art.body.definitions)) {
    walkElements(art.body.definitions);
  }
  let finalDef = defs[0] || '';
  if (finalDef) {
    finalDef = finalDef.charAt(0).toUpperCase() + finalDef.slice(1);
    if (!/[.!?]$/.test(finalDef)) finalDef += '.';
  }
  return { d: finalDef, s: syns.slice(0, 5) };
}

function loadMyThesSynonyms(synMap) {
  if (!fs.existsSync(MYTHES_PATH)) return;
  const lines = fs.readFileSync(MYTHES_PATH, 'latin1').split(/\r?\n/);
  let i = 1;
  while (i < lines.length) {
    const header = lines[i++];
    if (!header || !header.includes('|')) continue;
    const [rawWord, countStr] = header.split('|');
    const count = parseInt(countStr, 10) || 0;
    const key = normalizeKey(rawWord.replace(/\(.*?\)/g, ''));
    const collected = synMap.get(key) || [];
    for (let c = 0; c < count && i < lines.length; c++, i++) {
      const parts = lines[i].split('|').slice(1);
      for (const p of parts) {
        const cleanSyn = normalizeKey(p.replace(/\(.*?\)/g, ''));
        if (cleanSyn && cleanSyn !== key && VALID_WORD_RX.test(cleanSyn) && !collected.includes(cleanSyn)) {
          collected.push(cleanSyn);
        }
      }
    }
    if (VALID_WORD_RX.test(key) && collected.length > 0) {
      synMap.set(key, collected.slice(0, 6));
    }
  }
}

function buildDictionary() {
  const entries = {};
  const synMap = new Map();

  // 1. Last inn UiO / Kunnskapsforlagets Norske Synonymer (24 649 oppslagsord)
  if (fs.existsSync(UIO_SYN_PATH)) {
    const uio = JSON.parse(fs.readFileSync(UIO_SYN_PATH, 'utf8'));
    for (const [w, list] of Object.entries(uio)) {
      const key = normalizeKey(w);
      if (!VALID_WORD_RX.test(key) || !Array.isArray(list)) continue;
      const cleanList = list.map(normalizeKey).filter((s) => s && s !== key && VALID_WORD_RX.test(s));
      if (cleanList.length > 0) synMap.set(key, cleanList.slice(0, 6));
    }
  }

  // 2. Last inn LibreOffice Norsk Synonymordbok (th_nb_NO_v2.dat)
  loadMyThesSynonyms(synMap);

  // 3. Last inn Bokmålsordboka (94 107 artikler fra UiB / Språkrådet)
  if (fs.existsSync(BM_GZ_PATH)) {
    const bm = JSON.parse(zlib.gunzipSync(fs.readFileSync(BM_GZ_PATH)).toString('utf8'));
    for (const art of Object.values(bm)) {
      if (!art || !Array.isArray(art.lemmas)) continue;
      const extracted = extractArticleData(art);
      if (!extracted.d && extracted.s.length === 0) continue;
      for (const lObj of art.lemmas) {
        const key = normalizeKey(lObj && lObj.lemma);
        if (!VALID_WORD_RX.test(key)) continue;
        const mergedSyns = [
          ...extracted.s.filter((s) => s !== key && VALID_WORD_RX.test(s)),
          ...(synMap.get(key) || [])
        ].filter((v, idx, arr) => v && arr.indexOf(v) === idx).slice(0, 4);

        const defText = extracted.d || (mergedSyns.length > 0 ? `Betyr det samme som ${mergedSyns.slice(0, 3).join(', ')}.` : '');
        if (!defText) continue;

        if (!entries[key] || (entries[key].s.length === 0 && mergedSyns.length > 0)) {
          entries[key] = { d: defText, s: mergedSyns };
        }
      }
    }
  }

  // 4. Legg til rene synonym-oppslagsord som ikke allerede lå i Bokmålsordboka
  for (const [key, syns] of synMap.entries()) {
    if (!entries[key] && syns.length > 0) {
      const donor = syns.find((s) => entries[s] && entries[s].d);
      entries[key] = {
        d: donor ? entries[donor].d : `Ord med tilsvarende betydning som ${syns.slice(0, 3).join(', ')}.`,
        s: syns.slice(0, 4)
      };
    } else if (entries[key] && entries[key].s.length < 2) {
      entries[key].s = [...entries[key].s, ...syns].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
    }
  }

  // 5. Overstyr med skreddersydde VGS-forklaringer fra dictionary-seed.json og toveis synonym-berikelse
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  for (const [word, data] of Object.entries(seed.entries || {})) {
    const key = normalizeKey(word);
    entries[key] = { d: String(data.d).trim(), s: (data.s || []).slice(0, 4) };
    for (const syn of data.s || []) {
      const synKey = normalizeKey(syn);
      if (!VALID_WORD_RX.test(synKey)) continue;
      const siblings = [key, ...(data.s || []).map(normalizeKey).filter((s) => s !== synKey && VALID_WORD_RX.test(s))];
      if (!entries[synKey]) {
        entries[synKey] = { d: String(data.d).trim(), s: siblings.slice(0, 4) };
      } else {
        entries[synKey].s = [...entries[synKey].s, ...siblings].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
      }
    }
  }

  // Toveis kryssindeksering: hvis A har synonym B, sørg for at B også kjenner til A
  for (const [key, item] of Object.entries(entries)) {
    for (const syn of item.s || []) {
      if (entries[syn] && entries[syn].s.length < 4 && !entries[syn].s.includes(key)) {
        entries[syn].s.push(key);
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const buckets = Object.fromEntries(ALPHABET.map((l) => [l, {}]));
  let totalEntries = 0;
  let withSynonyms = 0;

  for (const [key, item] of Object.entries(entries)) {
    const letter = getBucketLetter(key);
    buckets[letter][key] = { d: item.d, s: item.s };
    totalEntries++;
    if (item.s && item.s.length > 0) withSynonyms++;
  }

  for (const letter of ALPHABET) {
    fs.writeFileSync(path.join(OUT_DIR, `${letter}.json`), JSON.stringify(buckets[letter]), 'utf8');
  }
  fs.writeFileSync(path.join(OUT_DIR, 'lemma.json'), JSON.stringify(seed.irregularLemmas || {}), 'utf8');
  return { totalEntries, withSynonyms };
}

if (require.main === module) {
  const stats = buildDictionary();
  console.log(`[OK] Fullskala ordbok bygget: ${stats.totalEntries} oppslagsord (${stats.withSynonyms} med synonymer) i data/ordbok/`);
}

module.exports = { buildDictionary };
