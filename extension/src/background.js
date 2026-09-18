import { handleToolbarClick } from "./access.js";
import { extensionApi } from "./browser.js";
import { defaultSettings, normalizeSettings } from "./settings.js";
import {
  cacheTab,
  createTabState,
  handleCommand,
  rememberClosedTab,
  refreshTabCache,
} from "./tab-commands.js";

const browser = extensionApi();
const state = createTabState();

async function getSettings() {
  try {
    const native = await browser.runtime.sendNativeMessage("application.id", { type: "getSettings" });
    if (native?.settings) {
      const settings = normalizeSettings(native.settings);
      await browser.storage.local.set({ settings });
      return settings;
    }
  } catch {
    // Native messaging is unavailable in temporary-extension loads.
  }
  const stored = await browser.storage.local.get("settings");
  return normalizeSettings(stored.settings || defaultSettings);
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const result = handleCommand(message, sender, { browser, getSettings, state });
  if (result && typeof result.then === "function") {
    result.then(sendResponse).catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  sendResponse(result);
  return false;
});

browser.tabs.onUpdated.addListener((_tabId, _change, tab) => cacheTab(state, tab));
browser.tabs.onCreated.addListener((tab) => cacheTab(state, tab));
browser.tabs.onRemoved.addListener((tabId) => rememberClosedTab(state, tabId));

browser.action?.onClicked?.addListener(async (tab) => {
  await handleToolbarClick(tab, {
    permissions: browser.permissions,
    sendMessage: (tabId, message) => browser.tabs.sendMessage(tabId, message),
    reload: (tabId) => browser.tabs.reload(tabId),
  });
});

refreshTabCache(browser, state);
getSettings();
