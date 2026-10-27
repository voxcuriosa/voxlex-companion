/**
 * VoxLex Companion - Høykontrast Flytende Popup UI (content/voxlex-ui.js)
 * Bygger .voxlex-synonym-popup med trygge DOM-metoder (createElement / textContent),
 * norsk taleopplesing (nb-NO), morsmålsvelger, klikkbare synonympiller og
 * SEB-/offline-bevisste fordypningslenker (Ordbøkene, SNL, Wikipedia).
 */

(function initVoxLexUI(globalScope) {
  'use strict';

  const SCHOOL_NETWORK_NOTICE =
    'Dette ordet finnes ikke i den lokale ordboka. Utvidet søk er kun tilgjengelig når du er koblet til skolens nettverk.';

  const LANGUAGES = [
    { code: 'nb', label: 'Norsk' },
    { code: 'en', label: 'Engelsk' },
    { code: 'uk', label: 'Ukrainsk' },
    { code: 'ar', label: 'Arabisk', rtl: true },
    { code: 'so', label: 'Somali' },
    { code: 'pl', label: 'Polsk' },
    { code: 'ti', label: 'Tigrinja' },
    { code: 'es', label: 'Spansk' },
    { code: 'ku', label: 'Kurdisk', rtl: true },
    { code: 'fa', label: 'Persisk', rtl: true },
    { code: 'vi', label: 'Vietnamesisk' }
  ];

  let activePopup = null;
  let currentAnchorRect = null;
  let onWordSelectCallback = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function removePopup() {
    stopSpeech();
    if (activePopup && activePopup.parentNode) {
      activePopup.parentNode.removeChild(activePopup);
    }
    activePopup = null;
  }

  function isOnlineAndAllowedExternalLinks() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    if (/SEB|SafeExamBrowser|CrOS Kiosk/i.test(ua)) return false;
    return true;
  }

  function speakText(word, definition, btnNode) {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) {
      stopSpeech();
      btnNode.textContent = 'LYD';
      btnNode.setAttribute('aria-pressed', 'false');
      return;
    }
    const textToRead = definition ? `${word}. ${definition}` : word;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'nb-NO';
    utterance.rate = 0.96;

    const voices = window.speechSynthesis.getVoices();
    const norwegianVoice = voices.find((v) => /^nb|^no|^nn/i.test(v.lang));
    if (norwegianVoice) utterance.voice = norwegianVoice;

    btnNode.textContent = 'STOPP';
    btnNode.setAttribute('aria-pressed', 'true');

    const resetBtn = () => {
      if (btnNode) {
        btnNode.textContent = 'LYD';
        btnNode.setAttribute('aria-pressed', 'false');
      }
    };
    utterance.onend = resetBtn;
    utterance.onerror = resetBtn;
    window.speechSynthesis.speak(utterance);
  }

  function positionPopup(popup, anchorRect) {
    const pad = 12;
    const vw = window.innerWidth || document.documentElement.clientWidth || 800;
    const vh = window.innerHeight || document.documentElement.clientHeight || 600;
    const rect = anchorRect || { left: vw / 2 - 170, bottom: vh / 3, top: vh / 3 - 20, width: 60 };

    const popupRect = popup.getBoundingClientRect();
    const pw = popupRect.width || 350;
    const ph = popupRect.height || 210;

    let left = rect.left + rect.width / 2 - pw / 2;
    left = Math.max(pad, Math.min(left, vw - pw - pad));

    let top = rect.bottom + 10;
    if (top + ph + pad > vh && rect.top - ph - 10 >= pad) {
      top = rect.top - ph - 10;
    } else if (top + ph + pad > vh) {
      top = Math.max(pad, vh - ph - pad);
    }

    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
  }

  function renderTranslationInto(container, word, definition, langCode) {
    container.replaceChildren();
    if (!langCode || langCode === 'nb') {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    const langMeta = LANGUAGES.find((l) => l.code === langCode);
    container.setAttribute('lang', langCode);
    container.setAttribute('dir', langMeta && langMeta.rtl ? 'rtl' : 'ltr');

    const status = el('div', 'voxlex-trans-loading', 'Henter oversettelse...');
    container.appendChild(status);

    globalScope.VoxLexLookup.requestTranslation(word, definition, langCode).then((res) => {
      container.replaceChildren();
      if (!res || !res.ok || !res.translation || !res.translation.translatedWord) {
        container.setAttribute('dir', 'ltr');
        const msg =
          res && res.translation && res.translation.outsideSchoolNetwork
            ? 'Morsmålsoversettelse er kun tilgjengelig når du er koblet til skolens nettverk.'
            : 'Oversettelse er ikke tilgjengelig akkurat nå.';
        container.appendChild(el('div', 'voxlex-trans-text', msg));
        return;
      }
      const head = el('div', 'voxlex-trans-word', res.translation.translatedWord);
      container.appendChild(head);
      if (res.translation.translatedDef) {
        container.appendChild(el('div', 'voxlex-trans-text', res.translation.translatedDef));
      }
      if (activePopup && currentAnchorRect) positionPopup(activePopup, currentAnchorRect);
    });
  }

  function renderPopup(state, anchorRect, currentLang, onLangChange) {
    removePopup();
    currentAnchorRect = anchorRect;

    const popup = el('aside', 'voxlex-synonym-popup');
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', `Ordforklaring for ${state.word}`);

    // Header
    const header = el('header', 'voxlex-header');
    const titleGroup = el('div', 'voxlex-title-group');
    const badgeLabel = state.badge || '[ORDBOK]';
    titleGroup.appendChild(el('span', 'voxlex-badge', badgeLabel));
    titleGroup.appendChild(el('strong', 'voxlex-word', state.headword || state.word));
    header.appendChild(titleGroup);

    const controls = el('div', 'voxlex-controls');
    const audioBtn = el('button', 'voxlex-btn voxlex-audio-btn', 'LYD');
    audioBtn.type = 'button';
    audioBtn.setAttribute('aria-pressed', 'false');
    audioBtn.setAttribute('aria-label', 'Les opp ordforklaring');
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(state.headword || state.word, state.definition || '', audioBtn);
    });
    controls.appendChild(audioBtn);

    const langSelect = el('select', 'voxlex-lang-select');
    langSelect.setAttribute('aria-label', 'Velg oversettelsesspråk');
    for (const lang of LANGUAGES) {
      const opt = el('option', '', lang.label);
      opt.value = lang.code;
      if (lang.code === currentLang) opt.selected = true;
      langSelect.appendChild(opt);
    }
    controls.appendChild(langSelect);

    const closeBtn = el('button', 'voxlex-btn voxlex-close-btn', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Lukk ordforklaring');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePopup();
    });
    controls.appendChild(closeBtn);
    header.appendChild(controls);
    popup.appendChild(header);

    // Body
    const body = el('div', 'voxlex-body');
    if (Array.isArray(state.synonyms) && state.synonyms.length > 0) {
      const pillRow = el('div', 'voxlex-pills');
      for (const syn of state.synonyms) {
        const pill = el('button', 'voxlex-pill', syn);
        pill.type = 'button';
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onWordSelectCallback) onWordSelectCallback(syn, currentAnchorRect);
        });
        pillRow.appendChild(pill);
      }
      body.appendChild(pillRow);
    }

    if (state.loading) {
      body.appendChild(el('p', 'voxlex-definition voxlex-muted', 'Slår opp ordet...'));
    } else if (state.outsideSchoolNetwork) {
      body.appendChild(el('p', 'voxlex-school-notice', SCHOOL_NETWORK_NOTICE));
    } else if (state.definition) {
      body.appendChild(el('p', 'voxlex-definition', state.definition));
    }

    const transContainer = el('div', 'voxlex-translation-box');
    transContainer.hidden = true;
    body.appendChild(transContainer);

    if (!state.loading && !state.outsideSchoolNetwork && currentLang && currentLang !== 'nb') {
      renderTranslationInto(transContainer, state.word, state.definition || '', currentLang);
    }

    langSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      const nextLang = langSelect.value;
      if (onLangChange) onLangChange(nextLang);
      renderTranslationInto(transContainer, state.word, state.definition || '', nextLang);
    });

    const lookupTarget = (state.parts && state.parts[0]) || state.headword || state.word;
    const cleanLinkWord = String(lookupTarget).split('+')[0].trim();

    if (isOnlineAndAllowedExternalLinks() && state.allowSnlExpand && !state.encyclopediaText) {
      const snlBox = el('div', 'voxlex-snl-wrap');
      const snlBtn = el('button', 'voxlex-snl-btn', 'Vis SNL-utdrag');
      snlBtn.type = 'button';
      snlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        snlBtn.textContent = 'Henter fra SNL...';
        snlBtn.disabled = true;
        globalScope.VoxLexLookup.requestEncyclopedia(cleanLinkWord).then((res) => {
          snlBox.replaceChildren();
          if (res && res.ok && res.encyclopedia && res.encyclopedia.summary) {
            snlBox.appendChild(el('div', 'voxlex-snl-source', `Kilde: ${res.encyclopedia.source}`));
            snlBox.appendChild(el('p', 'voxlex-snl-text', res.encyclopedia.summary));
          } else {
            snlBox.appendChild(el('p', 'voxlex-snl-text', 'Ingen kortingress funnet i SNL for dette ordet.'));
          }
          positionPopup(popup, currentAnchorRect);
        });
      });
      snlBox.appendChild(snlBtn);
      body.appendChild(snlBox);
    }

    popup.appendChild(body);
    const footer = el('footer', 'voxlex-footer');
    footer.appendChild(el('span', 'voxlex-brand', 'VoxLex Lesehjelp'));
    if (isOnlineAndAllowedExternalLinks()) {
      const links = el('nav', 'voxlex-links');
      links.setAttribute('aria-label', 'Oppslagskilder');
      const encoded = encodeURIComponent(cleanLinkWord);
      const sources = [
        { label: '[Ordbøkene]', href: `https://ordbokene.no/bm,nn/search?q=${encoded}` },
        { label: '[SNL]', href: `https://snl.no/${encoded}` },
        { label: '[Wikipedia]', href: `https://no.wikipedia.org/wiki/${encoded}` },
        { label: '[GitHub]', href: 'https://github.com/voxcuriosa/voxlex-companion' }
      ];
      for (const src of sources) {
        const a = el('a', 'voxlex-source-link', src.label);
        a.href = src.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        links.appendChild(a);
      }
      footer.appendChild(links);
    }
    popup.appendChild(footer);
    document.body.appendChild(popup);
    activePopup = popup;
    positionPopup(popup, anchorRect);
  }

  globalScope.VoxLexUI = {
    SCHOOL_NETWORK_NOTICE,
    renderPopup,
    removePopup,
    isPopupNode: (node) => Boolean(activePopup && node && activePopup.contains(node)),
    setOnWordSelect: (fn) => { onWordSelectCallback = fn; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
