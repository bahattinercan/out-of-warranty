# Out of Warranty — End-to-End Visual Overhaul Specification

Status: **Active Implementation — Shared design token subsystem and primary navigation flows refactored**  
Scope: Comprehensive user interface design and visual presentation across all surfaces  
Tech Stack: HTML5 Canvas + vanilla JavaScript; DOM elements in `index.html` and `css/style.css`, Canvas screens primarily rendered in `js/game.js`.

This document defines the product requirements, aesthetic guidelines, component scope, implementation roadmap, and acceptance standards for an end-to-end visual overhaul. It is an engineering plan; gameplay simulation invariants, economy balance, save schemas, and network protocols remain strictly out of scope.

## 1. Baseline Assessment

- 2D turn-based tactical artillery combat in an industrial megafactory with 960×540 Canvas, DOM HUD, and modal overlays.
- Navigation covers mode select, difficulty, player counts, robot select, arena select, combat, victory/defeat, workshop, market, tutorial, and online lobbies.
- Visual assets include robot modular sprites, biome backdrops, weapon/part icons, local WOFF2 typography, and industrial panel primitives.
- Historical specifications in `docs/ui-theme-plan.md` and `docs/ui-theme-phases.md` describe the original panel system (Russo One/Chakra Petch, chamfered steel plates, hazard hatching). This overhaul evolves that baseline toward a cleaner, more modern aesthetic without breaking existing architecture.
- Quality backed by Node.js test suites and visual verification probes (`_*.html`).

## 2. Design Objectives

1. Enable new players to grasp the core gameplay loop and start a match within seconds of launch.
2. Establish a clear visual hierarchy with one primary action, unambiguous navigation, and consistent back buttons on every screen.
3. Streamline dense economy and workshop screens with immediate readability of costs, reserves, ownership, equipped slots, and stat deltas.
4. Keep the combat HUD legible against chaotic explosions and background scenery (turn order, health, wind, aim, power).
5. Retain the charming robot personality while evolving the interface into a unified, contemporary commercial product.
6. Ensure robust responsiveness across Turkish/English localizations, compact viewports, touch devices, and low-spec hardware.
7. Implement purely visual refactors with zero impact on combat simulation, persistence schemas, or networking contracts.

## 3. Design Principles & Aesthetic Direction

### 3.1 Visual Language: Modern Industrial Operations Console
Evolves the setting into a clean **industrial operations console**. Heavy faux-metal borders, excessive rivets, and persistent hazard striping are toned down in favor of:
- Broad, layered semi-transparent dark surfaces with crisp borders and restrained depth.
- Clean typographic hierarchy emphasizing robot/arena artwork.
- Selective, high-contrast semantic accents rather than decorative noise.
- Every screen behaves as a dedicated workstation module within the same console framework.

#### Color Architecture
- Base Surfaces: Deep graphite and dark blue-grey (`#0f1720` → `#1a2430`); subtle industrial grid textures on menu layers.
- Card & Panel Surfaces: Clean, semi-transparent dark panels with subtle 1px structural framing; chamfers reserved for prominent primary cards.
- Semantic Accents: Warm amber (`#ffe45e`) for primary actions/selection; cyan (`#63e6be`) for active/positive states; crimson (`#ff7b7b`) for danger/damage. States are reinforced via iconography and text rather than color alone.
- Typography: Standardized local WOFF2 font pairings (Chakra Petch / Russo One) with full latin-ext Turkish diacritic support.
- Motion: Snappy, functional transitions adhering to `prefers-reduced-motion`; zero animations that delay player inputs or combat aiming.

### 3.2 Information Hierarchy
- Every view follows a strict visual scan: Title & Context → Active Selection / Player → Primary Action → Secondary Controls.
- Currency balances (Scrap Metal) anchor in immediate proximity to transaction and upgrade buttons.
- Gating factors (level locks, full inventory, network latency) render inline near the action trigger rather than relying on ephemeral toast notices.
- Selection cards provide high-level summaries, while adjacent detail inspectors display granular numeric deltas.
- Combat HUD elements remain unobtrusive; physical battlefield geometry remains primary.

