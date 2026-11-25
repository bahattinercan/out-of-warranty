# Release Readiness Audit

## Current Candidate — 0.6.3 (2026-11-25)

| Check | Result |
|---|---|
| Public release stamp | `0.6.3 / yayin` (`js/version.js`) |
| Automated verification | `npm.cmd run verify` passed, including art, game, feedback, localization, mobile, network, release, encoding, and package dry-run gates. Art palette checks emitted 12 non-blocking warnings. |
| Feedback browser check | Chrome opened `index.html` through `file://`; desktop (1280×900) and mobile (390×844) dialog, form input, category/rating selection, copy feedback, and Escape dismissal passed; 0 console errors. |
| Package dry-run | Desktop and mobile: `0.6.3 / yayin`; 444 files each, 69,394.7 KB extracted; both gates passed. |
| Mobile layout | Chrome touch emulation at 915×414 and 844×390; compact top controls and zero D-pad/battle-bar overlap. Visible mobile control targets measure at least 44×44 CSS px. |
| Build artifacts | `dist/out-of-warranty-0.6.3.zip` (71,123,290 bytes) and `dist/out-of-warranty-0.6.3-mobile.zip` (71,123,318 bytes); 444 entries each. Both archives and manifest CRCs verified; mobile archive booted from `file://` with profile enabled and 0 console errors. |
| itch.io package limits | Within itch.io's current HTML5 limits: fewer than 1,000 files, under 500 MB extracted, and no individual file above 200 MB. See [itch.io HTML5 upload requirements](https://itch.io/docs/creators/html5#zip-file-requirements). |
| itch.io project | No project page exists yet. Create a new HTML Game page, upload the archive, set closed-beta access, then verify the hosted embed. The archive has not been published. |
| Public game page | `https://bahattinercan.github.io/out-of-warranty/` — GitHub Pages publishes the repository root; verify the live build after deployment. |
| Hosted privacy policy | `https://bahattinercan.github.io/out-of-warranty/docs/privacy-and-data.html` and `https://bahattinercan.github.io/out-of-warranty/docs/privacy-en.html`. |
| Channel decision | **Public GitHub Pages release.** itch.io has no project page; CrazyGames/Poki remain outside this release. |

The sections below record the previous `0.6.0` audit and its measurements; they do not describe the current candidate.

## Objective & Scope

Evaluated the release readiness of the current build in the Out of Warranty repository. Code, version stamps, release channels, and test specifications were preserved. All automated gate suites were executed independently; `python tests/art-prep.py` was executed alongside `node tests/encoding.js` as an encoding integrity gate.

## Quality Gate Verification Matrix

| Gate Command | Exit Code | Summary Output |
|---|---:|---|
| `node tools/art-gate.js` | 0 | `Total: 2005  •  ✓ Passed: 2005  •  ✗ Failed: 0` |
| `node tests/robot-rig.js` | 0 | `Robot rig: 34 models, all weapons, dual facings, 7 angles, 3 recoil poses passed.` |
| `node tests/run.js` | 0 | `All tests passed ✅` (1455 passed, 0 failed) |
| `node tests/i18n.js` | 0 | `i18n: 125 passed, 0 failed` |
| `node tests/mobile.js` | 0 | `mobile: 15 passed, 0 failed` |
| `node tests/net-integration.js` | 0 | `Total: 51  •  ✓ Passed: 51  •  ✗ Failed: 0` |
| `node tests/release.js` | 0 | `Total: 59  •  ✓ Passed: 59  •  ✗ Failed: 0` |
| `node tests/encoding.js` | 0 | `encoding: 219 passed, 0 failed` |
| `node tests/net-game.js` | 0 | `Total: 125  •  ✓ Passed: 125  •  ✗ Failed: 0` |
| `node tests/net.js` | 0 | `Total: 101  •  ✓ Passed: 101  •  ✗ Failed: 0` |
| `node tests/net-state.js` | 0 | `Total: 53  •  ✓ Passed: 53  •  ✗ Failed: 0` |
| `node tests/net-multi.js` | 0 | `Total: 55  •  ✓ Passed: 55  •  ✗ Failed: 0` |
| `node tests/net-reconnect.js` | 0 | `Total: 30  •  ✓ Passed: 30  •  ✗ Failed: 0` |
| `node tests/portal.js` | 0 | `Total: 46  •  ✓ Passed: 46  •  ✗ Failed: 0` |
| `node tests/reward-ad.js` | 0 | `Total: 19  •  ✓ Passed: 19  •  ✗ Failed: 0` |
| `node tests/market.js` | 0 | `373 passed, 0 failed` |
| `node tests/progression.js` | 0 | `All progression tests passed ✅` (180 passed, 0 failed) |
| `node tests/audio.js` | 0 | `Audio tests: 31/31 passed` |
| `node tools/build.js --dry` | 0 | `version: 0.6.0 (kapali-test) · 248 files · 7914.9 KB` |
| `python tests/art-prep.py` | 0 | `Ran 2 tests in 1.576s` / `OK` |

## Distribution Package Measurements

`node tools/build.js --dry` reported **7,914.9 KB across 248 files** in the earlier audit; the local dry-package gate is now **500 MiB (512,000 KiB)**. This paragraph records the earlier measured build, not the current workspace package. External upload limits are channel-specific and must be checked before publishing. The package bundles root `LICENSE` (2,722 bytes) and `THIRD-PARTY-NOTICES.md` (5,180 bytes), along with `fonts/LICENSE-ChakraPetch.txt` and `fonts/LICENSE-RussoOne.txt`.

## Channel Readiness Matrix

