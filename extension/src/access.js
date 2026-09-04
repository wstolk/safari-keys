const ALL_URLS = { origins: ["<all_urls>"] };

export async function handleToolbarClick(tab, api) {
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
      // Content script missing until the page reloads after a permission grant.
    }
  }
  return { requested: false, granted: true };
}
