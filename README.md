# Safari Keys

Vim-style keyboard navigation for Safari on macOS. Inspired by [Vimium](https://vimium.github.io), built as a modern Safari Web Extension with a small SwiftUI companion app.

Press `j`/`k` to scroll, `f` to follow a link, `o` to open a URL or tab from a Spotlight-style palette, and `?` for the full cheatsheet.

- [Architecture](docs/architecture.md) — processes, settings, content-script pipeline, module map
- [Contributing](docs/contributing.md) — build, tests, file-size and DRY rules, adding commands

## Requirements

- macOS 14 or later
- Safari 17 or later
- [Xcode](https://developer.apple.com/xcode/) (to build the app)
- [Node.js](https://nodejs.org) 20 or later (to bundle the extension scripts)

Safari Keys is not on the App Store yet. You install it by building from source. A paid [Apple Developer](https://developer.apple.com/programs/) team signs a trusted local build; the same team is what you use later for App Store Connect.

## Install

### 1. Build the extension scripts

```bash
git clone https://github.com/wstolk/safari-keys.git
cd safari-keys
npm install
npm run build
```

`npm run build` writes `content.js` and `background.js` into `SafariKeys Extension/Resources/`. Xcode packages that folder into the extension.

### 2. Build and run the Mac app

1. Open `SafariKeys.xcodeproj` in Xcode.
2. Select the **SafariKeys** scheme and **My Mac**.
3. Signing (both **SafariKeys** and **SafariKeys Extension**):
   - **Paid Developer Program team (this Mac):** Xcode → Settings → Accounts → add the Apple ID for that team. Then set **Team** on both targets. Xcode downloads an Apple Development certificate, registers the App Group `group.nl.wouterstolk.safari-keys`, and signs the app. Safari keeps the extension after quit — you do **not** need **Allow Unsigned Extensions**.
   - **No team on this Mac:** Product → Run still works with ad-hoc signing, but Safari treats the extension as unsigned and hides it when Safari quits.
4. Product → Run (⌘R). The Safari Keys app window should open.

From the command line:

```bash
npm run build
xcodebuild -project SafariKeys.xcodeproj -scheme SafariKeys \
  -destination 'platform=macOS' -derivedDataPath DerivedData \
  CODE_SIGN_IDENTITY="-" build
open DerivedData/Build/Products/Debug/SafariKeys.app
```

### 3. Enable the extension in Safari

Safari does not turn Web Extensions on by itself.

1. Safari → Settings → **Advanced** → enable **Show features for web developers**.
2. If the build is ad-hoc (no Development Team): Safari → Develop → enable **Allow unsigned extensions**. Skip this when the app is signed with your Developer Program team.
3. Safari → Settings → **Extensions** → enable **Safari Keys**.
4. Grant website access. This is required or keys only work on a handful of sites:
   - In that same Extensions pane, set website access to **All Websites**, or
   - Click the Safari Keys button in the toolbar on any page and choose **Always Allow on Every Website**.

Reload open tabs after enabling. Keys do not run on `about:`, Safari internals, or the App Store.

### Temporary extension (Safari 26)

If you only want to try the content scripts without installing the app:

1. Run `npm run build`.
2. Safari → Develop → **Add Temporary Extension…**
3. Choose `SafariKeys Extension/Resources`.

Temporary extensions go away when you quit Safari.

## Usage

Focus the page (not the address bar), then use Vimium-style keys. Press `Esc` to leave insert mode or dismiss an overlay. Press `?` for the in-page cheatsheet.

### Page

| Keys | Action |
| --- | --- |
| `j` `k` | Scroll down / up |
| `h` `l` | Scroll left / right |
| `d` `u` | Half-page down / up |
| `gg` `G` | Top / bottom |
| `f` `F` | Follow a link / open in a new tab |
| `r` | Reload |
| `yy` | Copy the current URL |
| `p` `P` | Open the clipboard URL / in a new tab |
| `i` | Insert mode (type into the page) |
| `gi` | Focus the first text input |
| `Esc` | Back to normal mode |

Counts work: `10j` scrolls ten steps.

### Tabs

| Keys | Action |
| --- | --- |
| `J` `K` | Previous / next tab |
| `g0` `g$` | First / last tab |
| `t` `yt` | New tab / duplicate |
| `x` `X` | Close tab / restore last closed |
| `H` `L` | Back / forward |

### Palette

| Keys | Action |
| --- | --- |
| `o` | Open a URL, search, or jump to a tab |
| `O` | Same, in a new tab |
| `T` | Search open tabs |
| `?` | Cheatsheet |

## Settings

Safari Keys → Settings (or **Safari Keys → Settings…** from the menu bar):

- **Hint characters** — alphabet used for `f` / `F` labels (default `sadfjklewcmpgh`)
- **Scroll step** — pixels per `j` / `k`
- **Smooth scrolling**
- **Excluded sites** — one hostname per line; subdomains are included (`github.com` also matches `gist.github.com`)

Settings live in the App Group `group.nl.wouterstolk.safari-keys` (both targets). That group is created when Xcode signs with your Developer Program team. Without a team, the native handler falls back to standard `UserDefaults` and the extension uses defaults or last-cached storage.

## Develop

See [Contributing](docs/contributing.md) for layout, tests, and how to add a command.

```bash
npm test          # Vitest (keymap, hints, scrolling, …)
npm run build     # Bundle JS into SafariKeys Extension/Resources
```

After changing `extension/src/`, run `npm run build` and run the app again from Xcode (or `xcodebuild` as above). Reload the Safari tab so the new content script loads.

## Troubleshooting

**Keys work on GitHub but not elsewhere.**  
Safari granted the extension only some sites. Click the toolbar button → **Always Allow on Every Website**, then reload the tab.

**Nothing happens after a rebuild.**  
Safari caches the old content script until the tab reloads. Quit and reopen Safari Keys, then reload the page.

**Safari says the extension is unsigned.**  
Either sign with your Developer Program team (Xcode Accounts → Team on both targets → Run), or Develop → **Allow unsigned extensions** and enable Safari Keys again under Settings → Extensions. Ad-hoc builds disappear when Safari quits.

**Scrolling does nothing on LinkedIn (and similar apps).**  
Reload the tab after updating. The scroller looks for nested overflow containers, not only the document.

**`f` misses some links.**  
Reload after updating. File trees, short news headlines, and `cursor: pointer` controls are included; some widgets still only exist after the page hydrates.

## License

Private project. Not licensed for redistribution yet.
