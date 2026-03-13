/**
 * background.js – Cleanup Scripts Chrome Extension (Manifest V3 Service Worker)
 *
 * Listens for EXECUTE_SCRIPT messages from the popup and injects the provided
 * JavaScript code into the currently-active tab using the chrome.scripting API.
 */

'use strict';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'EXECUTE_SCRIPT') return false;

  const { code } = message;

  if (typeof code !== 'string' || code.trim() === '') {
    sendResponse({ success: false, error: 'No code provided.' });
    return false;
  }

  /* Retrieve the active tab in the current window */
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];

    if (!tab || !tab.id) {
      sendResponse({ success: false, error: 'No active tab found.' });
      return;
    }

    /* chrome.scripting.executeScript requires the "scripting" permission
       and either "activeTab" or a matching host_permissions entry. */
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: evaluateCode,
        args: [code],
      },
      (results) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, results });
        }
      }
    );
  });

  /* Return true to indicate that sendResponse will be called asynchronously */
  return true;
});

/**
 * This function is serialised and injected into the page context.
 * It uses indirect eval so that the script runs in the global (window) scope,
 * matching the behaviour of pasting code in the DevTools console.
 *
 * @param {string} code – The JavaScript source to execute.
 */
function evaluateCode(code) {
  // eslint-disable-next-line no-eval
  return (0, eval)(code); // indirect eval → global scope
}
