(() => {
  // extension/src/access.js
  var ALL_URLS = { origins: ["<all_urls>"] };
  async function handleToolbarClick(tab, api) {
    const { permissions, sendMessage, reload } = api;
    let hadAccess = false;
    try {
      hadAccess = await permissions.contains(ALL_URLS);
    } catch {
      hadAccess = false;
    }
    if (!hadAccess) {
      let granted = false;
      try {
        granted = await permissions.request(ALL_URLS);
      } catch {
        granted = false;
      }
      if (granted && tab?.id != null) {
        await reload(tab.id);
      }
      return { requested: true, granted };
    }
    if (tab?.id != null) {
      try {
        await sendMessage(tab.id, { type: "showHelp" });
      } catch {
      }
    }
    return { requested: false, granted: true };
  }

  // extension/src/settings.js
  var defaultSettings = {
    excludedHosts: [],
    hintCharacters: "sadfjklewcmpgh",
    scrollStep: 60,
    smoothScroll: true
  };
  function normalizeSettings(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const hintCharacters = typeof input.hintCharacters === "string" && input.hintCharacters.length > 0 ? input.hintCharacters : defaultSettings.hintCharacters;
    const scrollStep = Number.isFinite(input.scrollStep) && input.scrollStep > 0 ? Math.floor(input.scrollStep) : defaultSettings.scrollStep;
    const smoothScroll = typeof input.smoothScroll === "boolean" ? input.smoothScroll : defaultSettings.smoothScroll;
    const excludedHosts = Array.isArray(input.excludedHosts) ? input.excludedHosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean) : [];
    return { excludedHosts, hintCharacters, scrollStep, smoothScroll };
  }

  // extension/src/tabs.js
  function nextTabIndex(tabs, currentIndex, delta) {
    if (!tabs.length) {
      return 0;
    }
    const sorted = [...tabs].sort((a, b) => a.index - b.index);
    const len = sorted.length;
    return (currentIndex + delta + len * 50) % len;
  }
  function collectClosedTab(stack, tab) {
    if (!tab?.url) {
      return stack;
    }
    const next = [...stack, { url: tab.url, title: tab.title || tab.url }];
    return next.slice(-50);
  }
  function restoreClosedTab(stack) {
    if (!stack.length) {
      return { stack, tab: null };
    }
    const tab = stack[stack.length - 1];
    return { stack: stack.slice(0, -1), tab };
  }

  // extension/src/background.js
  var browser = globalThis.browser ?? globalThis.chrome;
  var closedTabs = [];
  var tabCache = /* @__PURE__ */ new Map();
  function cacheTab(tab) {
    if (tab?.id != null) {
      tabCache.set(tab.id, { url: tab.url, title: tab.title, id: tab.id, index: tab.index });
    }
  }
  async function refreshCache() {
    const tabs = await browser.tabs.query({});
    tabCache.clear();
    for (const tab of tabs) {
      cacheTab(tab);
    }
  }
  async function getSettings() {
    try {
      const native = await browser.runtime.sendNativeMessage("application.id", { type: "getSettings" });
      if (native?.settings) {
        const settings = normalizeSettings(native.settings);
        await browser.storage.local.set({ settings });
        return settings;
      }
    } catch {
    }
    const stored = await browser.storage.local.get("settings");
    return normalizeSettings(stored.settings || defaultSettings);
  }
  async function activeTab() {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }
  async function handleCommand(message, sender) {
    const count = message.count ?? 1;
    const tab = sender.tab || await activeTab();
    switch (message.type) {
      case "getSettings":
        return getSettings();
      case "listTabs":
        return browser.tabs.query({ currentWindow: true });
      case "tabLeft":
      case "tabRight": {
        const tabs = await browser.tabs.query({ currentWindow: true });
        const current = tabs.find((item) => item.id === tab?.id);
        if (!current) {
          return { ok: false };
        }
        const delta = (message.type === "tabLeft" ? -1 : 1) * count;
        const index = nextTabIndex(tabs, current.index, delta);
        const target = tabs.find((item) => item.index === index) || tabs[index];
        if (target) {
          await browser.tabs.update(target.id, { active: true });
        }
        return { ok: true };
      }
      case "firstTab":
      case "lastTab": {
        const tabs = (await browser.tabs.query({ currentWindow: true })).sort((a, b) => a.index - b.index);
        const target = message.type === "firstTab" ? tabs[0] : tabs[tabs.length - 1];
        if (target) {
          await browser.tabs.update(target.id, { active: true });
        }
        return { ok: true };
      }
      case "newTab": {
        for (let i = 0; i < count; i++) {
          await browser.tabs.create({});
        }
        return { ok: true };
      }
      case "duplicateTab": {
        if (tab?.id != null) {
          for (let i = 0; i < count; i++) {
            await browser.tabs.duplicate(tab.id);
          }
        }
        return { ok: true };
      }
      case "closeTab": {
        if (tab?.id != null) {
          await browser.tabs.remove(tab.id);
        }
        return { ok: true };
      }
      case "restoreTab": {
        const restored = restoreClosedTab(closedTabs);
        closedTabs = restored.stack;
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
        if (message.url) {
          if (message.newTab) {
            await browser.tabs.create({ url: message.url, active: false });
          } else if (tab?.id != null) {
            await browser.tabs.update(tab.id, { url: message.url });
          }
        }
        return { ok: true };
      case "activatePaletteItem": {
        const item = message.item;
        if (!item) {
          return { ok: false };
        }
        if (item.kind === "tab" && item.tabId != null) {
          await browser.tabs.update(item.tabId, { active: true });
          return { ok: true };
        }
        if (item.url) {
          if (message.newTab) {
            await browser.tabs.create({ url: item.url });
          } else if (tab?.id != null) {
            await browser.tabs.update(tab.id, { url: item.url });
          } else {
            await browser.tabs.create({ url: item.url });
          }
        }
        return { ok: true };
      }
      default:
        return void 0;
    }
  }
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handleCommand(message, sender);
    if (result && typeof result.then === "function") {
      result.then(sendResponse).catch((error) => sendResponse({ ok: false, error: String(error) }));
      return true;
    }
    sendResponse(result);
    return false;
  });
  browser.tabs.onUpdated.addListener((tabId, _change, tab) => cacheTab(tab));
  browser.tabs.onCreated.addListener(cacheTab);
  browser.tabs.onRemoved.addListener((tabId) => {
    const cached = tabCache.get(tabId);
    if (cached) {
      closedTabs = collectClosedTab(closedTabs, cached);
      tabCache.delete(tabId);
    }
  });
  browser.action?.onClicked?.addListener(async (tab) => {
    await handleToolbarClick(tab, {
      permissions: browser.permissions,
      sendMessage: (tabId, message) => browser.tabs.sendMessage(tabId, message),
      reload: (tabId) => browser.tabs.reload(tabId)
    });
  });
  refreshCache();
  getSettings();
})();
