/**
 * VoxLex Companion - Tier-2 Backend (Cloud Function / Node.js HTTP Proxy)
 * Strengt IP-låst til Telemark fylkeskommunes skolenett (RIPE NO-TELEFYKOMM: 139.164.0.0/16,
 * inkludert 139.164.154.162) + valgfrie ekstra subnett i ALLOWED_CIDRS.
 * Ingen IP-logging, ingen cookies, kun ett enkelt vasket oppslagsord mot Gemini 3.5 Flash-Lite.
 */

'use strict';

const http = require('http');

const DEFAULT_TELEMARK_CIDRS = ['139.164.0.0/16'];
const SCHOOL_NETWORK_MESSAGE =
  'Dette ordet finnes ikke i den lokale ordboka. Utvidet søk er kun tilgjengelig når du er koblet til skolens nettverk.';
const WORD_REGEX = /^[a-zæøåéèêëóòôöäàâüùûß\-]{2,35}$/i;
const ALLOWED_LANGS = new Set(['nb', 'nn', 'en', 'uk', 'ar', 'so', 'pl', 'ti', 'es', 'ku', 'fa', 'vi']);

function ipToUint32(ip) {
  if (typeof ip !== 'string') return null;
  const cleaned = ip.trim().replace(/^::ffff:/i, '');
  const parts = cleaned.split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const num = Number(part);
    if (num < 0 || num > 255) return null;
    result = ((result << 8) | num) >>> 0;
  }
  return result;
}

function isIpInCidr(ip, cidr) {
  const ipNum = ipToUint32(ip);
  if (ipNum === null) return false;
  const [range, bitsStr] = String(cidr).trim().split('/');
  const rangeNum = ipToUint32(range);
  if (rangeNum === null) return false;
  const bits = bitsStr !== undefined ? Number(bitsStr) : 32;
  if (Number.isNaN(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

function getAllowedCidrs() {
  const extra = (process.env.ALLOWED_CIDRS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_TELEMARK_CIDRS, ...extra];
}

function isAllowedTelemarkIp(clientIp, customCidrs) {
  if (!clientIp) return false;
  const cidrs = Array.isArray(customCidrs) ? customCidrs : getAllowedCidrs();
  return cidrs.some((cidr) => isIpInCidr(clientIp, cidr));
}

function extractClientIp(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    // Bruk første klient-IP fra lastbalanserer (aldri logg IP til disk eller konsoll)
    return xff.split(',')[0].trim();
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return '';
}

function sanitizeWord(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned.includes(' ') || !WORD_REGEX.test(cleaned)) {
    return '';
  }
  return cleaned;
}

function sanitizeLang(raw) {
  const code = String(raw || 'nb').trim().toLowerCase();
  return ALLOWED_LANGS.has(code) ? code : 'nb';
}

async function getVertexAccessToken() {
  const metaUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
  const res = await fetch(metaUrl, { headers: { 'Metadata-Flavor': 'Google' } });
  if (!res.ok) throw new Error('METADATA_TOKEN_FAILED');
  const data = await res.json();
  return data.access_token;
}

async function queryGeminiFlashLite(word, lang) {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'voxcuriosa';
  const location = process.env.VERTEX_LOCATION || 'europe-west1';
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const apiKey = process.env.GEMINI_API_KEY;

  const langInstruction =
    lang && lang !== 'nb' && lang !== 'nn'
      ? `Legg også ved feltet "translation" (oversatt oppslagsord på språkkode "${lang}") og "translatedDef" (kort forklaring på 1 setning på språkkode "${lang}").`
      : 'Sett feltene "translation" og "translatedDef" til tom streng "".';

  const systemPrompt = [
    'Du er VoxLex, en pedagogisk og nøktern norsk ordbok for elever i videregående skole.',
    'Svar KUN med gyldig JSON med nøklene: {"definition": "...", "synonyms": ["...", "..."], "translation": "...", "translatedDef": "..."}.',
    'Forklaringen ("definition") skal være 1-2 korte, lettleste setninger på norsk bokmål uten emojier.',
    'Oppgi aldri årstall, datoer, kjemiske likninger eller regneformler.',
    'Gi 2-4 gode synonymer i "synonyms".',
    langInstruction
  ].join(' ');

  const requestBody = JSON.stringify({
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: `Forklar oppslagsordet: ${word}` }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 250,
      responseMimeType: 'application/json'
    }
  });

  let response;
  if (apiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    });
  } else {
    const token = await getVertexAccessToken();
    const vertexEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
    response = await fetch(vertexEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: requestBody
    });
  }

  if (!response.ok) {
    throw new Error(`VERTEX_HTTP_${response.status}`);
  }

  const payload = await response.json();
  const text =
    payload &&
    payload.candidates &&
    payload.candidates[0] &&
    payload.candidates[0] &&
    payload.candidates[0].content &&
    payload.candidates[0].content.parts &&
    payload.candidates[0].content.parts[0] &&
    payload.candidates[0].content.parts[0].text;

  if (!text) {
    throw new Error('EMPTY_GEMINI_RESPONSE');
  }

  const parsed = JSON.parse(text);
  return {
    word,
    definition: String(parsed.definition || '').trim(),
    synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 4).map((s) => String(s).trim()) : [],
    translation: String(parsed.translation || '').trim(),
    translatedDef: String(parsed.translatedDef || '').trim()
  };
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

async function voxlexLookup(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  // 1. Sjekk Telemark fylkeskommune IP-lås i RAM (aldri logg IP)
  const clientIp = extractClientIp(req);
  if (!isAllowedTelemarkIp(clientIp)) {
    return sendJson(res, 403, {
      error: 'OUTSIDE_SCHOOL_NETWORK',
      message: SCHOOL_NETWORK_MESSAGE
    });
  }

  // 2. Valider at forespørselen kun inneholder ett enkelt vasket ord
  const body = req.body || {};
  const word = sanitizeWord(body.word);
  const lang = sanitizeLang(body.lang);
  if (!word) {
    return sendJson(res, 400, { error: 'INVALID_SINGLE_WORD' });
  }

  try {
    const result = await queryGeminiFlashLite(word, lang);
    return sendJson(res, 200, result);
  } catch (_err) {
    return sendJson(res, 502, { error: 'UPSTREAM_UNAVAILABLE' });
  }
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      if (raw.length < 2048) raw += chunk;
    });
    req.on('end', () => {
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch (_e) {
        req.body = {};
      }
      voxlexLookup(req, res);
    });
  });
  server.listen(port, () => {
    console.log(`[OK] VoxLex Tier-2 Backend lytter pa port ${port} (Telemark CIDR: ${getAllowedCidrs().join(', ')})`);
  });
}

module.exports = {
  voxlexLookup,
  isAllowedTelemarkIp,
  isIpInCidr,
  sanitizeWord,
  SCHOOL_NETWORK_MESSAGE,
  DEFAULT_TELEMARK_CIDRS
};
