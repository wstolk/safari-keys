# Contributing

## Setup

```bash
npm install
npm test
npm run build
```

Open `SafariKeys.xcodeproj`, select the **SafariKeys** scheme and **My Mac**, then Run. Signing notes are in the [README](../README.md#install).

After changing `extension/src/`, run `npm run build` and reload the Safari tab (Safari caches content scripts).

## Layout

```
extension/src/                 Source for content + background (edit these)
SafariKeys Extension/          Web Extension target; Resources/content.js and
                               Resources/background.js are generated
SafariKeys/                    SwiftUI companion app
Shared/                        AppSettings shared with the native handler
tests/                         Vitest + Swift tests
docs/                          Architecture and this guide
```

Do not hand-edit `SafariKeys Extension/Resources/{content,background}.js`.

## Code rules

- **Keep files around 250 lines or less.** Split by responsibility (mode handlers, collectors, command dispatch) rather than growing a god module.
- **DRY.** Shared helpers live in small modules (`browser.js`, `keys.js`, `palette.js` `toNavigableUrl`, …). Do not copy Escape handling, URL normalization, or `browser ?? chrome` fallbacks.
- **Keymap.** Add bindings in `extension/src/mappings.js`. Update `HELP_SECTIONS` in the same file, then the Usage tables in the README. `HELP_SECTIONS` is what `?` shows.

## Adding a command

1. Map keys → command name in `DEFAULT_MAPPINGS`.
2. Describe it in `HELP_SECTIONS`.
3. Implement in `commands.js` (page) or `tab-commands.js` (tabs / navigation).
4. If the command enters a mode, add it to the matching set in `modes.js` (`HINT_COMMANDS`, `PALETTE_COMMANDS`, insert, or `help`).
5. Cover the pure logic with a Vitest case when you can (keymap, clickable collection, scroll math, palette ranking).

## Tests

```bash
npm test          # Vitest
npm run test:watch
```

Swift tests: Product → Test in Xcode, or the `SafariKeysCoreTests` target.

Prefer testing exported functions (`scrollDelta`, `collectClickable`, `paletteItems`, …) over the bundled IIFE.

## Pull requests

- Rebuild (`npm run build`) so Resources stay in sync if you change JS.
- Do not commit `DerivedData/`, `node_modules/`, provisioning profiles, or other signing artifacts. Set the Development Team in Xcode; do not paste certificates into the repo.
- Keep the PR focused; say how you verified (tests, and which sites if you changed hints or scrolling).
