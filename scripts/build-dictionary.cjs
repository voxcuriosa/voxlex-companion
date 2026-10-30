#!/usr/bin/env node
/**
 * VoxLex Companion - Fullskala Lokal Ordbokbygger (Bokmål + Nynorsk + Synonymer)
 * Bygger data/ordbok/a.json ... aa.json + lemma.json med betydning (d), synonymer (s)
 * og nynorsk-markør (n: 1) fra Bokmålsordboka, Nynorskordboka, UiO Synonymer,
 * MyThes og VGS-kjerneordforrådet. Ingen bøyningsparadigmer vises i UI.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SEED_PATH = path.join(__dirname, 'dictionary-seed.json');
const OUT_DIR = path.join(ROOT, 'data', 'ordbok');
const BM_GZ_PATH = '/tmp/bm_article.json.gz';
const NN_GZ_PATH = '/tmp/nn_article.json.gz';
const UIO_SYN_PATH = '/tmp/norwegian-synonyms.json';
const MYTHES_PATH = '/tmp/th_nb_NO_v2.dat';

const ALPHABET = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','ae','oe','aa'];
const ENTITY_MAP = {
  jf: 'jamfør', el: 'eller', e_l: 'eller lignende', o_l: 'og lignende', o_a: 'og annet', f_eks: 'for eksempel',
  bl_a: 'blant annet', overf: 'i overført betydning', mots: 'motsatt av', t_forsk_f: 'til forskjell fra',
  sm_o_s: 'samme som', forh: 'forhold', saerl: 'særlig', oppr: 'opprinnelig', trol: 'trolig',
  fork: 'forkortelse', fork_ing: 'forkorting for', adv: 'adverb', adj: 'adjektiv', subst: 'substantiv', bf: 'bestemt form'
};
const VALID_WORD_RX = /^[a-zæøåéèêëóòôöäàâüùûß\-]{2,35}$/;
const SUFFIXES = [
  'ingene','ingens','ingers','ingane','ingen','inger','ingar','ings','ing','enes','anes','ende','ande',
  'este','aste','ene','ane','orne','ens','ets','ere','are','est','ast','er','ar','or','et','en','te','de','es','as','a','t','e','s'
];

function normalizeKey(word) { return String(word || '').trim().toLowerCase(); }
function getBucketLetter(word) {
  const f = normalizeKey(word).charAt(0);
  if (f === 'æ') return 'ae';
  if (f === 'ø') return 'oe';
  if (f === 'å') return 'aa';
  if (ALPHABET.includes(f)) return f;
  if ('éèêë'.includes(f)) return 'e';
  if ('óòôö'.includes(f)) return 'o';
  if ('äàâ'.includes(f)) return 'a';
  if ('üùû'.includes(f)) return 'u';
  return 'a';
}

function hasRegularStem(wf, base) {
  for (const suf of SUFFIXES) {
    if (wf.length > suf.length + 2 && wf.endsWith(suf)) {
      const st = wf.slice(0, -suf.length);
      if (st === base || st + 'e' === base || st + 'a' === base) return true;
      if (st.length >= 4 && st[st.length - 1] === st[st.length - 2] && st.slice(0, -1) === base) return true;
    }
  }
  return false;
}

function resolveExplanation(elem) {
  if (!elem || typeof elem.content !== 'string') return { def: '', syns: [] };
  const items = Array.isArray(elem.items) ? elem.items : [];
  const rawContent = elem.content.trim();

  if (/^(\$\s*,\s*)*\$$/.test(rawContent) && items.length > 0) {
    const refSyns = [];
    const phrases = [];
    for (const it of items) {
      const lemma = normalizeKey(it.word_form || (it.lemmas && it.lemmas[0] && it.lemmas[0].lemma));
      if (!lemma) continue;
      if (VALID_WORD_RX.test(lemma)) refSyns.push(lemma);
      else phrases.push(lemma);
    }
    return { def: phrases.join(', '), syns: refSyns };
  }

  let idx = 0;
  const text = rawContent.replace(/\$/g, () => {
    const it = items[idx++];
    if (!it) return '';
    return it.word_form || (it.lemmas && it.lemmas[0] && it.lemmas[0].lemma) || (it.id && ENTITY_MAP[it.id]) || it.text || it.id || '';
  });

  const clean = text.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
  if (!clean || (items.length > 0 && /^jamfør\b|^se\b|^av\b/i.test(clean))) {
    const fallbackSyns = [];
    for (const it of items) {
      const lemma = normalizeKey(it.lemmas && it.lemmas[0] && it.lemmas[0].lemma);
      if (lemma && VALID_WORD_RX.test(lemma)) fallbackSyns.push(lemma);
    }
    return { def: '', syns: fallbackSyns };
  }
  return { def: clean, syns: [] };
}

function extractArticleData(art) {
  const defs = [];
  const syns = [];
  let exampleQuote = '';
  function walkElements(elements) {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (!el || typeof el !== 'object') continue;
      if (el.type_ === 'explanation') {
        const res = resolveExplanation(el);
        if (res.def && defs.length < 2) defs.push(res.def);
        for (const s of res.syns) if (s && !syns.includes(s)) syns.push(s);
      } else if (el.type_ === 'example' && !exampleQuote && el.quote && el.quote.content) {
        const qRes = resolveExplanation(el.quote);
        if (qRes.def) exampleQuote = qRes.def;
      } else if (Array.isArray(el.elements)) {
        walkElements(el.elements);
      } else if (el.type_ === 'sub_article' && defs.length === 0 && el.article && el.article.body) {
        walkElements(el.article.body.definitions);
      }
    }
  }
  if (art && art.body && Array.isArray(art.body.definitions)) walkElements(art.body.definitions);
  let finalDef = defs[0] || '';
  if (finalDef) {
    finalDef = finalDef.charAt(0).toUpperCase() + finalDef.slice(1);
    if (!/[.!?]$/.test(finalDef)) finalDef += '.';
  }
  return { d: finalDef, s: syns.slice(0, 5), ex: exampleQuote };
}

function loadMyThesSynonyms(synMap) {
  if (!fs.existsSync(MYTHES_PATH)) return;
  const lines = fs.readFileSync(MYTHES_PATH, 'latin1').split(/\r?\n/);
  for (let i = 1; i < lines.length; ) {
    const header = lines[i++];
    if (!header || !header.includes('|')) continue;
    const [rawWord, countStr] = header.split('|');
    const count = parseInt(countStr, 10) || 0;
    const key = normalizeKey(rawWord.replace(/\(.*?\)/g, ''));
    const collected = synMap.get(key) || [];
    for (let c = 0; c < count && i < lines.length; c++, i++) {
      for (const p of lines[i].split('|').slice(1)) {
        const cleanSyn = normalizeKey(p.replace(/\(.*?\)/g, ''));
        if (cleanSyn && cleanSyn !== key && VALID_WORD_RX.test(cleanSyn) && !collected.includes(cleanSyn)) collected.push(cleanSyn);
      }
    }
    if (VALID_WORD_RX.test(key) && collected.length > 0) synMap.set(key, collected.slice(0, 6));
  }
}

function resolveCompoundFallback(word, entries, exampleQuote, isNn) {
  for (let i = word.length - 3; i >= 3; i--) {
    const rawL = word.slice(0, i);
    const r = word.slice(i);
    if (!entries[r]) continue;
    const cands = [rawL, rawL + 'e'];
    if (rawL.endsWith('s') && rawL.length >= 4) cands.push(rawL.slice(0, -1));
    if (rawL.endsWith('e') && rawL.length >= 4) cands.push(rawL.slice(0, -1));
    for (const l of cands) {
      if (entries[l]) {
        const rightDef = String(entries[r].d || '').replace(/^1\)\s*/, '').replace(/\s*2\)\s*.*$/, '');
        return { d: `Sammensatt av «${l}» og «${r}». ${rightDef}`, s: [l, r] };
      }
    }
  }
  const dictName = isNn ? 'Nynorskordboka' : 'Bokmålsordboka';
  return {
    d: exampleQuote ? `Oppslagsord i ${dictName} (brukt i uttrykk som «${exampleQuote}»).` : `Sammensatt oppslagsord i ${dictName}.`,
    s: []
  };
}

