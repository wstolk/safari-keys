export function looksLikeUrl(query) {
  const value = query.trim();
  if (!value || /\s/.test(value)) {
    return false;
  }
  if (/^https?:\/\//i.test(value)) {
    return true;
  }
  if (/^localhost(:\d+)?(\/|$)/i.test(value)) {
    return true;
  }
  return /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/|$)/i.test(value);
}

export function toNavigableUrl(query) {
  const value = query.trim();
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

export function searchUrl(query) {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query.trim())}`;
}

function scoreMatch(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) {
    return 1;
  }
  const consecutive = t.indexOf(q);
  if (consecutive >= 0) {
    return 1000 - consecutive * 10 - (t.length - q.length);
  }
  let ti = 0;
  let score = 0;
  let last = -2;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) {
      return 0;
    }
    score += found === last + 1 ? 8 : 2;
    if (found === 0 || /[\s/_-]/.test(t[found - 1])) {
      score += 12;
    }
    last = found;
    ti = found + 1;
  }
  return score;
}

export function fuzzyMatch(query, items) {
  if (!query.trim()) {
    return items.map((item, index) => ({ item, score: items.length - index }));
  }
  const ranked = [];
  for (const item of items) {
    const hay = `${item.title || ""} ${item.url || ""}`;
    const score = scoreMatch(query, hay);
    if (score > 0) {
      ranked.push({ item, score });
    }
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

export function paletteItems(query, tabs, mode) {
  const trimmed = query.trim();
  const tabMatches = fuzzyMatch(trimmed, tabs).map(({ item }) => ({
    kind: "tab",
    id: `tab-${item.id}`,
    title: item.title || item.url,
    subtitle: item.url,
    tabId: item.id,
    url: item.url,
  }));

  if (mode === "tabs") {
    return tabMatches;
  }

  const extras = [];
  if (trimmed && looksLikeUrl(trimmed)) {
    const url = toNavigableUrl(trimmed);
    extras.push({
      kind: "url",
      id: `url-${url}`,
      title: "Open URL",
      subtitle: url,
      url,
    });
  } else if (trimmed) {
    extras.push({
      kind: "search",
      id: `search-${trimmed}`,
      title: "Search the web",
      subtitle: trimmed,
      url: searchUrl(trimmed),
    });
  }

  return [...extras, ...tabMatches];
}
