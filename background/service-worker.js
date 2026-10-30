/**
 * VoxLex Companion - Manifest V3 Background Service Worker
 * Håndterer PÅ/AV-bryter på verktøylinjeikonet og fungerer som 100 % anonym,
 * cookiefri nettverksproxy (credentials: 'omit', referrerPolicy: 'no-referrer')
 * for Tier-2 (Google Cloud Vertex AI i europe-west1, IP-låst til Telemark skolenett)
 * samt SNL/Wikipedia åpne API-er.
 */

const BACKEND_URL = 'https://voxlex-lookup-180422997316.europe-west1.run.app';
const WORD_REGEX = /^[a-zæøåéèêëóòôöäàâüùûß](?:[a-zæøåéèêëóòôöäàâüùûß\-]{0,33}[a-zæøåéèêëóòôöäàâüùûß])$/i;
const ALLOWED_LANGS = new Set(['nb', 'nn', 'en', 'uk', 'ar', 'so', 'pl', 'ti', 'es', 'ku', 'fa', 'vi']);

function sanitizeWord(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^[^a-zæøåéèêëóòôöäàâüùûß]+|[^a-zæøåéèêëóòôöäàâüùûß]+$/gi, '');
  if (!cleaned || cleaned.includes(' ') || cleaned.includes('--') || !WORD_REGEX.test(cleaned)) {
    return '';
  }
  return cleaned;
}

function sanitizeLang(lang) {
  const code = String(lang || 'nb').trim().toLowerCase();
  return ALLOWED_LANGS.has(code) ? code : 'nb';
}

function stripText(htmlOrText) {
  if (!htmlOrText) return '';
  return String(htmlOrText)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTwoSentences(text) {
  const clean = stripText(text);
  if (!clean) return '';
  const parts = clean.match(/[^.!?]+[.!?]+/g);
  if (!parts) return clean.slice(0, 240);
  return parts.slice(0, 2).join(' ').trim();
}

async function anonymousFetchJson(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      signal: controller.signal
    });
    return { status: response.status, ok: response.ok, data: response.ok ? await response.json() : null };
  } catch (_err) {
    return { status: 0, ok: false, data: null };
  } finally {
    clearTimeout(timer);
  }
}

let cachedOutsideSchoolNet = null;
let cachedNetCheckedAt = 0;

async function checkSchoolNetworkStatus() {
  const now = Date.now();
  if (cachedOutsideSchoolNet !== null && now - cachedNetCheckedAt < 300000) {
    return cachedOutsideSchoolNet;
  }
  const res = await anonymousFetchJson(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }, 2500);
  cachedOutsideSchoolNet = res.status === 403 || res.status === 0;
  cachedNetCheckedAt = now;
  return cachedOutsideSchoolNet;
}

async function fetchTier2Backend(word, lang) {
  const payload = lang && lang !== 'nb' ? { word, lang } : { word };
  const res = await anonymousFetchJson(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, 6000);

  if (res.status === 403) {
    cachedOutsideSchoolNet = true;
    cachedNetCheckedAt = Date.now();
    return { ok: false, outsideSchoolNetwork: true };
  }
  if (res.ok && res.data && res.data.definition) {
    cachedOutsideSchoolNet = false;
    cachedNetCheckedAt = Date.now();
    return {
      ok: true,
      outsideSchoolNetwork: false,
      definition: stripText(res.data.definition),
      synonyms: Array.isArray(res.data.synonyms) ? res.data.synonyms.slice(0, 4).map(stripText) : [],
      translation: res.data.translation ? stripText(res.data.translation) : '',
      translatedDef: res.data.translatedDef ? stripText(res.data.translatedDef) : ''
    };
  }
  return { ok: false, outsideSchoolNetwork: true };
}