## 4. Component & Surface Scope

### 4.1 Navigation & Main Menu
- Splash / Title Screen with live version stamps.
- Primary mode gateways (Singleplayer vs Bot, Local Hot-Seat, Online Multiplayer).
- Global access to Workshop, Munitions Market, Tutorial, and Settings.
- Unified header navigation: breadcrumb context, back navigation, audio/locale toggles.

### 4.2 Pre-Match Configuration
- Game mode selection.
- Bot difficulty and opponent count.
- Local player count (2–6 players).
- Robot selection: paged 34-robot grid, live stat comparisons, and module tooltips.
- Arena selection with animated backdrop previews and tactical summaries.
- Online lobby: room codes, seat capacity (2–6), readiness badges, invite links, and error handling.

### 4.3 Persistent Metagame Interfaces
- Modular Workshop: Robot selection, 3 progression branches (Chassis, Module, Core), Service Level/XP gauges, and Scrap costs.
- Equipment Management: 4 primary slots, 8 total equipment sub-slots, part equipping/unequipping, and compounded stat previews.
- Munitions Market: Shared ammo depot (999 cap), purchasing quantity selectors, pricing curves, and equipment parts catalog.
- Match Completion Screen: Victory/defeat cards, scrap/XP breakdown, optional rewarded ad triggers, rematch/workshop buttons.
- Storage Warning Banner: Non-intrusive notification for private browsing or storage quota errors.

### 4.4 In-Combat HUD & Auxiliary Overlays
- Canvas battlefield viewport with turn timer, active player indicator, and wind gauge.
- Bottom combat dock: Player status cards, health bars, and active turn highlights.
- Weapon selector drawer with ammo counts, module skill hotkey, and utility slots (Teleport, Grappling Hook).
- Power charging meter, ballistic trajectory indicator, and combat coach hints.
- Audio volume sliders, language selector, fullscreen toggle, and diagnostic bug report dialog (`?rapor=1`).

## 5. Implementation Phasing

1. **Phase 0 — Surface & Metric Audit:** Documented all render functions, DOM elements, interaction targets, and responsive breakpoints.
2. **Phase 1 — Aesthetic Prototype:** Established visual console prototypes across main menu, robot select, and the in-game combat HUD.
3. **Phase 2 — Shared Component Framework:** Unified design tokens across Canvas primitives and CSS utility classes (`.industrial`).
4. **Phase 3 — Navigation & Pre-Match:** Overhauled mode select, difficulty, robot picker, arena picker, and online lobby.
5. **Phase 4 — Metagame Workshop & Market:** Redesigned workshop branch upgrade panels, equipment slotting grids, and market checkout interfaces.
6. **Phase 5 — Combat HUD & Controls:** Streamlined bottom action bar layout, weapon drawer integration, and turn indicators.
7. **Phase 6 — Accessibility, Responsiveness & Polish:** Audited keyboard navigation (Enter/Space/Esc), mobile safe-area insets, high-contrast mode, and localized text line-wrapping.
8. **Phase 7 — Build Consolidation & Cleanup:** Removed dead CSS selectors, updated documentation, and verified release packaging budgets.

## 6. General Acceptance Criteria

- All interface surfaces adhere to the consolidated console visual tokens.
- Visual refinements cause zero regressions in combat physics, AI behaviors, progression schemas, netcode, or ad triggers.
- Full offline functionality maintained over `file://` with local fonts and assets.
- Responsive scaling preserves full legibility down to 700px horizontal viewports.
- All Turkish and English strings fit within designated text boundaries without truncating or overlapping adjacent badges.
- Automated gate commands (`npm run verify` / `node tests/run.js`) pass 100%.
