// Prism's Manifest V3 service worker. It owns browser-level events and storage.

const EXPLAIN_MENU_ID = "prism-explain-selection";
const SELECTED_TEXT_KEY = "prismSelectedText";

// Recreate the menu when Chrome installs or updates the extension. The
// selection context prevents it from appearing when no text is highlighted.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll().then(() =>
    chrome.contextMenus.create({
      id: EXPLAIN_MENU_ID,
      title: "Explain with Prism",
      contexts: ["selection"],
    })
  );
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== EXPLAIN_MENU_ID || !tab?.id) {
    return;
  }

  // activeTab grants temporary access to the tab after this user action, so no
  // broad host permission is needed. The inline function runs in the page and
  // returns only its currently highlighted text.
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString().trim() || "",
    });

    if (result) {
      await chrome.storage.local.set({ [SELECTED_TEXT_KEY]: result });
      console.log("Stored selection:", result);
    }
  } catch (error) {
    // Chrome blocks injection on restricted pages such as chrome:// URLs.
    console.warn("Prism could not read the selection from this page.", error);
  }
});