| Platform / Requirement | Status | Verification & Evidence |
|---|---|---|
| itch.io — Self-Contained ZIP | READY (AWAITING UPLOAD) | `tools/build.js:24-27, 200-215` bundles game code and root licenses; 248 files / 7,914.9 KB. |
| itch.io — Version & Channel Stamp | VERIFIED | `js/version.js:10-11` (`0.6.0` / `kapali-test`); mirrored in build manifest. |
| itch.io — Store Copy & Tags | VERIFIED | `docs/itch-release-copy.md:1-24, 31-59` specifies closed beta descriptions, tags, and controls. |
| itch.io — Offline Standalone | VERIFIED | Offline boot verified from release ZIP with 0 errors (see `docs/closed-beta-report.md`). |
| CrazyGames — SDK Integration | VERIFIED | `js/portal.js:1, 14-16, 29, 137-170` features CrazyGames v3 provider, loader, and initialization. |
| CrazyGames — Telemetry Hooks | VERIFIED | `js/portal.js:235-250` `gameplayStart/Stop` toggled cleanly on game states. |
| CrazyGames — Mute / Fullscreen | VERIFIED | SDK `muteAudio` listener wired in `js/portal.js:160-163`; fullscreen handled via `js/settings.js`. |
| CrazyGames — Rewarded Ads | VERIFIED | `js/portal.js:275-300` rewarded SDK calls wired to 2× Scrap match bonuses. |
| CrazyGames — Size Budget | VERIFIED | 7,914.9 KB < 8 MiB (8,192 KB), maintaining a **277.1 KB safety margin**. |
| Poki — SDK Integration | VERIFIED | `js/portal.js:18, 30, 76-77, 170-174` Poki v2 detection, SDK init, and `gameLoadingFinished`. |
| Poki — Telemetry Hooks | VERIFIED | `js/portal.js:235-250` maps Poki `gameplayStart/Stop` events cleanly. |
| Poki — Mute / Fullscreen | VERIFIED | Mute and fullscreen contracts verified; SDK bridge tests pass. |
| Poki — Rewarded Ads | VERIFIED | `js/portal.js:291-299` `PokiSDK.rewardedBreak()` wired to 2× Scrap bonus. |
| Local dry-package gate | VERIFIED | 500 MiB (512,000 KiB) ceiling; re-measure with `node tools/build.js --dry`. |
| Steam — Desktop Port | PARKED | `docs/plans/platforms/steam-release-plan.md` marked parked per user decision; deferred until web portal rollout. |
| Steam — Native Wrapper | PARKED | Electron/NW.js desktop container initialization deferred. |
| Steam — Store Graphics | PARKED | Marketing assets exist in `art/marketing/`; Steamworks uploads deferred. |
| Global — Hosted Privacy Policy | READY (AWAITING PAGES) | `docs/index.md`, `docs/privacy-en.md`, and `docs/github-pages-deployment.md` committed (commit `df6f4e6`). |
| Global — In-Game Credits & Licenses | VERIFIED | In-game Settings > Credits & License dialog documents roster, fonts, and licensing. |
| Global — License Git Tracking | VERIFIED | Root `LICENSE`, `THIRD-PARTY-NOTICES.md`, and font licenses tracked in git (`437e27d`). |
| Global — Encoding Gate | VERIFIED | `tests/encoding.js` checks UTF-8 validity, BOM, and mojibake signatures (219/219 passed). |
| Global — Localization Coverage | VERIFIED | `node tests/i18n.js` exit 0 (125 passed, 0 failed). |
| Global — Mobile / Touch Controls | VERIFIED | Touch input handlers verified (`tests/mobile.js`: 15/15 passed). |
| Global — Diagnostics & Telemetry | VERIFIED | F6 crash report generator copies diagnostics locally to clipboard; zero telemetry tracking. |

## Blocker Triage

### P0 — Critical Blockers
- **Public Hosted Privacy Policy URL (Awaiting Pages Activation):** Documents (`docs/index.md`, `docs/privacy-en.md`, `docs/github-pages-deployment.md`) are committed. Navigating to repository **Settings > Pages > Deploy from branch (`main`, `/docs`)** activates the live HTTPS URL. Required prior to CrazyGames and Poki submissions.
- **Steam Platform Strategy (Parked):** Desktop Steam release tasks are parked per user decision and do not block web/itch releases.

### P1 — Pre-Release Operational Tasks
- **itch.io Dashboard Upload:** Release ZIP verified via offline headless boot; manual dashboard upload and project visibility configuration remain open.
- **Poki Audio Bridge Verification:** Concluded in test suites; live sandbox smoke test scheduled upon build upload.
- **Version/Channel Stamp:** Retaining `0.6.0` and `kapali-test` (`js/version.js:10-11`).

## GO / NO-GO Verdict per Channel

- **itch.io — GO (Closed Beta):** Build packager (`tools/build.js`), page copy (`docs/itch-release-copy.md`), version tag (`0.6.0 / kapali-test`), and verified ZIP archive ready (8,137,551 bytes / 248 files, offline boot verified).
- **CrazyGames — CONDITIONAL NO-GO:** SDK v3, gameplay telemetry, mute/fullscreen, and rewarded ads fully functional; package is 277.1 KB under the 8 MiB limit. Condition: Enabling GitHub Pages to host the live privacy policy URL.
- **Poki — CONDITIONAL NO-GO:** Poki v2 SDK init, gameplay telemetry, rewarded breaks, and package size verified. Condition: Enabling GitHub Pages privacy policy hosting and completing platform dashboard submission.
- **Steam — PARKED / NOT APPLICABLE:** Suspended by user direction; out of scope for the current web-focused milestone.
