# Web Launch Plan — Dökümhane-9

Date: October 16, 2026 · Status: **Path A selected**; F1–F5 complete, F6 preparations finalized (package generator, version stamp, diagnostics/reporting, release copy, and report template). Next milestones are **F3c-3** (real-world network playtest across distinct networks) and **F6 release** (itch.io closed beta, 20–50 players). Details: `docs/portal-compliance.md`, `docs/itch-release-copy.md`.

Related documents:

- [steam-release-plan.md](./steam-release-plan.md) — **deferred**, gated behind Milestone K3 (see §9).
- [multiplayer-plan.md](./multiplayer-plan.md) — authoritative host simulation and match clock rules (§2, §6) are **adopted directly**; Steam lobby/SDR transport is replaced by WebRTC.
- [ui-theme-plan.md](./ui-theme-plan.md), [map-combat-layout-plan.md](./map-combat-layout-plan.md), [market-parts-plan.md](./market-parts-plan.md) — active content plans; economic models align with §8.
- [online-trial.md](./online-trial.md) — F3c-3 real-world network trial guide, checklist, and exit criteria.

---

## 1. Decision and Scope

The product launches as a **free-to-play browser game**; distribution operates via web portals; monetization centers on **rewarded video ads** and (if portal permits) optional cosmetic IAP. Dedicated server hosting, third-party account systems, and ranked matchmaking are omitted; multiplayer connects via **WebRTC P2P + authoritative host**.

| Topic | Decision |
|---|---|
| Business Model | Free-to-play web (Path A), ad-monetized |
| Distribution | itch.io (closed beta) → CrazyGames → Poki / GameDistribution |
| Networking | WebRTC DataChannel, room codes + invite links, authoritative host |
| Steam | Deferred pending Milestone K3 validation (§9) |
| Target Revenue | Realistic baseline **$30–400/month**; $1,500+/month upside scenario |
| Out of Scope (Current) | Steam/Electron packaging, Steam lobbies, ELO/ranking, accounts, cloud saves, native mobile store ports |

---

## 2. Strategic Rationale (Empirical Market Data)

| Metric | Benchmark Data | Conclusion |
|---|---|---|
| Genre Ceiling | ShellShock Live: ~1–1.8M lifetime units, ~$2.5M net, **yet October 2026 CCU is 201** (peak 1,138) | Turn-based artillery is not an infinite-retention genre; without frictionless multiplayer it stagnates |
| Direct Comparable | Artillery Royale (2017, solo indie, identical premise) → **16 Steam reviews** | Selling solo artillery games at premium pricing fails commercially |
| Steam Baseline | 2025: ~20,000 releases, median gross **$249**, 66% under $1,000, ~3% exceed 1,000 reviews | Premium Steam release is high risk for a debut project |
| Market Opportunity | "Friendslop" party games surged in 2026: Gamble With Your Friends sold 1M copies in 1 week; Golf With Your Friends 1.7–3M; ROUNDS 1.1–2.1M | Winning market positioning is "chaotic multiplayer with friends", not sterile ballistic simulation |
| Web Portal Reality | CrazyGames: 60% ad / 70% IAP rev-share; realistic $50–1,500/month; 100k plays ≈ $400/month; traffic tapers from $50/day to $5/day post-feature | Establish conservative revenue expectations; metric validation mandatory |
| Linguistic Demographics | Steam: EN 37%, zh-Hans 24%, ru 10%, es-ES 4.2%, pt-BR 3.9%, **tr 1.29%** | Localization is mandatory, not optional (§5) |

Figures derive from third-party market intelligence (VG Insights/Gamalytic/SteamSpy derivatives) and serve as order-of-magnitude indicators rather than audited financials.

---

## 3. Product Positioning and Content Guidelines

