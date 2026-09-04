import { describe, expect, it, vi } from "vitest";
import { handleToolbarClick } from "../extension/src/access.js";

function api({ contains, request, sendMessage, reload } = {}) {
  return {
    permissions: {
      contains: contains || vi.fn(async () => false),
      request: request || vi.fn(async () => true),
    },
    sendMessage: sendMessage || vi.fn(async () => ({})),
    reload: reload || vi.fn(async () => {}),
  };
}

describe("handleToolbarClick", () => {
  it("requests all-website access when it is not already granted", async () => {
    const hooks = api();
    const result = await handleToolbarClick({ id: 7 }, hooks);
    expect(hooks.permissions.request).toHaveBeenCalledWith({ origins: ["<all_urls>"] });
    expect(hooks.reload).toHaveBeenCalledWith(7);
    expect(hooks.sendMessage).not.toHaveBeenCalled();
    expect(result).toEqual({ requested: true, granted: true });
  });

  it("shows help when all-website access is already granted", async () => {
    const hooks = api({ contains: vi.fn(async () => true) });
    const result = await handleToolbarClick({ id: 3 }, hooks);
    expect(hooks.permissions.request).not.toHaveBeenCalled();
    expect(hooks.reload).not.toHaveBeenCalled();
    expect(hooks.sendMessage).toHaveBeenCalledWith(3, { type: "showHelp" });
    expect(result).toEqual({ requested: false, granted: true });
  });

  it("does not reload when the all-website prompt is declined", async () => {
    const hooks = api({ request: vi.fn(async () => false) });
    const result = await handleToolbarClick({ id: 4 }, hooks);
    expect(hooks.reload).not.toHaveBeenCalled();
    expect(result).toEqual({ requested: true, granted: false });
  });
});
