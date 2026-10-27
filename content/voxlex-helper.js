/**
 * VoxLex Companion - Hovedfil for Klikkdeteksjon, Iframe-støtte og Oppslagsflyt
 * Lytter i capture-fasen (true) med 40 ms forsinkelse og caretRangeFromPoint-fallback
 * for e-bøker (Smartbok, Unibok, NDLA). Respekterer SEB- og domenesperrer.
 */

(function initVoxLexHelper(globalScope) {
  'use strict';

  const BLOCKED_HOST_PATTERNS = [
    /(^|\.)bankid\.no$/i,
    /(^|\.)vipps\.no$/i,
    /(^|\.)dnb\.no$/i,
    /(^|\.)sparebank1\.no$/i,
    /(^|\.)nordea\.no$/i,
    /(^|\.)handelsbanken\.no$/i,
    /(^|\.)sbanken\.no$/i,
    /(^|\.)idporten\.no$/i,
    /(^|\.)altinn\.no$/i,
    /(^|\.)nav\.no$/i,
    /(^|\.)helsenorge\.no$/i,
    /(^|\.)skatteetaten\.no$/i,
    /(^|\.)lanekassen\.no$/i,
    /(^|\.)feide\.no$/i,
    /(^|\.)dataporten\.no$/i,
    /(^|\.)privex\.no$/i,
    /(^|\.)inspera\.no$/i,
    /(^|\.)inspera\.com$/i,
    /(^|\.)wiseflow\.net$/i,
    /(^|\.)digiexam\.com$/i
  ];

  let isExtensionEnabled = true;
  let currentTargetLang = 'nb';
  let selectionTimer = null;
  let lastTriggeredWord = '';
  let lastTriggeredTime = 0;

  function isBlockedEnvironment() {
    if (typeof window === 'undefined' || !window.location) return false;
    const host = window.location.hostname || '';
    const pathname = window.location.pathname || '';
    const search = window.location.search || '';

    // 100 % taushet på SEB-elevlenker (jf. seb-zero-student-tracking)
    if (
      pathname.indexOf('/seb/start/') !== -1 ||
      pathname.indexOf('/seb/exam/') !== -1 ||
      pathname.indexOf('/seb/quit') !== -1 ||
      search.indexOf('seb=1') !== -1
    ) {
      return true;
    }

    return BLOCKED_HOST_PATTERNS.some((rx) => rx.test(host));
  }

  function isEditableElement(target) {
    if (!target || target.nodeType !== 1) return false;
    const tag = (target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return Boolean(target.isContentEditable);
  }

  function extractWordAtPoint(clientX, clientY) {
    if (typeof document === 'undefined') return null;
    let textNode = null;
    let offset = 0;

    if (typeof document.caretRangeFromPoint === 'function') {
      const range = document.caretRangeFromPoint(clientX, clientY);
      if (range && range.startContainer && range.startContainer.nodeType === 3) {
        textNode = range.startContainer;
        offset = range.startOffset;
      }
    } else if (typeof document.caretPositionFromPoint === 'function') {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (pos && pos.offsetNode && pos.offsetNode.nodeType === 3) {
        textNode = pos.offsetNode;
        offset = pos.offset;
      }
    }

    if (!textNode || !textNode.nodeValue) return null;
    const text = textNode.nodeValue;
    const letterRx = /[a-zA-ZæøåÆØÅéèêóòôäöüß\-]/;
    if (!letterRx.test(text.charAt(offset)) && offset > 0 && letterRx.test(text.charAt(offset - 1))) {
      offset -= 1;
    }
    if (!letterRx.test(text.charAt(offset))) return null;

    let start = offset;
    let end = offset;
    while (start > 0 && letterRx.test(text.charAt(start - 1))) start--;
    while (end < text.length && letterRx.test(text.charAt(end))) end++;

    const rawWord = text.slice(start, end);
    const word = globalScope.VoxLexLookup.sanitizeWord(rawWord);
    if (!word) return null;

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const rect = range.getBoundingClientRect();
    return { word, rect };
  }

  function getSelectionWordAndRect(event, allowCaretFallback) {
    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const rawText = sel.toString().trim();
      // Kun enkeltord (maks ett ord uten mellomrom)
      if (rawText && !/\s/.test(rawText)) {
        const word = globalScope.VoxLexLookup.sanitizeWord(rawText);
        if (word) {
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          return { word, rect };
        }
      }
    }
    if (allowCaretFallback && event && typeof event.clientX === 'number') {
      return extractWordAtPoint(event.clientX, event.clientY);
    }
    return null;
  }

  function saveLanguagePreference(nextLang) {
    currentTargetLang = nextLang || 'nb';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ targetLang: currentTargetLang });
    }
  }

  async function handleWordLookup(rawWord, anchorRect) {
    if (!isExtensionEnabled) return;
    const word = globalScope.VoxLexLookup.sanitizeWord(rawWord);
    if (!word) return;

    // 1. Tier-1: 0 ms lokalt oppslag i data/ordbok/
    const localHit = await globalScope.VoxLexLookup.lookupLocal(word);
    if (localHit && localHit.found) {
      const badge = localHit.type === 'compound' ? '[SAMMENSATT]' : '[ORDBOK]';
      globalScope.VoxLexUI.renderPopup(
        {
          word: localHit.word,
          headword: localHit.headword,
          parts: localHit.parts,
          badge,
          definition: localHit.definition,
          synonyms: localHit.synonyms,
          allowSnlExpand: true
        },
        anchorRect,
        currentTargetLang,
        saveLanguagePreference
      );
      return;
    }

    // 2. Ukjent ord lokalt -> Vis rask lastestatus og spør Tier-2 + SNL/Wikipedia parallelt
    globalScope.VoxLexUI.renderPopup(
      { word, headword: word, badge: '[OPPSLAG]', loading: true },
      anchorRect,
      currentTargetLang,
      saveLanguagePreference
    );

    const ext = await globalScope.VoxLexLookup.requestExtendedLookup(word, currentTargetLang);
    if (ext && ext.ok && ext.tier2 && ext.tier2.ok && ext.tier2.definition) {
      globalScope.VoxLexUI.renderPopup(
        {
          word,
          headword: word,
          badge: '[SKOLENETT]',
          definition: ext.tier2.definition,
          synonyms: ext.tier2.synonyms || [],
          allowSnlExpand: true
        },
        anchorRect,
        currentTargetLang,
        saveLanguagePreference
      );
      return;
    }

    if (ext && ext.ok && ext.encyclopedia && ext.encyclopedia.ok && ext.encyclopedia.summary) {
      globalScope.VoxLexUI.renderPopup(
        {
          word,
          headword: word,
          badge: `[${ext.encyclopedia.source.toUpperCase()}]`,
          definition: ext.encyclopedia.summary,
          synonyms: [],
          allowSnlExpand: false
        },
        anchorRect,
        currentTargetLang,
        saveLanguagePreference
      );
      return;
    }

    // 3. Verken i lokal ordbok eller SNL/Wikipedia, og utenfor skolenett -> Pedagogisk melding
    globalScope.VoxLexUI.renderPopup(
      {
        word,
        headword: word,
        badge: '[ORDBOK]',
        outsideSchoolNetwork: true,
        synonyms: []
      },
      anchorRect,
      currentTargetLang,
      saveLanguagePreference
    );
  }

  function onPointerSelection(event, isDoubleClick) {
    if (!isExtensionEnabled) return;
    if (globalScope.VoxLexUI && globalScope.VoxLexUI.isPopupNode(event.target)) return;
    if (isEditableElement(event.target)) return;

    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const hit = getSelectionWordAndRect(event, isDoubleClick);
      if (!hit || !hit.word) {
        if (!isDoubleClick && globalScope.VoxLexUI) {
          globalScope.VoxLexUI.removePopup();
        }
        return;
      }
      const now = Date.now();
      if (hit.word === lastTriggeredWord && now - lastTriggeredTime < 300) {
        return;
      }
      lastTriggeredWord = hit.word;
      lastTriggeredTime = now;
      handleWordLookup(hit.word, hit.rect);
    }, 40);
  }

  function init() {
    if (isBlockedEnvironment()) return;

    if (globalScope.VoxLexUI) {
      globalScope.VoxLexUI.setOnWordSelect((synonymWord, rect) => {
        handleWordLookup(synonymWord, rect);
      });
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ enabled: true, targetLang: 'nb' }, (prefs) => {
        isExtensionEnabled = prefs.enabled !== false;
        currentTargetLang = prefs.targetLang || 'nb';
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.enabled) {
          isExtensionEnabled = changes.enabled.newValue !== false;
          if (!isExtensionEnabled && globalScope.VoxLexUI) {
            globalScope.VoxLexUI.removePopup();
          }
        }
        if (changes.targetLang) {
          currentTargetLang = changes.targetLang.newValue || 'nb';
        }
      });
    }

    document.addEventListener('dblclick', (e) => onPointerSelection(e, true), true);
    document.addEventListener('mouseup', (e) => onPointerSelection(e, false), true);
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && globalScope.VoxLexUI) {
          globalScope.VoxLexUI.removePopup();
        }
      },
      true
    );
  }

  if (typeof document !== 'undefined') {
    init();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