- **Elevator Pitch:** "Ten minutes of screen-sharing chaos with friends: assemble your scrap bot, dial in the trajectory, and blow your friend off the cliff."
- **Tags:** Party Game, Local Multiplayer, Turn-Based, Artillery, Physics, Casual, Couch Co-op.
- **Prohibited Phrasing:** Never market as a "Worms clone" or "prototype". Sell the *player experience and humor*, not the mechanical taxonomy.
- **Clip Rule:** Every weapon and module must generate at least one streamable comedic beat (chain reactions, cliff drops, pixel-wide near misses, self-inflicted blast damage). New content must pass this social clip test.
- **Visual Asset Pipeline:** Headless Chrome diagnostic probes (`_*_probe.html`) automate gameplay GIF and screenshot capture without manual screen recording.
- **Roster Identity (User Direction, October 12, 2026):** Roster identity relies on **industrial model codes** rather than animal personas. `characters.js`: 34 robots — player-facing identity uses **model codes** (FIX-8, MIK-0, BOM-12, ZIP, ÇİFT-6, KES-9, SİREN-6, HAYALET-4...); internal `id` fields represent animal classifications (dog, cat, bear, crocodile...); `role` denotes factory utility (Maintenance, Demolition, Cooling, Gantry Ops, Smelting...); `personality` reflects deadpan industrial defect humor ("Brake module was never delivered", "Has postponed filter change alerts for six consecutive years", "Pressure gauge permanently pinned in the red zone").
- **Title Decision (October 12, 2026, User Approved):** **Out of Warranty** — Turkish UI localized as **Garanti Dışı**. Architecture Option **A**: Brand revolves around **model codes** (FIX-8, MIK-0, BOM-12...); animal `id` strings remain internal identifiers hidden from players. Deployed in: `js/game.js > GAME_TITLE` (single source of truth for UI titles), `index.html`, README, and CLAUDE.md.

**Trademark & Collision Audit (October 12, 2026):** No active video game registered under this title on Steam; on itch.io only "Wand out of Warranty" exists (unrelated puzzle game); domain names `outofwarranty.com` / `.game` / `.io` and `garanti-disi.com` are unallocated in DNS (registrar availability to be verified).  
**Identified Risks:** (a) "Out of warranty" is a ubiquitous customer service term, yielding low search exclusivity and weak trademark defense; (b) Organic Google SEO will compete against generic technical support articles. **Mitigation:** Always deploy the brand with its **distinctive logo** and optional subtitle (`Out of Warranty: Shift-9`); rely on portal feature placement rather than organic web search.

**Evaluated Title Candidates:**

| English Candidate | Turkish Equivalent | Alignment with Roster | Availability Screening |
|---|---|---|---|
| **Out of Warranty** | **Garanti Dışı** | Collective identity: personality texts are warranty/malfunction jokes; deadpan humor fits "friendslop" tone | **No video games found → clear** |
| **Shift Nine** | **Vardiya-9** | Factory shift lineage; preserves "Foundry-9" and 9-zone worldbuilding; fits episodic updates | Clear (only unrelated in-game keyboard shortcuts) |
| **Beast Crew** | Hayvan Kadrosu | Highlights animal-machine concept | No commercial games found |
| Fault Report | Arıza Kaydı | Bureaucratic humor; updates framed as defect logs | No commercial games found |
| Unauthorized Repair | Yetkisiz Onarım | Fits theme but verbose | No commercial games found |
| ~~Scrap Squad~~ | — | — | **Taken:** itch.io (2019), Godot template, mobile game |
| ~~Loose Bolts~~ | — | — | **Taken:** itch.io arcade racer |
| ~~Rusty Rumble~~ | — | — | **Taken:** itch.io robot boss battler |
| ~~Scrap Shift~~ | — | — | **Taken:** itch.io and CrazyGames roguelite |
| ~~Industrial Animals~~ | — | — | Associated with 2016 horror film (poor brand synergy) |

---

## 4. Free Online Architecture: WebRTC P2P

**Why dedicated servers are unnecessary:** The game is turn-based with authoritative hosting. The host executes physics, while clients dispatch input packets and interpolate state snapshots (see `multiplayer-plan.md` §2 and §6). Network bandwidth is minimal (commands + 15–20 snapshots/sec) and highly latency-tolerant.

