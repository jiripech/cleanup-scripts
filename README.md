# Cleanup Scripts – Chrome Extension

A Chrome extension that lets you load JavaScript files and execute them on pages matching a URI pattern – no more copy-pasting into the DevTools console.

Originally designed for cookie-consent cleanup scripts, but works for any JavaScript you want to run on a specific site.

---

## Features

| Feature | Description |
|---|---|
| **Load a JS file** | Pick any `.js` file from your disk via the popup. |
| **URI pattern binding** | Associate the script with a URL (or any substring of a URL) so it only runs on the right pages. |
| **One-click execution** | Click **Run Matching Scripts** to inject every script whose URI pattern matches the current page. |
| **Per-script run** | Each saved script has its own ▶ Run button for targeted execution. |
| **Persistent storage** | Scripts are stored in `chrome.storage.local` – they survive browser restarts. |
| **Visual match highlighting** | Scripts that match the current page are highlighted in green. |

---

## Installation (Developer Mode)

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the root folder of this repository.
5. The **Cleanup Scripts** icon will appear in your toolbar.

---

## Usage

1. Click the extension icon to open the popup.
2. In the **Add Script** section:
   - Enter a **URI Pattern** (e.g. `example.com` or `https://shop.example.com`).  
     The pattern is matched as a case-insensitive substring of the page URL.
   - Choose a **JavaScript File** (`.js`) from your disk.
   - Optionally provide a human-readable **Script Name**.
   - Click **Save Script**.
3. Navigate to a page that matches your URI pattern.
4. Open the popup – matching scripts are highlighted in green.
5. Click **Run Matching Scripts** to execute all matching scripts, or click the ▶ **Run** button next to an individual script.

---

## File Structure

```
cleanup-scripts/
├── manifest.json   # Chrome Manifest V3 configuration
├── popup.html      # Extension popup UI
├── popup.js        # Popup logic (save, render, run scripts)
├── background.js   # Service worker – injects scripts via chrome.scripting API
├── styles.css      # Popup styles
└── README.md
```

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Access the URL of the current tab and target it for script injection. |
| `scripting` | Inject JavaScript into the active tab (`chrome.scripting.executeScript`). |
| `storage` | Persist saved scripts across browser sessions (`chrome.storage.local`). |

---

## Writing a Cleanup Script

Scripts run in the **page's global scope**, equivalent to pasting them in the DevTools console.  
Example – remove a cookie-consent overlay:

```js
// cookie-cleanup.js
document.querySelectorAll('.cookie-banner, #gdpr-overlay').forEach(el => el.remove());
document.body.style.overflow = '';
```

Save the file, add it to the extension with the URI pattern `example.com`, and it will run on any `example.com` page at the click of a button.

