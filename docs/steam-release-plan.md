# Steam Publishing Plan (Out of Warranty)

> **Current Status (November 17, 2026 — Suspended / Parked per User Decision):**
> The Steam release has been officially parked for this release cycle. Current priority is focused on itch.io closed beta testing followed by web portal releases (CrazyGames and Poki) under a portal-first strategy. Native desktop packaging (Electron/NW.js), Steamworks achievements, cloud saves, and Steam Direct administrative onboarding ($100 fee, partner setup) are not being initiated at this time. This document is retained for architectural reference.

Date: September 24, 2026  
Status: Architectural planning specification — execution suspended.

Multiplayer Update (October 8, 2026): Selected star topology with player-authoritative hosting, Steam lobbies, and friend invites. Technical milestones are documented in the [Multiplayer Architecture Plan](./multiplayer-plan.md). Electron is the recommended container candidate for desktop builds.

## 1. Core Objective

Package the browser-based HTML5 Canvas build (`index.html` + vanilla JS modules) into a self-contained desktop binary for commercial release on Steam, enabling peer-to-peer online multiplayer through Steam Friends integration.

Summary Financial & Operational Parameters:
- **$100 Steam Direct Fee** per application (refundable once gross revenue crosses ~$1,000).
- **30% Valve revenue share** on net sales.
- Typical timeline: **2–4 weeks** covering partner account verification, tax review, store page approval, and build review.

## 2. Codebase Audit for Desktop Packaging

| Dimension | State | Packaging Assessment |
|---|---|---|
| Asset Loading | Sequential `<script>` tags, zero bundlers | Packager targets `index.html` directly; operates cleanly under `file://` |
| Viewport & Canvas | Fixed 960×540 internal canvas, CSS scaled | Desktop window scalable to arbitrary dimensions (e.g. default 1280×720) |
| Audio Synthesizer | Pure Web Audio API synthesis (`js/audio.js`) | Zero remote audio fetches; autoplay unlocks on initial input |
| Typography | Local WOFF2 fonts (`fonts/`) | Bundled locally; zero network CDN dependencies |
| Fullscreen | `⛶ Fullscreen` toggle + `F` hotkey | `requestFullscreen` functions out of the box; Alt+Enter/F11 tested for Steam standards |
| Networking | Pure WebRTC / Loopback | Desktop build maps to Steam Networking Sockets and Steam Matchmaking |
| Distribution Size | Repo assets ~6.5 MB (~1 MB code/fonts) | Total depot with Electron container: ~100–180 MB |

## 3. Administrative Milestones (Steamworks)

- [ ] **1. Steamworks Partner Enrollment** — partner.steamgames.com.
- [ ] **2. Identity & Tax Verification** — Banking information (SWIFT), W-8BEN declaration.
- [ ] **3. Legal Agreements** — Steam Distribution Agreement (SDA).
- [ ] **4. Steam Direct Fee** — $100 per application.
- [ ] **5. App ID Creation** — Genre: Action / Turn-Based Tactics; target platform: Windows x64.
- [ ] **6. Store Presence** — Store graphical capsules (§6), localized copy, tags, and system specs.
- [ ] **7. Age Rating & Content Survey** — Cartoon violence disclosure.
- [ ] **8. Build Pipeline** — Depot uploads via `steamcmd` (§5 F4) and Valve build review.
- [ ] **9. Release & Pricing** — Base pricing tier and "Coming Soon" store page launch.

## 4. Container Technology: Electron vs. NW.js

The game avoids proprietary browser-only APIs and executes cleanly in both environments:

| Consideration | NW.js | Electron |
|---|---|---|
| Integration | Direct `index.html` + `package.json` | Requires `main.js` window lifecycle management |
| Build Tooling | `nw-builder` | `electron-builder` (mature ecosystem, automated code signing) |
| Steam Overlay | Proven via Greenworks | Supported; requires specific Chromium flags |
| Steam API Bridge | Greenworks (legacy) | `steamworks.js` (actively maintained Node-API wrapper) |
| Footprint | ~100–120 MB | ~150–180 MB |

**Current Recommendation:** **Electron** provides superior lifecycle management, strict preload context isolation, and modular native bindings via `steamworks.js`.

## 5. Technical Phasing

### Phase 1 — Standalone Packaging PoC (Offline Desktop Executable)
- Configure `electron-builder` distribution scripts.
- Implement minimal `main.js` and isolated `preload.js`.
- Produce Windows x64 executable.
- Validate menu flows, audio muting, fullscreen toggling (`F`), and bot skirmishes within the desktop window.
- Verify canvas scaling across HiDPI display scaling tiers (100%, 125%, 150%).

### Phase 2 — Desktop UX Hardening
- Application icon bundling (`.ico`).
- Window size constraints and minimum aspect ratio clamping.
- Window blur lifecycle policies (pausing vs. continuous background execution during bot turns).
- Mouse cursor lock / clamp boundaries during aiming.

### Phase 3 — Steamworks API Integration
- Integrate `steamworks.js` with `steam_appid.txt` local stubbing.
- Verify Steam Overlay functionality (Shift+Tab).
- Implement initial achievement set (First Victory, Arsenal Master, Scrapyard Veteran).
- Evaluate Steam Cloud synchronization for local profile saves.

### Phase 4 — Steam Pipe Deployment Pipeline
- Configure `steamcmd` build scripts (`app_build_<appid>.vdf` + `depot_build_<appid>.vdf`).
- Automated headless upload scripts for release depots.

## 6. Store Presence Asset Specifications

| Graphic Asset | Resolution (px) | Count | Purpose |
|---|---|---|---|
| Header Capsule | 460×215 | 1 | Mandatory; primary listing banner |
| Small Capsule | 231×87 | 1 | Mandatory; search list thumbnail |
| Main Capsule | 616×353 | 1 | Mandatory; featured sales widget |
| Library Capsule | 600×900 | 1 | Steam Client library card |
| Library Header | 920×430 | 1 | Steam Client game details banner |
| Library Hero | 3840×1240 | 1 | Steam Client hero background |
| Community Icon | 184×184 | 1 | Community hub icon |
| Screenshots | 1920×1080 | 5–20 | In-game action captures with UI |
| Gameplay Trailer | 1920×1080 mp4 | 1+ | 30–60 second dynamic gameplay reel |

## 7. Package Exclusions

**Included in Build Depot:**
- `index.html`
- `css/`
- `js/`
- `fonts/`
- `assets/`
- `LICENSE` and `THIRD-PARTY-NOTICES.md`

**Excluded from Distribution Archive:**
- Test harnesses and probes (`tests/`, `probes/`, `_*.html`)
- Internal documentation (`docs/`)
- Tooling scripts (`tools/`)
- Git tracking (`.git/`)