**Signaling and Room Exchange Alternatives:**

| Solution | Pricing | Pros | Cons |
|---|---|---|---|
| PeerJS Cloud | Free | Zero setup, client JS ready | No SLA, rate limits, availability risk |
| Metered Open Relay | Free Tier (TURN ~20 GB/month) | MIT SDK, bundles signaling + TURN + reconnects | Overage triggers billing requirements |
| Cloudflare Worker + Durable Objects | Free Plan | Full control, custom signaling | Requires ~150 lines custom code + account management |
| Manual Code Copy/Paste (SDP) | Zero | Zero-infrastructure failsafe | Degraded user experience, emergency fallback only |

- **NAT Traversal:** Google STUN is free. Estimated 10–20% of residential/mobile connections require TURN relay → free TURN fallback is required; if quota saturates, room joining falls back to manual SDP copy/paste.
- **Failover Strategy:** If PeerJS Cloud becomes unavailable, transition to Cloudflare Workers; game networking code remains decoupled via transport abstractions (`js/net/`).
- **Portal Compliance:** CrazyGames multiplayer guidelines require passing room metadata and invite URLs into the SDK (`docs.crazygames.com/requirements/multiplayer`). Without dedicated web servers, invitations bundle as room codes within SDK URL parameters.
- **Accepted Architectural Constraints:** Host client cheating accepted in friend games (no competitive rankings); mobile browser backgrounding pauses host simulation (delegated to bot control); 6-player matches deferred to Phase F4.

**Implementation Status:** Phase F3a complete — protocol and session core implemented under `js/net/protocol.js` + `js/net/session.js`, verified via `tests/net.js` in headless Node (101 assertions). Core generates zero localized strings; error states propagate as enum error codes translated via `t()`.

**Measured Packet Budget (Phase F3b, 6 Players, `tests/net-state.js`):** Initial full snapshot (including loadout specs): 4,087 bytes · Periodic snapshot (excluding specs): 2,519 bytes · Terrain bitmask (RLE compressed, initial sync): 1,436 bytes. Because procedural terrain generation historically used `Math.random`, bitmasks diverged across nodes; the authoritative host now compresses the initial terrain mask via RLE, streaming subsequent craters as `destroy(x, y, r)` delta events which guests simulate deterministically. Derived chassis stats (max HP, armor ratings, movement speeds) serialize only in the initial connection handshake, enforcing baseline stats across online matches.

**Phase F3c-1 (Transport):** `js/net/transport.js` implements three strategies: `LoopbackTransport` (in-memory queue with synthetic lag/loss for unit testing), `PeerJsTransport` (PeerJS cloud signaling; supports mock peer injection for headless testing), and `UNAVAILABLE` fallback (gracefully keeps offline modes playable). Room codes use 5 alphanumeric characters excluding ambiguous glyphs (0/O, 1/I), displayed as `ABC-DE`. `tests/net-integration.js` exercises end-to-end host/guest synchronization: handshake (START → mask + full state → LOADED → PLAYING), 5 synchronized turns (asserting identical state hashes on every turn), crater deformation parity, command deduplication, disconnect-to-bot handover, and recovery across packet loss.

**Phase F3c-2 (Lobby & Game Integration):** `js/online-lobby.js` renders Canvas UI for room hosting, joining by code, deep-link joins (`?oda=CODE`), slot rosters, ready states, and robot selection; PeerJS library lazy-loads on first visit to the online lobby. `js/net/adapter.js` bridges session rules into the gameplay loop: input actions (CHARGE/CANCEL/RELEASE/MODULE/JUMP/MOVE/WEAPON) translate into simulation commands, host drives fixed-step network clock (`updateOnlineHost`), turn endings broadcast `TURN`, and terrain delta events stream to clients. Guests execute visual interpolation via `updateGuest`. Aiming packets stream unreliably at 20 Hz, while firing angles and power levels bundle atomically inside `RELEASE`. Equipment upgrades remain locked in online matches (baseline loadouts), and arenas default to the host's selected character arena.

