const ROOT_ID = "safari-keys-root";

export function ensureRoot(document) {
  let root = document.getElementById(ROOT_ID);
  if (root) {
    return root;
  }
  root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("data-safari-keys", "root");
  Object.assign(root.style, {
    all: "initial",
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    pointerEvents: "none",
  });
  document.documentElement.appendChild(root);
  return root;
}

export function clearRoot(document) {
  document.getElementById(ROOT_ID)?.replaceChildren();
}

export function showHud(document, text) {
  const root = ensureRoot(document);
  root.querySelector(".sk-hud")?.remove();
  const hud = document.createElement("div");
  hud.className = "sk-hud";
  hud.textContent = text;
  root.appendChild(hud);
  window.clearTimeout(showHud._timer);
  showHud._timer = window.setTimeout(() => hud.remove(), 1400);
}

export function renderHints(document, hints, typed) {
  const root = ensureRoot(document);
  root.querySelector(".sk-hints")?.remove();
  const layer = document.createElement("div");
  layer.className = "sk-hints";
  for (const hint of hints) {
    const visible = hint.label.startsWith(typed);
    if (!visible) {
      continue;
    }
    const marker = document.createElement("div");
    marker.className = "sk-hint";
    marker.dataset.label = hint.label;
    const matched = document.createElement("span");
    matched.className = "sk-hint-matched";
    matched.textContent = typed;
    const rest = document.createElement("span");
    rest.textContent = hint.label.slice(typed.length);
    marker.append(matched, rest);
    const rect = hint.el.getBoundingClientRect();
    marker.style.top = `${Math.max(0, rect.top)}px`;
    marker.style.left = `${Math.max(0, rect.left)}px`;
    layer.appendChild(marker);
  }
  root.appendChild(layer);
}

export function renderPalette(document, state) {
  const root = ensureRoot(document);
  root.querySelector(".sk-palette-wrap")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "sk-palette-wrap";
  wrap.innerHTML = `
    <div class="sk-palette" role="dialog" aria-label="Safari Keys">
      <div class="sk-palette-input-row">
        <span class="sk-palette-glyph">⌘</span>
        <input class="sk-palette-input" type="text" spellcheck="false" autocomplete="off" />
      </div>
      <ol class="sk-palette-list"></ol>
    </div>
  `;
  const input = wrap.querySelector(".sk-palette-input");
  input.placeholder = state.placeholder;
  input.value = state.query;
  const list = wrap.querySelector(".sk-palette-list");
  state.items.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "sk-palette-item" + (index === state.selectedIndex ? " is-selected" : "");
    li.innerHTML = `<span class="sk-palette-title"></span><span class="sk-palette-sub"></span>`;
    li.querySelector(".sk-palette-title").textContent = item.title;
    li.querySelector(".sk-palette-sub").textContent = item.subtitle || "";
    list.appendChild(li);
  });
  if (!state.items.length) {
    const empty = document.createElement("li");
    empty.className = "sk-palette-empty";
    empty.textContent = state.query ? "No matching tabs" : "Type a URL, search, or tab name";
    list.appendChild(empty);
  }
  root.appendChild(wrap);
  return input;
}

export function renderHelp(document, sections) {
  const root = ensureRoot(document);
  root.querySelector(".sk-help-wrap")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "sk-help-wrap";
  const panel = document.createElement("div");
  panel.className = "sk-help";
  const heading = document.createElement("h1");
  heading.textContent = "Safari Keys";
  panel.appendChild(heading);
  for (const section of sections) {
    const h2 = document.createElement("h2");
    h2.textContent = section.title;
    panel.appendChild(h2);
    const dl = document.createElement("dl");
    for (const [keys, label] of section.keys) {
      const dt = document.createElement("dt");
      dt.textContent = keys;
      const dd = document.createElement("dd");
      dd.textContent = label;
      dl.append(dt, dd);
    }
    panel.appendChild(dl);
  }
  wrap.appendChild(panel);
  root.appendChild(wrap);
}
