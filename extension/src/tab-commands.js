import { collectClosedTab, nextTabIndex, restoreClosedTab } from "./tabs.js";

export function createTabState() {
  return { closedTabs: [], tabCache: new Map() };
}

export function cacheTab(state, tab) {
  if (tab?.id != null) {
    state.tabCache.set(tab.id, {
      url: tab.url,
      title: tab.title,
      id: tab.id,
      index: tab.index,
    });
  }
}

export function rememberClosedTab(state, tabId) {
  const cached = state.tabCache.get(tabId);
  if (cached) {
    state.closedTabs = collectClosedTab(state.closedTabs, cached);
    state.tabCache.delete(tabId);
  }
}

export async function refreshTabCache(browser, state) {
  const tabs = await browser.tabs.query({});
  state.tabCache.clear();
  for (const tab of tabs) {
    cacheTab(state, tab);
  }
}

async function activeTab(browser) {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function windowTabs(browser) {
  return browser.tabs.query({ currentWindow: true });
}

async function activateTab(browser, tab) {
  if (tab) {
    await browser.tabs.update(tab.id, { active: true });
  }
}

async function navigateTo(browser, tab, url, { newTab = false, background = false, createIfMissing = false } = {}) {
  if (!url) {
    return;
  }
  if (newTab) {
    await browser.tabs.create({ url, ...(background ? { active: false } : {}) });
    return;
  }
  if (tab?.id != null) {
    await browser.tabs.update(tab.id, { url });
    return;
  }
  if (createIfMissing) {
    await browser.tabs.create({ url });
  }
}

async function repeat(count, fn) {
  for (let i = 0; i < count; i++) {
    await fn();
  }
}

export async function handleCommand(message, sender, { browser, getSettings, state }) {
  const count = message.count ?? 1;
  const tab = sender.tab || (await activeTab(browser));

  switch (message.type) {
    case "getSettings":
      return getSettings();
    case "listTabs":
      return windowTabs(browser);
    case "tabLeft":
    case "tabRight": {
      const tabs = await windowTabs(browser);
      const current = tabs.find((item) => item.id === tab?.id);
      if (!current) {
        return { ok: false };
      }
      const delta = (message.type === "tabLeft" ? -1 : 1) * count;
      const index = nextTabIndex(tabs, current.index, delta);
      await activateTab(browser, tabs.find((item) => item.index === index) || tabs[index]);
      return { ok: true };
    }
    case "firstTab":
    case "lastTab": {
      const tabs = (await windowTabs(browser)).sort((a, b) => a.index - b.index);
      await activateTab(browser, message.type === "firstTab" ? tabs[0] : tabs[tabs.length - 1]);
      return { ok: true };
    }
    case "newTab":
      await repeat(count, () => browser.tabs.create({}));
      return { ok: true };
    case "duplicateTab":
      if (tab?.id != null) {
        await repeat(count, () => browser.tabs.duplicate(tab.id));
      }
      return { ok: true };
    case "closeTab":
      if (tab?.id != null) {
        await browser.tabs.remove(tab.id);
      }
      return { ok: true };
    case "restoreTab": {
      const restored = restoreClosedTab(state.closedTabs);
      state.closedTabs = restored.stack;
      if (restored.tab?.url) {
        await browser.tabs.create({ url: restored.tab.url });
      }
      return { ok: Boolean(restored.tab) };
    }
    case "goBack":
      if (tab?.id != null) {
        await browser.tabs.goBack(tab.id);
      }
      return { ok: true };
    case "goForward":
      if (tab?.id != null) {
        await browser.tabs.goForward(tab.id);
      }
      return { ok: true };
    case "openUrl":
      await navigateTo(browser, tab, message.url, { newTab: message.newTab, background: true });
      return { ok: true };
    case "activatePaletteItem": {
      const item = message.item;
      if (!item) {
        return { ok: false };
      }
      if (item.kind === "tab" && item.tabId != null) {
        await activateTab(browser, { id: item.tabId });
        return { ok: true };
      }
      await navigateTo(browser, tab, item.url, { newTab: message.newTab, createIfMissing: true });
      return { ok: true };
    }
    default:
      return undefined;
  }
}