**Defects Caught and Resolved in Phase F3c-2:**
1. HUD crashes: `ONLINE_LOBBY` and `ONLINE_LOADING` states were unregistered in core HUD loops, causing `this.active` reads on empty player arrays.
2. Loading deadlocks: Host failed to emit local load acknowledgments, stalling the match in `LOADING`.
3. Command ID collisions: Client and host emitted identical command IDs ("c1"), causing hosts to drop client inputs as duplicate commands; namespaced command IDs by slot (`s0-1`, `s1-1`).
4. Terrain bitmask drift: Host carved terrain using raw float coordinates while clients received rounded integers, causing mask divergence; coordinate rounding normalized prior to carving.
5. Premature match start: Receiving `WELCOME` packets prematurely shifted guests into `LOADING`; locked to `LOBBY` until host triggers start.

**Defects Discovered and Fixed in User Playtests:**
1. **Host unable to fire:** Host inputs bypassed network queues, causing freshness checks to treat local inputs as stale and clearing active charge states every frame; fixed via `session.touchLocalInput(0)`.
2. **Lobby layout breakage on small viewports:** World width adapts down to 648 px depending on aspect ratio, but lobby code assumed 960 px, causing UI overlap; `Game.resize > measureHudInsets()` calculates safe margins dynamically, collapsing into single-column layouts on narrow screens.
3. **Room code paste failures:** Key handler intercepted `Ctrl+V` and called `preventDefault`, blocking clipboard paste events; updated handlers to bypass modifier key events, adding `_parseCode` to extract codes from full URLs.
4. **Intermittent button click failures:** Mouse coordinates read from cached `input.mouseX/mouseY` variables that remained (0, 0) on touchscreens; coordinates now derive directly from the pointer event (`Game.pointerWorld`), listening for `touchstart/touchmove/touchend` with `touch-action: none`.
5. **Role screen character switching locked:** `OnlineLobby._cycleRobot` returned early when sessions were absent, freezing selectors on the host/join selection screen; early return scoped to active lobbies.
6. **Guest weapon switching failed:** Guest weapon selections were not transmitted across the wire, causing host state snapshots to overwrite guest selections within 100 ms; added `NET_CMD.WEAPON` (`weaponId`) to protocol, bumping `NET_PROTOCOL_VERSION` from 1 to 2.
7. **Guest robot visual jitter:** Viewport widths varied across machines (648–1620 px), generating divergent procedural terrain profiles; guest now adopts the host's exact world dimensions via `Game.adoptTerrainSize(w, h)` and applies the host's raw terrain mask.
8. **Choppy guest visual movement and missing FX:** Position fields were written directly from 10 Hz snapshots without interpolation; resolved via `netAdvanceVisuals` interpolation. Weapon cluster sub-munitions and skill projectile specs were missing from weapon lookup dictionaries; resolved via `weapons.js > projectileSpecById`. Module cast FX were missing from snapshots; registered inside state serialization.

**Verification (Phase F3 Exit Gate):** Two players across different networks (one on mobile hotspot), same map, 5 complete turns; room creation <20 s; disconnect rate <5%; turn order synchronized across both viewports; reconnecting restores original slot assignments.

**Phase F4 (2–6 Player Scalability):** Core game mechanics supported up to 6 players (`MAX_PLAYERS`, 6-slot spawn pads, player color tints); networking layer completed across four components:
1. **Transport (`js/net/transport.js`):** Host tracks N connections; `send()` broadcasts, `sendTo(peerId, ...)` targets individual clients, `onPeerClose` signals drops. Host socket remains listening when guests drop, allowing rejoining. `LoopbackHub` supports multi-client automated testing.
2. **Session (`js/net/session.js`):** Monotonic input sequences managed per-slot (`inputSeqs`). Peer-to-seat mappings (`bindPeer`/`seatForPeer`), targeted snapshot streams (`sendTerrainSnapshot`, `broadcastState`), and reconnection handlers.
3. **Lobby (`js/online-lobby.js`):** Configurable capacity (2–6 seats); occupied slots cannot be removed. Match roster ordered by slot indices; full lobbies return `NET_MSG.REJECT` (`ROOM_FULL`) under Protocol v3.
4. **Disconnection and Reconnection:** Disconnections manage per-slot grace periods (12 s); expiration invokes `rules.setBot` to assign bot control (flagged with **BOT** badge in lobby). Reconnecting with valid `seatToken` reclaims original slot, terminating bot control.

