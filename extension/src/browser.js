const fallback = {
  runtime: {
    sendMessage: async () => ({}),
    onMessage: { addListener() {} },
  },
  storage: { onChanged: { addListener() {} } },
};

export function extensionApi() {
  return globalThis.browser ?? globalThis.chrome ?? fallback;
}
