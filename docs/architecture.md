# Architecture

Safari Keys is a macOS Safari Web Extension plus a small SwiftUI companion app. The extension injects a content script into allowed pages and handles keys there. The app stores settings and shows onboarding.

## Processes

```
┌─────────────────────┐     App Group / UserDefaults      ┌──────────────────────────┐
│  SafariKeys.app     │◄────────────────────────────────►│  SafariKeys Extension    │
│  SwiftUI settings   │     native message getSettings    │  background + content    │
└─────────────────────┘                                   └────────────┬─────────────┘
                                                                       │
                                                          tabs / runtime messages
                                                                       │
                                                              ┌────────▼────────┐
                                                              │  Web page       │
                                                              │  content.js     │
                                                              └─────────────────┘
```

- **Containing app** (`SafariKeys/`): onboarding, cheatsheet, settings UI. Identifiers: `nl.wouterstolk.safari-keys` (app), `nl.wouterstolk.safari-keys.extension` (extension).
- **Native handler** (`SafariKeys Extension/SafariWebExtensionHandler.swift`): answers `getSettings` from the background script.
- **Background** (`extension/src/background.js`): settings cache, tab commands, toolbar click (site-access prompt + help).
- **Content** (`extension/src/content.js`): key handling, scrolling, hints, palette, help overlay. Runs in the top frame only.

Safari does not grant `<all_urls>` on install. The toolbar button calls `permissions.request({ origins: ["<all_urls>"] })`. Until the user chooses **Always Allow on Every Website**, keys only work on sites Safari has allowed.

## Settings

Shared model: `Shared/AppSettings.swift` and `extension/src/settings.js` (same keys: `excludedHosts`, `hintCharacters`, `scrollStep`, `smoothScroll`).

Load path:

1. Background asks the native handler.
2. On success, settings are written to `browser.storage.local`.
3. Content script requests `getSettings` on boot and listens for `settingsUpdated`.

The App Group `group.nl.wouterstolk.safari-keys` is in both entitlements. Xcode registers it when you sign with a Developer Program team. Without that group (ad-hoc / no team), `UserDefaults(suiteName:)` is unavailable and the handler falls back to standard `UserDefaults`; the extension uses defaults or last-cached storage.

## Content-script pipeline

1. `keydown` (capture) → ignore composing events, iframes, excluded hosts.
2. Overlay modes (`hints`, `palette`, `help`) handle their own keys, including Escape / `Ctrl-[`.
3. Otherwise `eventToKey` + `reduce` (`modes.js`) interpret counts and multi-key sequences from `DEFAULT_MAPPINGS`.
4. `runCommand` (`commands.js`) either scrolls, opens an overlay, or messages the background script.

Keymap source of truth is `extension/src/mappings.js` (`DEFAULT_MAPPINGS` and `HELP_SECTIONS`). The in-page `?` cheatsheet renders `HELP_SECTIONS`.

## Module map

| Area | Modules |
| --- | --- |
| Boot / keys | `content.js`, `keymap.js`, `modes.js`, `keys.js`, `browser.js` |
| Commands | `commands.js`, `mappings.js` |
| Hints | `hint-mode.js`, `hints.js` (re-exports), `hint-labels.js`, `clickable.js` |
| Palette | `palette-mode.js`, `palette.js` |
| Scroll | `scroll.js` (motion), `scroll-target.js` (which element to scroll) |
| UI | `overlay.js` |
| Background | `background.js`, `tab-commands.js`, `tabs.js`, `access.js`, `settings.js` |

`hints.js` stays as the public import for tests (`generateHintLabels`, `collectClickable`, `activateHint`, …).

## Overlays

Hints, palette, help, and the HUD are in-page DOM under `#safari-keys-root`, styled by `SafariKeys Extension/Resources/styles/content.css` (SF Pro / SF Mono, vibrancy). They are not Safari native UI.

## Bundling

`npm run build` runs esbuild (`scripts/build.mjs`) and writes IIFE bundles to:

- `SafariKeys Extension/Resources/content.js`
- `SafariKeys Extension/Resources/background.js`

Those two files are generated. Edit `extension/src/` only. Xcode packages `SafariKeys Extension/Resources/` into the `.appex`.

## Tests

- **Vitest** (`tests/*.test.js`): keymap, modes, hints, scrolling, palette, settings, tabs, site access. Pure functions; JSDOM where the DOM matters.
- **Swift Testing** (`tests/SafariKeysCoreTests/`): `AppSettings` encode/decode.

Content and background scripts are not driven end-to-end in CI; after JS changes, rebuild, run the app, and reload the Safari tab.