Regression Suites: `tests/net-multi.js` (55 assertions: 6 seats, targeted WELCOME, ROOM_FULL handling, capacity clamping, round-robin turns 1→6→1, concurrent inputs) and `tests/net-reconnect.js` (30 assertions: lobby drops, grace-to-bot transitions, autonomous bot turns, concurrent dual disconnects, browser refresh recovery).

---

## 5. Localization

**Measured Asset Scope (October 12, 2026 Code Audit):**

| Source | Unique Text Strings |
|---|---|
| Canvas `fillText` (`js/*.js`) | 57 |
| Data Catalogs (`characters` 136, `maps` 69, `parts` 48, `weapons` 40) | ~293 |
| `game.js` DOM Strings (`textContent`/`innerHTML`) | 29 |
| `index.html` Static DOM Elements | 13 |
| **Total Localization Volume** | **785 unique keys, including 238 dynamic catalog keys** |

Audit confirms localization is an achievable 1–2 day engineering task.

**Current Implementation Status:** The localization system supports Turkish, English, Simplified Chinese, Russian, Spanish (Spain), and Brazilian Portuguese. `js/i18n.js` contains 785 entries per translated locale, including all 238 dynamic catalog keys. `tests/i18n.js` checks required-locale key parity and interpolation placeholders. Translation strings were machine-assisted, then terminology and placeholders received an assistant review; player feedback remains part of release validation.

**Language Rollout Sequencing:** F2a (`tr` + `en`), F2b (`zh-Hans` + `ru`), and F2c (`es-ES` + `pt-BR`) are implemented. Additional languages (`pl`, `id`, `de`, `fr`) remain future candidates based on portal traffic demographics.

**Implementation Rules:**
1. Text lookups route through `t("key")`; data catalogs define `labelKey`/`descKey` mappings.
2. Active language persists in user profile; defaults to `navigator.language` on first visit.
3. Automated test assertions verify identical key cardinality across translation dictionaries, guarding against missing translations or orphan keys.

---

## 6. Combat Readability Enhancements

**Acceptance Criteria:** (1) Robot silhouettes contrast cleanly against backdrops in grayscale, (2) Active unit is recognizable at a glance, (3) Health bars and status states are readable from a distance, (4) Minimum font size is ≥11 px in DOM and ≥12 px in Canvas, (5) Combat plane avoids high-frequency background patterns.

**Milestone R1 (Implemented October 12, 2026):**
- `js/maps.js`: Reduced building window density (0.45 → 0.30) and darkened window luminance; added soft darkening gradient across the active combat band (H × 0.40–0.86).
- `js/entity.js`: Expanded health bars (34×5 → 40×6 px) with dark borders; added colored team rings beneath robot chassis matching HUD player cards.
- `css/style.css`: Increased HUD typography sizes and added text drop-shadows.

**Milestone R2 (Implemented October 12, 2026):**
- `js/robots.js`: Applied `RB_VISUAL_SCALE = 1.10`, increasing rendered sprite dimensions by 10% while keeping physical collision radii (`Entity.r`) untouched. Single source of truth updates both `drawRobot` and `robotMuzzlePoint` to keep barrel alignment perfect.
- `js/entity.js`: Scaled stride distance proportionally with visual scale to prevent foot sliding.

---

## 7. Portal Distribution Matrix

