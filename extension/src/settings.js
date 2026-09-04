export const defaultSettings = {
  excludedHosts: [],
  hintCharacters: "sadfjklewcmpgh",
  scrollStep: 60,
  smoothScroll: true,
};

export function normalizeSettings(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const hintCharacters =
    typeof input.hintCharacters === "string" && input.hintCharacters.length > 0
      ? input.hintCharacters
      : defaultSettings.hintCharacters;
  const scrollStep =
    Number.isFinite(input.scrollStep) && input.scrollStep > 0
      ? Math.floor(input.scrollStep)
      : defaultSettings.scrollStep;
  const smoothScroll =
    typeof input.smoothScroll === "boolean" ? input.smoothScroll : defaultSettings.smoothScroll;
  const excludedHosts = Array.isArray(input.excludedHosts)
    ? input.excludedHosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean)
    : [];
  return { excludedHosts, hintCharacters, scrollStep, smoothScroll };
}

export function isExcluded(hostname, excludedHosts) {
  const host = String(hostname || "").toLowerCase();
  return excludedHosts.some((pattern) => {
    const needle = String(pattern).toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    return host === needle || host.endsWith(`.${needle}`);
  });
}
