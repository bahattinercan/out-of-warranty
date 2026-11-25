# UI Theme — Phased Implementation Plan Across All Interfaces

> Historical Implementation Record: The comprehensive visual overhaul following this theme is tracked under [`design-redesign-plan.md`](./design-redesign-plan.md).

Source specifications & locked decisions: [`ui-theme-plan.md`](./ui-theme-plan.md).
This document breaks down the systematic application of the industrial design language across every interface surface into numbered, file-level steps.

Status: **Phases 1–5 Fully Implemented** (verified via 703/703 + 165/165 test suites).

---

## 1. Normative Design Standards (Global)

Established and locked in Phase 2; applied consistently across all UI implementations:

| Standard | Specification |
|---|---|
| K-FONT | Direct string assignment to `ctx.font` is forbidden; use `uiTitleFont(px)` (Russo One — headers/buttons ≥14px) or `uiTextFont(px, weight?)` (Chakra Petch — body default **600 SemiBold**, tags/buttons/accents `700`). `"Segoe UI"` exists strictly as fallback. |
| K-FIT | Text inside cards/panels must pass through `_fitTextLines(ctx, text, maxWidth, pt, fontFn, maxLines, minPt)`. |
| K-PANEL | Menu cards, buttons, and panels render via `_csPanel(ctx, x, y, w, h, opts)`: chamfered corners + metallic gradient + rivets + optional `hazardTop`. `_csRoundRect` is restricted to micro-elements (ammo badges, skill pills). |
| K-HOVER | Hover state: 2px upward translation + `#ffe45e` border + `_csGlow`. Click hitboxes (`_xxxRects`) remain stationary. |
| K-COLOR | Palette contract: background `#0f1720→#1a2430`, border `#3b526b`, accent `#ffe45e`, gold `#d8a72f`, positive `#63e6be`, negative `#ff7b7b`. Selected states preserve semantic colors (green=selected, red=restricted). |
| K-BEHAV | Changes are strictly visual; zero gameplay state machine or input flow mutations. `node tests/run.js` must pass on every commit. |

---

## 2. Surface Inventory (Full UI Scope)

| # | Interface Surface | Location | Status |
|---|---|---|---|
| 1 | Mode Selection | `game.js > renderModeSelect` | ✅ Phase 2 |
| 2 | Difficulty Selection | `renderDifficultySelect` | ✅ Phase 2 |
| 3 | Opponent Count | `renderBotCountSelect` | ✅ Phase 2 |
| 4 | Player Count | `renderCountSelect` | ✅ Phase 2 |
| 5 | Character Selection | `renderCharSelect` | ✅ Phase 3A |
| 6 | Arena Selection | `renderMapSelect` | ✅ Phase 3A |
| 7 | Modular Workshop | `renderWorkshop` + `_drawWorkshopBranch` | ✅ Phase 3B |
| 8 | Shared Back Button | `drawBackButton` | ✅ Phase 2 |
| 9 | Wind Shift Banner | `game.js` wind notification | ✅ Phase 5 |
| 10 | HUD Header (DOM) | `index.html #hud`, `style.css` | ✅ Phase 4 |
| 11 | Audio Panel (DOM) | `#audio-control` | ✅ Phase 4 |
| 12 | Match Results Card (DOM) | `#overlay .overlay-card` | ✅ Phase 4 |
| 13 | Weapon Drawer (DOM) | `#weapon-panel`, `.weapon-chip` | ✅ Phase 4 |
| 14 | Footer Controls (DOM) | `footer#controls` | ✅ Phase 4 |
| 15 | Storage Warning (DOM) | `#storage-warning` | ✅ Phase 4 |
| 16 | Power Bar (DOM) | `#power-bar` | ✅ Phase 4 |
| 17 | Floating Combat Text | Damage numbers, skill names (`skills.js`) | ✅ Phase 5 |
| 18 | Combat Bottom Bar (DOM) | `#battle-bar`, `#battle-actions`, `.act-slot` | ✅ Phase 6 |

---

## 3. Implementation Phasing

### Phase 3A — Character & Arena Selection
- **F3A-01** Replaced `_csRoundRect` with `_csPanel` (`accent: hovered ? "#ffe45e" : taken ? "#ff7b7b" : "#2a3848"`, hover lift).
- **F3A-02** Bound character nameplates to `_fitTextLines` (`CARD_W-40`, single line, minPt 11).
- **F3A-03** Skill badges retain `#ffffff0c` fill with rounded micro-corners.
- **F3A-04** Paging controls render via `_csPanel` (`rivets: false`).
- **F3B-01** Arena preview cards wrapped in `_csPanel` with `#00000066` monitor bezels.
- **F3B-03** "★ Your Unit" home arena badge styled as an accent pill.

### Phase 3B — Modular Workshop Interface
- **F3C-01** Left paged 34-robot grid styled with `_csPanel`.
- **F3C-02** Right detail workbench panel wrapped in industrial plate styling with persistent Scrap counter pulse.
- **F3C-03** Upgrade branches render with selected highlights (`#63e6be`) and assembly flash effects.
- **F3C-04** Action button supports 4 distinct visual states: Ready (green glow), Level-Gated (grey + padlock glyph `_csLockGlyph`), Insufficient Scrap (grey), and Max Tier (calm green).
- **F3C-06** Yellow hazard striping positioned at top right workbench frame.

### Phase 4 — DOM & CSS Theming (`css/style.css`)
- **F4-01** Industrial design tokens declared in `:root`: `--panel-line`, `--panel-hi`, `--panel-lo`, `--strip`, and `.industrial` (8px chamfer polygon clip-paths).
- **F4-02** Match completion overlay styled with `.industrial` card styling and corner rivet markers.
- **F4-03** Overlay action buttons adopt chamfered borders with hover glows.
- **F4-04** Weapon drawer and weapon tooltips styled with chamfered backgrounds and accent striping.
- **F4-05** HUD header elements (`#turn-banner`, `.player-info`) updated with title typography and chamfered badges.
- **F4-08** Purged legacy dead CSS rules (`#setup`, `.setup-label`, `#count-options`).

### Phase 5 — Polish, Font Scale Audits & Acceptance
- **F5-01** Audited typography sizing: increased micro-labels to 9–10px Chakra 700 to prevent text compression artifacts.
- **F5-02** Audited consistency: confirmed zero stray `Segoe UI` assignments outside fallback declarations.
- **F5-03** Added font asset documentation and `_csPanel` parameter tables to `README.md`.