| Portal | Technical Requirements | Rev-Share | Operational Notes |
|---|---|---|---|
| itch.io | Max 1,000 files / 500 MB total | Voluntary donations | Optimal platform for rapid closed testing |
| CrazyGames | Full Launch via SDK; initial payload <50 MB (mobile <20 MB); iframe embedding | 60% Ads / 70% IAP | Room metadata and invite links routed through SDK |
| Poki | 16:9 fixed canvas; desktop + mobile support; SDK integration; initial payload <50 MB | Custom contractual terms | Player Fit Test → Web Fit Test → 2–3 week soft launch |
| GameDistribution | Syndicated web distribution | ~33% | Long-tail web traffic |
| Yandex Games | Max 100 MB unpacked | Proprietary ads/IAP | Regional focus (Eastern Europe / CIS) |

Rollout Schedule: **itch.io Closed Beta (20–50 players)** → **CrazyGames Basic** → KPI Validation → **CrazyGames Full Launch + SDK Ads** → **Poki Application**.

---

## 8. Ad Placement Strategy and Unit Economics

- **Core Revenue Driver: Rewarded Video Ads.** Placement: Double scrap rewards post-match ("2× Scrap") and single-use revives during elimination. Max 1–2 voluntary views per match. Ads grant progression convenience, never competitive advantages.
- **Interstitial Ads:** Triggered exclusively between matches, capped at once every 3 minutes. **Zero banner ads** (banner eCPMs of $0.20–1.50 do not justify visual clutter).
- **Pro Forma Revenue Formula:** `Plays × Opt-in Rate (50–65%) × Blended eCPM ($8–12) ÷ 1,000 × Developer Share (60%)`. 100,000 plays yields ≈ **$400/month**, representing a strong baseline for a debut web release.

---

## 9. KPI Gates and Performance Milestones

Evaluated **8 weeks post-launch**:

| # | Metric | Data Source | Milestone K1 Threshold |
|---|---|---|---|
| 1 | Monthly Game Plays | Portal Analytics | ≥20,000 **or** weekly growth ≥15% |
| 2 | Day 1 Retention | In-game Telemetry | ≥18% |
| 3 | Matches per Session | In-game Telemetry | ≥2.5 |
| 4 | Average Session Length | In-game Telemetry | ≥4 minutes |
| 5 | Multiplayer / Invite Rate | In-game Telemetry | ≥8% |
| 6 | Rewarded Ad Opt-in Rate | Ad Network SDK | ≥50% |
| 7 | Technical Stability | Automated Probes & Error Telemetry | Disconnects <5%, 95th percentile frame time ≤8 ms, zero portal rejects |

**Decision Gates:**
- **5–7 thresholds met** → Expand content pipeline and trigger Milestone K3 (Steam preparations).
- **3–4 thresholds met** → Retention optimization only (halt new maps/modes; refine first 60 seconds of onboarding).
- **≤2 thresholds met** → Enter maintenance mode; freeze feature development.

**Milestone K2 — Financial Gate (Month 3):** 3-month trailing average ≥$150/month → continue active live-ops; <$50/month → freeze development budget, transitioning to passive hosting.

**Milestone K3 — Steam Port Gate:** ≥100,000 cumulative portal plays **and** ≥5,000 wishlists **and** D1 retention ≥20% → activate `steam-release-plan.md` (zero financial investment prior to clearing this gate).

**Sunset Rule:** If after 12 weeks monthly plays remain <5,000 and D1 retention is <10%, freeze feature additions and archive as portfolio work.

---

## 10. Phased Delivery Roadmap

