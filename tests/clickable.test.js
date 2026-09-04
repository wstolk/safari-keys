import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { collectClickable } from "../extension/src/hints.js";

function dom(html) {
  const { window } = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`, {
    pretendToBeVisual: true,
    url: "https://example.test/",
  });
  for (const el of window.document.querySelectorAll("*")) {
    el.getBoundingClientRect = () => ({
      top: 10,
      left: 10,
      bottom: 40,
      right: 80,
      width: 70,
      height: 30,
      x: 10,
      y: 10,
    });
  }
  Object.defineProperty(window, "innerHeight", { value: 800 });
  Object.defineProperty(window, "innerWidth", { value: 1200 });
  return window;
}

describe("collectClickable", () => {
  it("finds links, buttons, and text inputs", () => {
    const window = dom(`
      <a href="/next">Next</a>
      <button>Save</button>
      <input type="text" />
      <span>plain</span>
    `);
    const els = collectClickable(window.document, window);
    const tags = els.map((el) => el.tagName);
    expect(tags).toContain("A");
    expect(tags).toContain("BUTTON");
    expect(tags).toContain("INPUT");
    expect(tags).not.toContain("SPAN");
  });

  it("includes role=button elements", () => {
    const window = dom(`<div role="button">Go</div>`);
    const els = collectClickable(window.document, window);
    expect(els).toHaveLength(1);
  });

  it("skips hidden elements", () => {
    const window = dom(`<a href="/" style="display:none">Hidden</a><a href="/v">Visible</a>`);
    const hidden = window.document.querySelector("a[href='/']");
    hidden.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0,
    });
    const els = collectClickable(window.document, window);
    expect(els).toHaveLength(1);
    expect(els[0].getAttribute("href")).toBe("/v");
  });

  it("finds ARIA treeitems that are not links, including tabindex=-1 rows", () => {
    const window = githubTree();
    const labels = collectClickable(window.document, window).map((el) =>
      (el.innerText || el.textContent).trim().split("\n")[0],
    );
    expect(labels).toEqual([".github", "docs", "contributing.md"]);
  });

  it("does not hint an expanded folder as one giant target covering its children", () => {
    const window = githubTree();
    const els = collectClickable(window.document, window);
    const docs = window.document.getElementById("docs-item");
    expect(els).not.toContain(docs);
  });

  it("finds links inside open shadow roots", () => {
    const window = dom(`<div id="host"></div>`);
    const host = window.document.getElementById("host");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<a href="/shadowed">Inside</a>`;
    stubRect(shadow.querySelector("a"));
    const els = collectClickable(window.document, window);
    expect(els).toHaveLength(1);
    expect(els[0].getAttribute("href")).toBe("/shadowed");
  });

  it("finds cursor:pointer controls that have no href or button role", () => {
    const window = dom(`<div id="card" style="cursor:pointer">Open</div>`);
    const els = collectClickable(window.document, window);
    expect(els.map((el) => el.id)).toEqual(["card"]);
  });

  it("skips aria-disabled treeitems", () => {
    const window = dom(`<li role="treeitem" aria-disabled="true">Locked</li>`);
    expect(collectClickable(window.document, window)).toEqual([]);
  });

  it("keeps short text links such as news headlines next to comment icons", () => {
    const window = dom(`
      <a id="title" href="/nieuws/1">OpenAI brengt GPT-6 Astra uit</a>
      <a id="comments" href="/nieuws/1#reacties">88</a>
    `);
    stubRect(window.document.getElementById("title"), {
      top: 10, left: 10, bottom: 28, right: 400, width: 390, height: 18, x: 10, y: 10,
    });
    stubRect(window.document.getElementById("comments"), {
      top: 10, left: 420, bottom: 42, right: 460, width: 40, height: 32, x: 420, y: 10,
    });
    const ids = collectClickable(window.document, window).map((el) => el.id);
    expect(ids).toContain("title");
    expect(ids).toContain("comments");
  });

  it("hints the article link rather than an image inside it", () => {
    const window = dom(
      `<a id="story" href="/nieuws/1"><img id="thumb" style="cursor:pointer" width="200" height="120" alt=""></a>`,
    );
    stubRect(window.document.getElementById("story"), {
      top: 10, left: 10, bottom: 160, right: 280, width: 270, height: 150, x: 10, y: 10,
    });
    stubRect(window.document.getElementById("thumb"), {
      top: 10, left: 10, bottom: 130, right: 280, width: 270, height: 120, x: 10, y: 10,
    });
    const ids = collectClickable(window.document, window).map((el) => el.id);
    expect(ids).toContain("story");
    expect(ids).not.toContain("thumb");
  });
});

function stubRect(el, rect = { top: 10, left: 10, bottom: 42, right: 260, width: 250, height: 32, x: 10, y: 10 }) {
  el.getBoundingClientRect = () => rect;
  el.getClientRects = () => [rect];
}

function githubTree() {
  const window = dom(`
    <ul role="tree">
      <li role="treeitem" tabindex="-1" aria-selected="false" id="github-item">
        <div class="row" style="cursor:pointer" id="github-row">.github</div>
      </li>
      <li role="treeitem" tabindex="0" aria-selected="true" id="docs-item">
        <div class="row" style="cursor:pointer" id="docs-row">
          <div class="toggle" style="cursor:pointer" id="docs-toggle"></div>
          <div class="content" style="cursor:pointer" id="docs-content">docs</div>
        </div>
        <ul role="group">
          <li role="treeitem" tabindex="-1" aria-selected="false" id="file-item">
            <div class="row" style="cursor:pointer" id="file-row">contributing.md</div>
          </li>
        </ul>
      </li>
    </ul>
  `);
  stubRect(window.document.getElementById("github-item"));
  stubRect(window.document.getElementById("github-row"));
  stubRect(window.document.getElementById("docs-item"), {
    top: 42, left: 10, bottom: 138, right: 260, width: 250, height: 96, x: 10, y: 42,
  });
  stubRect(window.document.getElementById("docs-row"), {
    top: 42, left: 10, bottom: 74, right: 260, width: 250, height: 32, x: 10, y: 42,
  });
  stubRect(window.document.getElementById("docs-content"), {
    top: 42, left: 36, bottom: 74, right: 260, width: 224, height: 32, x: 36, y: 42,
  });
  stubRect(window.document.getElementById("docs-toggle"), {
    top: 42, left: 10, bottom: 74, right: 26, width: 16, height: 32, x: 10, y: 42,
  });
  stubRect(window.document.getElementById("file-item"), {
    top: 74, left: 10, bottom: 106, right: 260, width: 250, height: 32, x: 10, y: 74,
  });
  stubRect(window.document.getElementById("file-row"), {
    top: 74, left: 10, bottom: 106, right: 260, width: 250, height: 32, x: 10, y: 74,
  });
  return window;
}
