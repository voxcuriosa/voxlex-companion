/**
 * VoxLex Companion - Hovedfil for Klikkdeteksjon, Iframe/Blob-EPUB-støtte og Oppslagsflyt
 * Lytter i capture-fasen (true) med støtte for blob:/XHTML-iframer i e-bøker
 * (Unibok, Smartbok, Brettboka, NDLA). Respekterer SEB- og domenesperrer.
 */

(function initVoxLexHelper(globalScope) {
  'use strict';

  const BLOCKED_HOST_PATTERNS = [
    /(^|\.)bankid\.no$/i, /(^|\.)vipps\.no$/i, /(^|\.)dnb\.no$/i, /(^|\.)sparebank1\.no$/i,
    /(^|\.)nordea\.no$/i, /(^|\.)handelsbanken\.no$/i, /(^|\.)sbanken\.no$/i, /(^|\.)idporten\.no$/i,
    /(^|\.)altinn\.no$/i, /(^|\.)nav\.no$/i, /(^|\.)helsenorge\.no$/i, /(^|\.)skatteetaten\.no$/i,
    /(^|\.)lanekassen\.no$/i, /(^|\.)feide\.no$/i, /(^|\.)dataporten\.no$/i, /(^|\.)privex\.no$/i,
    /(^|\.)inspera\.no$/i, /(^|\.)inspera\.com$/i, /(^|\.)wiseflow\.net$/i, /(^|\.)digiexam\.com$/i
  ];

  let isExtensionEnabled = true;
  let currentTargetLang = 'nb';
  let selectionTimer = null;
  let lastTriggeredWord = '';
  let lastTriggeredTime = 0;
  const boundDocs = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

  function isBlockedEnvironment() {
    if (typeof window === 'undefined' || !window.location) return false;
    const host = window.location.hostname || '';
    const pathname = window.location.pathname || '';
    const search = window.location.search || '';

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

  function translateRectToMainWindow(rect, sourceWin) {
    if (!rect) return null;
    let left = rect.left;
    let top = rect.top;
    let width = rect.width;
    let height = rect.height;
    let win = sourceWin;
    while (win && win !== window) {
      let frameEl = null;
      try {
        frameEl = win.frameElement;
      } catch (_e) {
        break;
      }
      if (!frameEl) break;
      const fRect = frameEl.getBoundingClientRect();
      const scaleX = frameEl.offsetWidth ? fRect.width / frameEl.offsetWidth : 1;
      const scaleY = frameEl.offsetHeight ? fRect.height / frameEl.offsetHeight : 1;
      left = fRect.left + left * scaleX;
      top = fRect.top + top * scaleY;
      width *= scaleX;
      height *= scaleY;
      win = win.parent;
    }
    return { left, top, right: left + width, bottom: top + height, width, height };
  }

  function extractWordAtPoint(clientX, clientY, targetDoc) {
    const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return null;
    let textNode = null;
    let offset = 0;

    if (typeof doc.caretRangeFromPoint === 'function') {
      const range = doc.caretRangeFromPoint(clientX, clientY);
      if (range && range.startContainer && range.startContainer.nodeType === 3) {
        textNode = range.startContainer;
        offset = range.startOffset;
      }
    } else if (typeof doc.caretPositionFromPoint === 'function') {
      const pos = doc.caretPositionFromPoint(clientX, clientY);
      if (pos && pos.offsetNode && pos.offsetNode.nodeType === 3) {
        textNode = pos.offsetNode;
        offset = pos.offset;
      }
    }

    if (!textNode || !textNode.nodeValue) return null;
    const text = textNode.nodeValue;
    const letterRx = /[a-zA-ZæøåÆØÅéèêëóòôöäàâüùûß\-]/;
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

    const range = doc.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const win = doc.defaultView || window;
    const rect = translateRectToMainWindow(range.getBoundingClientRect(), win);
    return { word, rect };
  }

  function getSelectionWordAndRect(clientX, clientY, targetDoc, allowCaretFallback) {
    const doc = targetDoc || document;
    const win = (doc && doc.defaultView) || window;
    const sel = win && win.getSelection ? win.getSelection() : null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const rawText = sel.toString().trim();
      if (rawText && !/\s/.test(rawText)) {
        const word = globalScope.VoxLexLookup.sanitizeWord(rawText);
        if (word) {
          const rect = translateRectToMainWindow(sel.getRangeAt(0).getBoundingClientRect(), win);
          return { word, rect };
        }
      }
    }
    if (allowCaretFallback && typeof clientX === 'number') {
      return extractWordAtPoint(clientX, clientY, doc);
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

    const localHit = await globalScope.VoxLexLookup.lookupLocal(word);
    if (localHit && localHit.found) {
      const isCompound = localHit.type === 'compound';
      const badge = isCompound ? '[SAMMENSATT]' : (localHit.isNynorsk ? '[NYNORSK]' : '[ORDBOK]');
      globalScope.VoxLexUI.renderPopup(
        { word: localHit.word, headword: localHit.headword, parts: localHit.parts, badge, definition: localHit.definition, synonyms: localHit.synonyms, allowSnlExpand: true },
        anchorRect, currentTargetLang, saveLanguagePreference
      );
      return;
    }

    globalScope.VoxLexUI.renderPopup(
      { word, headword: word, badge: '[OPPSLAG]', loading: true },
      anchorRect, currentTargetLang, saveLanguagePreference
    );

    const ext = await globalScope.VoxLexLookup.requestExtendedLookup(word, currentTargetLang);
    if (ext && ext.ok && ext.tier2 && ext.tier2.ok && ext.tier2.definition) {
      globalScope.VoxLexUI.renderPopup(
        { word, headword: word, badge: '[SKOLENETT]', definition: ext.tier2.definition, synonyms: ext.tier2.synonyms || [], allowSnlExpand: true },
        anchorRect, currentTargetLang, saveLanguagePreference
      );
      return;
    }

    if (ext && ext.ok && ext.encyclopedia && ext.encyclopedia.ok && ext.encyclopedia.summary) {
      globalScope.VoxLexUI.renderPopup(
        { word, headword: word, badge: `[${ext.encyclopedia.source.toUpperCase()}]`, definition: ext.encyclopedia.summary, synonyms: [], allowSnlExpand: false },
        anchorRect, currentTargetLang, saveLanguagePreference
      );
      return;
    }

    globalScope.VoxLexUI.renderPopup(
      { word, headword: word, badge: '[ORDBOK]', outsideSchoolNetwork: true, synonyms: [] },
      anchorRect, currentTargetLang, saveLanguagePreference
    );
  }

  function onPointerSelection(event, isDoubleClick) {
    if (!isExtensionEnabled) return;
    const target = event.target;
    if (globalScope.VoxLexUI && globalScope.VoxLexUI.isPopupNode(target)) return;
    if (isEditableElement(target)) return;

    const targetDoc = (target && target.ownerDocument) || document;
    const clientX = event.clientX;
    const clientY = event.clientY;
    const immediateHit = getSelectionWordAndRect(clientX, clientY, targetDoc, false);

    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const hit = getSelectionWordAndRect(clientX, clientY, targetDoc, isDoubleClick) || (isDoubleClick ? immediateHit : null);
      if (!hit || !hit.word) {
        if (!isDoubleClick && globalScope.VoxLexUI) {
          globalScope.VoxLexUI.removePopup();
        }
        return;
      }
      const now = Date.now();
      if (hit.word === lastTriggeredWord && now - lastTriggeredTime < 300) return;
      lastTriggeredWord = hit.word;
      lastTriggeredTime = now;
      handleWordLookup(hit.word, hit.rect);
    }, 40);
  }

  function bindDocument(doc) {
    if (!doc || (boundDocs && boundDocs.has(doc))) return;
    if (boundDocs) boundDocs.add(doc);

    doc.addEventListener('dblclick', (e) => onPointerSelection(e, true), true);
    doc.addEventListener('mouseup', (e) => onPointerSelection(e, false), true);
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && globalScope.VoxLexUI) globalScope.VoxLexUI.removePopup();
    }, true);

    if (typeof doc.querySelectorAll === 'function') {
      const frames = doc.querySelectorAll('iframe, frame');
      for (let i = 0; i < frames.length; i++) {
        try {
          if (frames[i].contentDocument) bindDocument(frames[i].contentDocument);
        } catch (_e) {}
      }
    }
  }

  function init() {
    if (isBlockedEnvironment()) return;

    // Dersom dette er en same-origin/blob barneramme og toppvinduet allerede kjører VoxLex, la toppvinduet styre
    try {
      if (typeof window !== 'undefined' && window.top && window.top !== window && window.top.__voxlexBindDoc) {
        window.top.__voxlexBindDoc(document);
        return;
      }
    } catch (_e) {}

    if (typeof window !== 'undefined') {
      window.__voxlexBindDoc = bindDocument;
    }

    if (globalScope.VoxLexUI) {
      globalScope.VoxLexUI.setOnWordSelect((synonymWord, rect) => handleWordLookup(synonymWord, rect));
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
          if (!isExtensionEnabled && globalScope.VoxLexUI) globalScope.VoxLexUI.removePopup();
        }
        if (changes.targetLang) currentTargetLang = changes.targetLang.newValue || 'nb';
      });
    }

    bindDocument(document);

    // Fang dynamisk lastede blob:/about:blank-iframer i e-boklesere (Unibok, Smartbok, Brettboka)
    document.addEventListener('load', (e) => {
      try {
        if (e.target && e.target.contentDocument) bindDocument(e.target.contentDocument);
      } catch (_err) {}
    }, true);
    document.addEventListener('mouseover', (e) => {
      try {
        if (e.target && e.target.contentDocument) bindDocument(e.target.contentDocument);
      } catch (_err) {}
    }, true);
  }

  if (typeof document !== 'undefined') {
    init();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