| Phase | Scope | Deliverable | Verification |
|---|---|---|---|
| **F1** (Complete) | Combat Readability R1 (background noise, HP bars, team rings, HUD typography) | Engine modifications | `node tests/run.js` (1109 tests), `tests/maps.js` (960 tests), visual probe screenshots |
| **F1b** (Complete) | Combat Readability R2 (visual scale 1.10 + stride phase synchronization) | `robots.js`, `entity.js`, `tests/run.js` | `node tests/run.js` passing aim and stride test groups; visual probe verification |
| **F2** (Complete) | Localization framework (`js/i18n.js`) and UI translation | i18n engine, localized menus, `tests/i18n.js` | `tests/i18n.js` 78/78 assertions; zero missing translation keys |
| **F3a** (Complete) | Headless multiplayer protocol and session state machine | `js/net/protocol.js`, `js/net/session.js` | `node tests/net.js` 101/101 assertions |
| **F3b** (Complete) | Snapshot capture/restore and terrain delta replication | `js/net/state.js`, `tests/net-state.js` | `node tests/net-state.js` 53/53 assertions |
| **F3c-1** (Complete) | Transport abstractions (PeerJS + Loopback) and integration tests | `js/net/transport.js`, `tests/net-integration.js` | `node tests/net-integration.js` 43/43 assertions |
| **F3c-2** (Complete) | Canvas lobby UI, deep-linking, and game loop wiring | `js/online-lobby.js`, `js/net/adapter.js` | `node tests/net-game.js` 123/123 assertions + headless browser probes |
| **F3c-3** (Pending User) | Real-world network playtest across separate networks (`docs/online-trial.md`) | Field test report | 5 complete turns, room creation <20 s, drop rate <5% |
| **F4** (Complete) | 2–6 player scalability, room codes, bot handover | Multi-client session & reconnect logic | `tests/net-multi.js` 55/55 assertions + `tests/net-reconnect.js` 30/30 assertions |
| **F5** (Complete) | Portal SDK bridge, rewarded ad hooks, telemetry events | `js/portal.js`, `tests/portal.js` | `tests/portal.js` 46/46 assertions + `tests/reward-ad.js` 19/19 assertions |
| **F6** (Ready) | Closed beta (20–50 players, itch.io) → public web demo | Build generator (`tools/build.js`), version stamping, diagnostics UI | `node tests/release.js` 46/46 assertions; clean headless bundle validation |
| **F7** | Milestone K1 metrics collection and review | Evaluation report (`docs/olcum-YYYY-MM.md`) | Audited metrics against §9 criteria |
| **F8** (Conditional) | Content expansion / Steam Milestone K3 launch | Desktop wrappers & Steamworks integration | Unlocks only if Milestone K1 clears ≥5 criteria |

---

## 11. Risk Matrix and Mitigations

| Risk | Probability | Mitigation Strategy |
|---|---|---|
| Niche genre fatigue | High | Position around social "friendslop" party dynamics (§3); emphasize short funny clips |
| P2P NAT connection failures | Medium | Free TURN fallback; clear error reporting on room connection screens |
| Traffic drops post-portal featuring | High | Design for sustainable organic retention (K1 criteria); avoid relying on temporary launch spikes |
| Free TURN bandwidth saturation | Medium | Monitor bandwidth consumption; migrate to Cloudflare Workers if quotas approach limits |
| Localized text overflow (DE/RU) | Medium | Automated string measurement via `ctx.measureText` in headless test suites; dynamic font scaling |
| Solo developer bandwidth constraints | High | Timebox development phases to ≤1 week each; prioritize retention over excessive content volume |

---

## 12. Architectural Decisions and Current Status

**Approved Decisions (October 12, 2026):**
1. **Game Title:** **Out of Warranty** (Turkish: **Garanti Dışı**); Model codes (FIX-8, MIK-0...) represent outward brand identity.
2. **Monetization:** Voluntary rewarded video ads for double scrap rewards and single revives; zero banner ads.
3. **Signaling Infrastructure:** PeerJS Cloud with free TURN relay, maintaining modular transport interfaces to support Cloudflare Workers if needed.
4. **Performance Thresholds:** Milestone K1 targets 20,000 monthly plays or 15% weekly growth.
5. **Localization Schedule:** Turkish + English at launch, followed by Simplified Chinese, Russian, Spanish, and Brazilian Portuguese.
6. **Execution Status:** Phases F1–F5 complete, Phase F6 package tooling ready; awaiting user-driven real-world playtesting (F3c-3) and closed beta deployment on itch.io.