async function fetchEncyclopediaSummary(word) {
  const encoded = encodeURIComponent(word);

  // 1. Direkte oppslag mot Store norske leksikon (SNL) åpent artikkel-API
  const snlDirect = await anonymousFetchJson(`https://snl.no/api/v1/articles/${encoded}.json`);
  if (snlDirect.ok && snlDirect.data) {
    const rawBody = snlDirect.data.first_sentences || snlDirect.data.xhtml_body || '';
    const summary = extractTwoSentences(rawBody);
    if (summary) {
      return {
        ok: true,
        source: 'SNL',
        summary,
        url: snlDirect.data.permalink || `https://snl.no/${encoded}`
      };
    }
  }

  // 2. Fallback til norsk Wikipedia REST Summary API
  const wikiRes = await anonymousFetchJson(`https://no.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
  if (wikiRes.ok && wikiRes.data && wikiRes.data.extract) {
    const summary = extractTwoSentences(wikiRes.data.extract);
    if (summary) {
      return {
        ok: true,
        source: 'Wikipedia',
        summary,
        url: `https://no.wikipedia.org/wiki/${encoded}`
      };
    }
  }

  return { ok: false, source: '', summary: '', url: '' };
}

async function fetchTranslation(word, _definition, targetLang) {
  const lang = sanitizeLang(targetLang);
  if (lang === 'nb' || lang === 'nn') {
    return { ok: false, translatedWord: '', translatedDef: '' };
  }

  // Morsmålsoversettelse kjøres utelukkende via Vertex AI (europe-west1) på skolenettet
  const tier2 = await fetchTier2Backend(word, lang);
  if (tier2.ok && tier2.translation) {
    return {
      ok: true,
      outsideSchoolNetwork: false,
      translatedWord: tier2.translation,
      translatedDef: tier2.translatedDef || '',
      source: 'Vertex AI Skolenett'
    };
  }

  return {
    ok: false,
    outsideSchoolNetwork: Boolean(tier2.outsideSchoolNetwork),
    translatedWord: '',
    translatedDef: ''
  };
}

async function updateActionBadge(enabled) {
  const isEnabled = enabled !== false;
  await chrome.action.setBadgeText({ text: isEnabled ? '' : 'AV' });
  await chrome.action.setBadgeBackgroundColor({ color: isEnabled ? '#1e293b' : '#475569' });
  await chrome.action.setTitle({
    title: isEnabled ? 'VoxLex Companion er PÅ (Klikk for å slå AV)' : 'VoxLex Companion er AV (Klikk for å slå PÅ)'
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get({ enabled: true, targetLang: 'nb' });
  await chrome.storage.local.set({
    enabled: current.enabled !== false,
    targetLang: sanitizeLang(current.targetLang)
  });
  await updateActionBadge(current.enabled !== false);
});

chrome.action.onClicked.addListener(async () => {
  const { enabled = true } = await chrome.storage.local.get({ enabled: true });
  const nextState = !enabled;
  await chrome.storage.local.set({ enabled: nextState });
  await updateActionBadge(nextState);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (!message || typeof message.type !== 'string') {
      sendResponse({ ok: false });
      return;
    }

    if (message.type === 'VOXLEX_CHECK_NETWORK') {
      const outsideSchoolNetwork = await checkSchoolNetworkStatus();
      sendResponse({ ok: true, outsideSchoolNetwork });
      return;
    }

    const word = sanitizeWord(message.word);
    if (!word) {
      sendResponse({ ok: false, error: 'INVALID_WORD' });
      return;
    }

    if (message.type === 'VOXLEX_LOOKUP_EXTENDED') {
      const lang = sanitizeLang(message.lang);
      const [tier2, encyclopedia] = await Promise.all([
        fetchTier2Backend(word, lang),
        fetchEncyclopediaSummary(word)
      ]);
      sendResponse({ ok: true, word, tier2, encyclopedia });
      return;
    }

    if (message.type === 'VOXLEX_FETCH_ENCYCLOPEDIA') {
      const encyclopedia = await fetchEncyclopediaSummary(word);
      sendResponse({ ok: encyclopedia.ok, word, encyclopedia });
      return;
    }

    if (message.type === 'VOXLEX_TRANSLATE') {
      const lang = sanitizeLang(message.lang);
      const def = typeof message.definition === 'string' ? stripText(message.definition).slice(0, 220) : '';
      const translation = await fetchTranslation(word, def, lang);
      sendResponse({ ok: translation.ok, word, lang, translation });
      return;
    }

    sendResponse({ ok: false });
  })();
  return true;
});
