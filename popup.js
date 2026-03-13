/**
 * popup.js – Cleanup Scripts Chrome Extension
 *
 * Responsibilities:
 *  - Read a JS file chosen by the user and save it alongside its URI pattern
 *    and an optional human-readable name to chrome.storage.local.
 *  - Render the list of saved scripts; highlight those whose URI pattern
 *    matches the currently-active tab's URL.
 *  - Execute matching scripts (or a single specific script) on the active tab
 *    via a message to the background service worker.
 */

'use strict';

/* ── Storage helpers ──────────────────────────────────────────── */

const STORAGE_KEY = 'cleanup_scripts';

/** @returns {Promise<Array>} */
async function loadScripts() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

/** @param {Array} scripts */
async function saveScripts(scripts) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: scripts }, resolve);
  });
}

/* ── DOM helpers ──────────────────────────────────────────────── */

/**
 * Show a temporary status message.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {'success'|'error'} type
 */
function showStatus(el, text, type = 'success') {
  el.textContent = text;
  el.className = `status-msg ${type}`;
  setTimeout(() => {
    el.textContent = '';
    el.className = 'status-msg';
  }, 3000);
}

/* ── Active tab URL ───────────────────────────────────────────── */

/** @returns {Promise<string>} */
async function getActiveTabUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0].url || '' : '');
    });
  });
}

/* ── URI matching ─────────────────────────────────────────────── */

/**
 * Returns true when the given URI pattern matches the page URL.
 * The comparison is case-insensitive.
 *
 * Matching rules:
 *  - If the pattern includes a scheme (e.g. "https://"), a simple
 *    case-insensitive substring check is performed so the full URL structure
 *    constrains the match.
 *  - Otherwise the pattern is treated as a hostname (and optional path):
 *      • "example.com" matches example.com and sub.example.com but NOT
 *        notexample.com or example.com.evil.site.
 *      • "example.com/shop" additionally requires the path segment to match.
 *
 * @param {string} uriPattern  – e.g. "example.com" or "https://example.com/shop"
 * @param {string} pageUrl     – full URL of the active tab
 * @returns {boolean}
 */
function uriMatches(uriPattern, pageUrl) {
  const pattern = uriPattern.trim().toLowerCase();
  const url = pageUrl.toLowerCase();

  if (!pattern) return false;

  /* Pattern includes a scheme → substring match is safe because the
     scheme prefix already constrains it to exact-looking URLs. */
  if (pattern.includes('://')) {
    return url.includes(pattern);
  }

  /* Hostname-only (or hostname+path) pattern.
     Parse the full URL to get the hostname and then check domain boundaries. */
  let hostname, rest;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;  // e.g. "shop.example.com"
    rest = parsed.pathname + parsed.search;
  } catch {
    /* Unparseable URL (e.g. chrome:// pages) – fall back to substring */
    return url.includes(pattern);
  }

  if (pattern.includes('/')) {
    /* Pattern has a path component – split on first slash */
    const slashIdx = pattern.indexOf('/');
    const patternHost = pattern.slice(0, slashIdx);
    const patternPath = pattern.slice(slashIdx);

    return (hostname === patternHost || hostname.endsWith('.' + patternHost))
      && rest.startsWith(patternPath);
  }

  /* Hostname-only: must be an exact match or a subdomain */
  return hostname === pattern || hostname.endsWith('.' + pattern);
}

/* ── Render script list ───────────────────────────────────────── */

/**
 * Build the script-list UI.
 * @param {Array}  scripts
 * @param {string} currentUrl
 */
function renderScripts(scripts, currentUrl) {
  const list = document.getElementById('scripts-list');
  const emptyMsg = document.getElementById('no-scripts-msg');

  list.innerHTML = '';

  if (scripts.length === 0) {
    emptyMsg.style.display = '';
    return;
  }

  emptyMsg.style.display = 'none';

  scripts.forEach((script) => {
    const matches = currentUrl && uriMatches(script.uri, currentUrl);

    const li = document.createElement('li');
    li.className = 'script-item' + (matches ? ' uri-match' : '');
    li.dataset.id = script.id;

    li.innerHTML = `
      <div class="script-info">
        <div class="script-name" title="${escapeHtml(script.name)}">${escapeHtml(script.name)}</div>
        <div class="script-uri" title="${escapeHtml(script.uri)}">${escapeHtml(script.uri)}</div>
      </div>
      <div class="script-actions">
        <button class="btn-run-single" data-id="${script.id}" title="Run this script on the current page">▶ Run</button>
        <button class="btn-delete" data-id="${script.id}" title="Delete this script">✕</button>
      </div>
    `;

    list.appendChild(li);
  });
}

