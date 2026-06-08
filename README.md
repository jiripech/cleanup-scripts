# The Cleanup Scripts project

## TL;DR

**Cookie Consents Cleanup scripts** to be executed by *copy-pasting* them to the Developer Tools JS Console.

## Explanation

I felt the necessity to automate unchecking checkboxes on all sites using Consent Management Platforms annoying users just to their owners be able to legally sell the user's data. At least some of them.

It was a kickstart for writing a browser plugin to execute these scripts by a single click.

## Vibe coding disclaimer

Since I might have been the laziest person ever lived on the Earth and I also lived here with a [Glioblastoma](https://en.wikipedia.org/wiki/Glioblastoma "Wikipedia: Glioblastoma"), so my ability to code was far from ideal, I used various "AI" platforms to help me write the code.

---

## Chrome Extension

The plugin is now here. Load a `.js` file, bind it to a URI pattern, and execute it on matching pages with one click – no more copy-pasting into the DevTools console.

### Installation (Developer Mode)

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the root folder of this repository.
5. The **Cleanup Scripts** icon will appear in your toolbar.

### Usage

1. Click the extension icon to open the popup.
2. In the **Add Script** section:
   - Enter a **URI Pattern** (e.g. `example.com` or `https://shop.example.com`).
   - Choose a **JavaScript File** (`.js`) from your disk.
   - Optionally provide a human-readable **Script Name**.
   - Click **Save Script**.
3. Navigate to a page that matches your URI pattern.
4. Open the popup – matching scripts are highlighted in green.
5. Click **Run Matching Scripts** to execute all matching scripts, or click the ▶ **Run** button next to an individual script.

### URI matching

Domain-boundary-aware: `example.com` matches `example.com` and `shop.example.com` but **not** `notexample.com` or `example.com.evil.site`. Patterns with a scheme (e.g. `https://example.com/path`) fall back to substring match. Patterns with a path component (e.g. `example.com/shop`) match hostname + path prefix.

### File Structure

```
cleanup-scripts/
├── manifest.json   # Chrome Manifest V3 configuration
├── popup.html      # Extension popup UI
├── popup.js        # Popup logic (save, render, run scripts)
├── background.js   # Service worker – injects scripts via chrome.scripting API
├── styles.css      # Popup styles
└── README.md
```

### Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Access the URL of the current tab and target it for script injection. |
| `scripting` | Inject JavaScript into the active tab (`chrome.scripting.executeScript`). |
| `storage` | Persist saved scripts across browser sessions (`chrome.storage.local`). |

