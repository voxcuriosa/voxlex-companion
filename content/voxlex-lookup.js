/**
 * VoxLex Companion - Lokal Ordbok- og Oppslagsmotor (Tier-1 + Service Worker bro)
 * Gir 0 ms oppslag av synonymer og betydning fra data/ordbok/, inkludert
 * lydløs grunnordsnormalisering og lokal ordsammenstillingsdeler (compound splitter).
 */

(function initVoxLexLookup(globalScope) {
  'use strict';

  const ALPHABET = new Set([
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'ae', 'oe', 'aa'
  ]);

  const WORD_PATTERN = /^[a-zæøåéèêëóòôöäàâüùûß](?:[a-zæøåéèêëóòôöäàâüùûß\-]{0,33}[a-zæøåéèêëóòôöäàâüùûß])$/i;
  const bucketCache = new Map();
  let lemmaCache = null;
  let customLoader = null;

  function setCustomJsonLoader(fn) {
    customLoader = fn;
  }

  function sanitizeWord(raw) {
    if (typeof raw !== 'string') return '';
    const trimmed = raw
      .trim()
      .replace(/^[^a-zA-ZæøåÆØÅéèêëóòôöäàâüùûß]+|[^a-zA-ZæøåÆØÅéèêëóòôöäàâüùûß]+$/g, '')
      .toLowerCase();
    if (!trimmed || trimmed.includes(' ') || trimmed.includes('--') || !WORD_PATTERN.test(trimmed)) {
      return '';
    }
    return trimmed;
  }

  function getBucketLetter(word) {
    const first = String(word || '').charAt(0).toLowerCase();
    if (first === 'æ') return 'ae';
    if (first === 'ø') return 'oe';
    if (first === 'å') return 'aa';
    if (ALPHABET.has(first)) return first;
    if ('éèêë'.includes(first)) return 'e';
    if ('óòôö'.includes(first)) return 'o';
    if ('äàâ'.includes(first)) return 'a';
    if ('üùû'.includes(first)) return 'u';
    return 'a';
  }

  async function loadJsonResource(relPath) {
    if (customLoader) {
      return customLoader(relPath);
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      const url = chrome.runtime.getURL(relPath);
      const response = await fetch(url);
      if (!response.ok) return {};
      return response.json();
    }
    return {};
  }

  async function getBucket(letter) {
    const key = getBucketLetter(letter);
    if (bucketCache.has(key)) {
      return bucketCache.get(key);
    }
    try {
      const data = await loadJsonResource(`data/ordbok/${key}.json`);
      bucketCache.set(key, data || {});
      return data || {};
    } catch (_err) {
      bucketCache.set(key, {});
      return {};
    }
  }

  async function getLemmaMap() {
    if (lemmaCache !== null) return lemmaCache;
    try {
      lemmaCache = (await loadJsonResource('data/ordbok/lemma.json')) || {};
      return lemmaCache;
    } catch (_err) {
      lemmaCache = {};
      return lemmaCache;
    }
  }

  async function findExactEntry(word) {
    if (!word || word.length < 2) return null;
    const bucket = await getBucket(word);
    return bucket[word] || null;
  }

  function generateCandidateStems(word) {
    const suffixes = [
      'ingene', 'ingens', 'ingers', 'ingane', 'ingen', 'inger', 'ingar', 'ings', 'ing',
      'enes', 'anes', 'ende', 'ande', 'este', 'aste', 'ene', 'ane', 'orne', 'ens', 'ets',
      'ere', 'are', 'est', 'ast', 'er', 'ar', 'or', 'et', 'en', 'te', 'de', 'es', 'as', 'a', 't', 'e', 's'
    ];
    const candidates = [];
    for (const suf of suffixes) {
      if (word.length > suf.length + 2 && word.endsWith(suf)) {
        const stem = word.slice(0, -suf.length);
        if (suf.indexOf('ing') === 0 || suf === 'ende' || suf === 'ande') {
          candidates.push(stem + 'e', stem, stem + 'a');
        } else {
          candidates.push(stem, stem + 'e', stem + 'a');
        }
        if (stem.length >= 4 && stem[stem.length - 1] === stem[stem.length - 2]) {
          candidates.push(stem.slice(0, -1));
        }
      }
    }
    return candidates;
  }

  async function findBaseEntry(word) {
    const direct = await findExactEntry(word);
    if (direct) {
      return { headword: word, entry: direct, exact: true };
    }

    const lemmas = await getLemmaMap();
    if (lemmas[word]) {
      const target = lemmas[word];
      const lemmaEntry = await findExactEntry(target);
      if (lemmaEntry) {
        return { headword: target, entry: lemmaEntry, exact: false };
      }
    }

    const stems = generateCandidateStems(word);
    for (const candidate of stems) {
      const stemEntry = await findExactEntry(candidate);
      if (stemEntry) {
        return { headword: candidate, entry: stemEntry, exact: false };
      }
    }
    return null;
  }

  function primarySense(def) {
    return String(def || '').replace(/^1\)\s*/, '').replace(/\s*2\)\s*.*$/, '').trim();
  }

  async function splitCompoundWord(word) {
    if (!word || word.length < 6) return null;

    // Forsøk deling fra lengste forledd slik at f.eks. «solcelletak» deles i «solcelle» + «tak»
    for (let i = word.length - 3; i >= 3; i--) {
      const rawLeft = word.slice(0, i);
      const rawRight = word.slice(i);
      if (rawRight.length < 3) continue;

      const leftCandidates = [rawLeft];
      if (rawLeft.endsWith('s') && rawLeft.length >= 4) {
        leftCandidates.push(rawLeft.slice(0, -1));
      }
      if (!rawLeft.endsWith('e')) {
        leftCandidates.push(rawLeft + 'e');
      }

      for (const leftWord of leftCandidates) {
        const leftHit = await findExactEntry(leftWord);
        if (!leftHit) continue;

        const rightHit = await findBaseEntry(rawRight);
        if (!rightHit) continue;

        return {
          found: true,
          tier: 1,
          type: 'compound',
          word,
          headword: word,
          isNynorsk: Boolean(leftHit.n || rightHit.entry.n),
          parts: [leftWord, rightHit.headword],
          definition: `Sammensatt av «${leftWord}» og «${rightHit.headword}». «${leftWord}»: ${primarySense(leftHit.d)} «${rightHit.headword}»: ${primarySense(rightHit.entry.d)}`,
          synonyms: [leftWord, rightHit.headword]
        };
      }
    }
    return null;
  }

  async function lookupLocal(rawWord) {
    const word = sanitizeWord(rawWord);
    if (!word) {
      return { found: false, word: '' };
    }

    const baseHit = await findBaseEntry(word);
    if (baseHit) {
      return {
        found: true,
        tier: 1,
        type: baseHit.exact ? 'direct' : 'normalized',
        word,
        headword: baseHit.headword,
        isNynorsk: Boolean(baseHit.entry.n),
        definition: baseHit.entry.d,
        synonyms: Array.isArray(baseHit.entry.s) ? baseHit.entry.s : []
      };
    }

    const compoundHit = await splitCompoundWord(word);
    if (compoundHit) {
      return compoundHit;
    }

    return { found: false, word, headword: word };
  }

  function sendMessageAsync(payload) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        resolve({ ok: false });
        return;
      }
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false });
            return;
          }
          resolve(response || { ok: false });
        });
      } catch (_err) {
        resolve({ ok: false });
      }
    });
  }

  const api = {
    sanitizeWord,
    lookupLocal,
    splitCompoundWord,
    setCustomJsonLoader,
    requestNetworkStatus: () =>
      sendMessageAsync({ type: 'VOXLEX_CHECK_NETWORK' }),
    requestExtendedLookup: (word, lang) =>
      sendMessageAsync({ type: 'VOXLEX_LOOKUP_EXTENDED', word, lang }),
    requestEncyclopedia: (word) =>
      sendMessageAsync({ type: 'VOXLEX_FETCH_ENCYCLOPEDIA', word }),
    requestTranslation: (word, definition, lang) =>
      sendMessageAsync({ type: 'VOXLEX_TRANSLATE', word, definition, lang })
  };

  globalScope.VoxLexLookup = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