function ingestOrdBankFile(gzPath, isNn, entries, synMap, irregularLemmas, pendingCompounds) {
  if (!fs.existsSync(gzPath)) return;
  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(gzPath)).toString('utf8'));
  const refCounts = {};
  const exCounts = {};
  for (const [id, art] of Object.entries(raw)) {
    const s = JSON.stringify((art && art.body) || {});
    exCounts[id] = (s.match(/"type_":"example"/g) || []).length;
    for (const m of s.matchAll(/"article_id":(\d+)/g)) refCounts[m[1]] = (refCounts[m[1]] || 0) + 1;
  }
  const sortedArts = Object.entries(raw).sort(([idA], [idB]) =>
    ((refCounts[idB] || 0) * 10 + (exCounts[idB] || 0)) - ((refCounts[idA] || 0) * 10 + (exCounts[idA] || 0))
  );

  for (const [artId, art] of sortedArts) {
    if (!art || !Array.isArray(art.lemmas)) continue;
    const extracted = extractArticleData(art);
    const artRefs = refCounts[artId] || 0;
    for (const lObj of art.lemmas) {
      const key = normalizeKey(lObj && lObj.lemma);
      if (!VALID_WORD_RX.test(key)) continue;

      for (const p of lObj.paradigm_info || []) {
        for (const inf of p.inflection || []) {
          const wf = normalizeKey(inf && inf.word_form);
          if (wf && wf !== key && VALID_WORD_RX.test(wf) && !hasRegularStem(wf, key) && !irregularLemmas[wf]) {
            irregularLemmas[wf] = key;
          }
        }
      }

      if (isNn && entries[key] && !entries[key].n) continue;
      const mergedSyns = [...extracted.s.filter((s) => s !== key && VALID_WORD_RX.test(s)), ...(synMap.get(key) || [])]
        .filter((v, idx, arr) => v && arr.indexOf(v) === idx)
        .slice(0, 4);
      const defText = extracted.d || (mergedSyns.length > 0 ? `Betyr det samme som ${mergedSyns.slice(0, 3).join(', ')}.` : '');
      if (!defText) {
        if (!entries[key] && !pendingCompounds.has(key)) pendingCompounds.set(key, { ex: extracted.ex, isNn });
        continue;
      }

      if (!entries[key]) {
        entries[key] = { d: defText, s: mergedSyns, senses: [defText], ...(isNn ? { n: 1 } : {}) };
      } else {
        if (entries[key].s.length === 0 && mergedSyns.length > 0) entries[key].s = mergedSyns;
        if (extracted.d && entries[key].senses && entries[key].senses.length < 2 && artRefs > 0 && !entries[key].senses.includes(extracted.d)) {
          entries[key].senses.push(extracted.d);
          entries[key].d = `1) ${entries[key].senses[0]} 2) ${entries[key].senses[1]}`;
        }
      }
    }
  }
}