/** Minimal HTML escaping to prevent XSS in innerHTML. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Script execution ─────────────────────────────────────────── */

/**
 * Ask the background service worker to inject `code` into the active tab.
 * @param {string} code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function executeScriptOnActiveTab(code) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'EXECUTE_SCRIPT', code }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, error: 'No response from background.' });
      }
    });
  });
}

/* ── Main initialisation ──────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  const saveBtn      = document.getElementById('save-btn');
  const saveStatus   = document.getElementById('save-status');
  const runBtn       = document.getElementById('run-btn');
  const runStatus    = document.getElementById('run-status');
  const currentUrlEl = document.getElementById('current-url');
  const uriInput     = document.getElementById('uri-input');
  const fileInput    = document.getElementById('file-input');
  const scriptName   = document.getElementById('script-name');
  const scriptsList  = document.getElementById('scripts-list');

  /* Show the active tab URL */
  const currentUrl = await getActiveTabUrl();
  currentUrlEl.textContent = currentUrl ? `Current page: ${currentUrl}` : 'No active tab detected.';

  /* Load and render saved scripts */
  let scripts = await loadScripts();
  renderScripts(scripts, currentUrl);

  /* ── Save a new script ── */
  saveBtn.addEventListener('click', async () => {
    const uri = uriInput.value.trim();
    if (!uri) {
      showStatus(saveStatus, 'Please enter a URI pattern.', 'error');
      return;
    }

    const file = fileInput.files[0];
    if (!file) {
      showStatus(saveStatus, 'Please select a JavaScript file.', 'error');
      return;
    }

    let code;
    try {
      code = await readFileAsText(file);
    } catch {
      showStatus(saveStatus, 'Failed to read the file.', 'error');
      return;
    }

    const name = scriptName.value.trim() || file.name;

    const newScript = {
      id: crypto.randomUUID(),
      name,
      uri,
      code,
    };

    scripts.push(newScript);
    await saveScripts(scripts);

    /* Reset form */
    uriInput.value    = '';
    fileInput.value   = '';
    scriptName.value  = '';

    renderScripts(scripts, currentUrl);
    showStatus(saveStatus, `Script "${name}" saved.`, 'success');
  });

  /* ── Run all matching scripts on the current page ── */
  runBtn.addEventListener('click', async () => {
    if (!currentUrl) {
      showStatus(runStatus, 'No active tab.', 'error');
      return;
    }

    const matching = scripts.filter((s) => uriMatches(s.uri, currentUrl));

    if (matching.length === 0) {
      showStatus(runStatus, 'No saved scripts match the current URL.', 'error');
      return;
    }

    let successCount = 0;
    let errorMsgs = [];

    for (const script of matching) {
      const result = await executeScriptOnActiveTab(script.code);
      if (result.success) {
        successCount++;
      } else {
        errorMsgs.push(`"${script.name}": ${result.error}`);
      }
    }

    if (errorMsgs.length === 0) {
      showStatus(runStatus, `Ran ${successCount} script(s) successfully.`, 'success');
    } else {
      showStatus(runStatus, `Errors: ${errorMsgs.join('; ')}`, 'error');
    }
  });

  /* ── Delegate clicks on Run / Delete buttons in the list ── */
  scriptsList.addEventListener('click', async (e) => {
    const runSingleBtn = e.target.closest('.btn-run-single');
    const deleteBtn    = e.target.closest('.btn-delete');

    if (runSingleBtn) {
      const id = runSingleBtn.dataset.id;
      const script = scripts.find((s) => s.id === id);
      if (!script) return;

      const result = await executeScriptOnActiveTab(script.code);
      if (result.success) {
        showStatus(runStatus, `"${script.name}" executed successfully.`, 'success');
      } else {
        showStatus(runStatus, `Error running "${script.name}": ${result.error}`, 'error');
      }
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const script = scripts.find((s) => s.id === id);
      if (!script) return;

      if (!confirm(`Delete script "${script.name}"?`)) return;

      scripts = scripts.filter((s) => s.id !== id);
      await saveScripts(scripts);
      renderScripts(scripts, currentUrl);
    }
  });
});

/* ── File reader utility ──────────────────────────────────────── */

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsText(file);
  });
}
