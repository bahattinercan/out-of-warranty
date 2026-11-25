# Closed Beta Test Report (F6) — TEMPLATE

This document serves as the **working report template**: metrics, findings, and strategic decisions are compiled here following closed beta testing (20–50 players, itch.io). Figures are populated directly from itch.io dashboard analytics, feedback forms, and `?rapor=1` diagnostics rather than estimations (`docs/plans/platforms/web-launch-plan.md` §9 K1/K2 gates).

Version: **v0.6.3** (`js/version.js`) · Date range: ____ · Testers: ____ participants

---

## 1. Executive Summary (3 Lines)

- Test Objective:
- Key Findings (1 dominant quantitative metric + 1 qualitative observation):
- Strategic Decision (Proceed / Iterate / Pivot):

## 2. Participation Funnel

| Stage | Count | Notes |
|---|---|---|
| Invitations Sent | | |
| Link Visits | | itch.io "views" |
| Matches Started | | itch.io "plays" |
| 3+ Turns Completed | | Diagnostic reports / survey entries |
| Feedback Forms Submitted | | Target ≥ 30% |

## 3. K1 / K2 Gate Metrics (§9)

| Threshold | Target | Measured | Status |
|---|---|---|---|
| Monthly Plays (or +15% WoW) | ≥ 20,000 | | |
| Day 1 Retention | ≥ 20% | | |
| Average Session Duration | ≥ 6 min | | |
| Rewarded Ad Opt-in (or "—" if standalone) | ≥ 50% | | |
| Online Disconnect Rate | < 5% | | |
| P95 Frame Time | ≤ 8 ms | | |

Decision Framework: **5–7 gates met** → feature expansion (F8/K3 Steam readiness); **3–4 gates met** → retention-focused iteration; **≤2 gates met** → maintenance mode (freeze feature development).

## 4. Top 5 Reported Issues

| # | Symptom | Frequency | Root Cause (if identified) | Disposition |
|---|---|---|---|---|
| 1 | | | | Fix / Defer / Won't Fix |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

> When pasting diagnostic snippets (`🐞 Report` / `?rapor=1`), extract only `version`, `state`, `fps`, `online`, and `log:` lines; zero personal telemetry is gathered by the game.

## 5. Technical Health Metrics

| Metric | Measured Value |
|---|---|
| Average FPS (from telemetry) | |
| Average Frame Time / P95 | |
| Online Disconnection Rate | |
| Storage/Save Corruption Reports | |
| Browser Breakdown | Chrome __ · Edge __ · Firefox __ · Safari __ · Mobile __ |

## 6. Qualitative Feedback (Direct Quotes)

- "…" (Tester #)
- "…"

## 7. Conclusions & Next Actions

- Milestone Verdict: **F7 Analytics / F8 Content Expansion / Maintenance Mode**
- Next 3 Priorities:
  1.
  2.
  3.
- Version Increment: `0.6.0 → ____` (`js/version.js` + `docs/itch-release-copy.md`)

## 8. Release Log

| Field | Value |
|---|---|
| itch.io Project URL | |
| Uploaded ZIP Archive | `dist/out-of-warranty-0.6.0.zip` (Size: ____ KB) |
| Visibility State | Restricted + password |
| Feedback Channels | itch comments + survey form: ____ |
| Testing Concluded Date | |

---

## Production itch.io ZIP & Offline Boot Verification — November 17, 2026

- Build output: `node tools/build.js` completed successfully; created `dist/out-of-warranty-0.6.0.zip`, **8,137,551 bytes**, **248 files**. Manifest: `dist/manifest-0.6.0.json`.
- ZIP extracted to temporary directory via `tools/build.js` helpers (`listZip` and `extractStored`).
- Package validation checks:
  1. **Root Assets — PASS:** `index.html`, `LICENSE`, `THIRD-PARTY-NOTICES.md`, `css/`, `js/`, `fonts/`, and `assets/` all present.
  2. **Fonts — PASS:** 8 WOFF2 files plus `fonts/LICENSE-ChakraPetch.txt` and `fonts/LICENSE-RussoOne.txt`; exactly 10 items in folder.
  3. **Exclusions — PASS:** Zero leaks of `tests/`, `docs/`, `tools/`, `probes/`, `dist/`, `.git/`, `_*.html`, stray markdown files, `assets/manifest.json`, or `assets/styles/`.
  4. **Path Resolution — PASS:** All 203 paths in `ASSET_INDEX` and all 33 script/link references in `index.html` match files in package.
- Offline Boot: Headless Chrome via CDP with network offline emulation loaded `index.html`. Canvas initialized at 1246×687 CSS pixels; screenshot saved to `dist/offline-boot.png` (**1264×705**). Pixel sampling verified **1,970 unique colors** with average center luminance of **48.31/255** (confirming non-blank/non-black render).
- Diagnostics & Error Audit: **0** `console.error`, **0** uncaught exceptions, **0** failed local asset loads, and **0** local 4xx/5xx responses.
- Interaction Check: Clicked "VS Units" menu card; pixel delta sampling confirmed **31,808 pixels changed** between frames.
- **Verdict: PASS — offline boot verified from release ZIP.** Remaining operational item: Uploading the ZIP archive to the itch.io dashboard and configuring project visibility settings.