function buildDictionary() {
  const entries = {};
  const synMap = new Map();
  const irregularLemmas = {};
  const pendingCompounds = new Map();

  if (fs.existsSync(UIO_SYN_PATH)) {
    const uio = JSON.parse(fs.readFileSync(UIO_SYN_PATH, 'utf8'));
    for (const [w, list] of Object.entries(uio)) {
      const key = normalizeKey(w);
      if (!VALID_WORD_RX.test(key) || !Array.isArray(list)) continue;
      const cleanList = list.map(normalizeKey).filter((s) => s && s !== key && VALID_WORD_RX.test(s));
      if (cleanList.length > 0) synMap.set(key, cleanList.slice(0, 6));
    }
  }
  loadMyThesSynonyms(synMap);
  ingestOrdBankFile(BM_GZ_PATH, false, entries, synMap, irregularLemmas, pendingCompounds);
  ingestOrdBankFile(NN_GZ_PATH, true, entries, synMap, irregularLemmas, pendingCompounds);

  for (const [key, info] of pendingCompounds.entries()) {
    if (!entries[key]) {
      const resolved = resolveCompoundFallback(key, entries, info.ex, info.isNn);
      entries[key] = { d: resolved.d, s: resolved.s, ...(info.isNn ? { n: 1 } : {}) };
    }
  }
  for (const [key, syns] of synMap.entries()) {
    if (!entries[key] && syns.length > 0) {
      const donor = syns.find((s) => entries[s] && entries[s].d);
      entries[key] = { d: donor ? entries[donor].d : `Ord med tilsvarende betydning som ${syns.slice(0, 3).join(', ')}.`, s: syns.slice(0, 4) };
    }
  }

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  for (const [word, data] of Object.entries(seed.entries || {})) {
    const key = normalizeKey(word);
    entries[key] = { d: String(data.d).trim(), s: (data.s || []).slice(0, 4) };
    for (const syn of data.s || []) {
      const synKey = normalizeKey(syn);
      if (!VALID_WORD_RX.test(synKey)) continue;
      const siblings = [key, ...(data.s || []).map(normalizeKey).filter((s) => s !== synKey && VALID_WORD_RX.test(s))];
      if (!entries[synKey]) entries[synKey] = { d: String(data.d).trim(), s: siblings.slice(0, 4) };
      else entries[synKey].s = [...entries[synKey].s, ...siblings].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const buckets = Object.fromEntries(ALPHABET.map((l) => [l, {}]));
  let totalEntries = 0;
  let nynorskEntries = 0;
  for (const [key, item] of Object.entries(entries)) {
    const rec = { d: item.d, s: item.s };
    if (item.n) {
      rec.n = 1;
      nynorskEntries++;
    }
    buckets[getBucketLetter(key)][key] = rec;
    totalEntries++;
  }
  for (const letter of ALPHABET) fs.writeFileSync(path.join(OUT_DIR, `${letter}.json`), JSON.stringify(buckets[letter]), 'utf8');
  for (const wf of Object.keys(irregularLemmas)) if (entries[wf]) delete irregularLemmas[wf];
  Object.assign(irregularLemmas, seed.irregularLemmas || {});
  fs.writeFileSync(path.join(OUT_DIR, 'lemma.json'), JSON.stringify(irregularLemmas), 'utf8');
  return { totalEntries, nynorskEntries, irregularCount: Object.keys(irregularLemmas).length };
}

if (require.main === module) {
  const s = buildDictionary();
  console.log(`[OK] Ordbok bygget: ${s.totalEntries} oppslagsord (${s.nynorskEntries} nynorsk, ${s.irregularCount} bøyninger)`);
}

module.exports = { buildDictionary };
