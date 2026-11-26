# CLAUDE.md

This file contains guidelines for Claude Code (and other AI agents) working in this repository.
The primary user interaction language can be **Turkish**: code comments, documentation and UI strings have historical Turkish context, but responses and new additions should align with project needs. When interacting with the user, respond in Turkish unless requested otherwise.

## Project Summary

**New Wild Ones** is an early prototype of a turn-based 2D artillery game in the spirit of *Wild Ones* and *Worms*.
Two players (Red / Blue) play **hot-seat** (same keyboard) or online multiplayer; it features destructible terrain, wind physics, a wide variety of weapons, and active character abilities.

**Release Title:** *Out of Warranty* (Turkish interface: **Garanti Dışı**). Repository/folder names (`new-wild-ones`, `dokumhane-9`) and historical internal codenames (`Dökümhane-9`) are historical; the title shown to players is the release title (single source of truth: `js/game.js > GAME_TITLE`).
Brand identity revolves around robot **model codes** (FIX-8, MIK-0, BOM-12 …). Animal `id` values in `js/characters.js` are internal identifiers only and are never shown in the UI.

- **Technology:** HTML5 Canvas + **pure vanilla JavaScript**. The browser game has no runtime dependencies or bundler; Capacitor/npm dependencies are used only for the optional Android APK build.
- **Running the game:** Double-click `index.html` to open in any browser — zero setup required.
- **Canvas:** Fixed internal resolution of `960×540` (scaled via CSS; uses `devicePixelRatio` for HiDPI rendering).

## Commands

The browser game needs no build, lint, or package manager setup. Its optional Android wrapper uses the Android SDK and npm tooling.

```bash
# Run the game: open index.html in a browser (works over file://)
start index.html         # Windows
# or double-click the file

# Run tests (pure Node.js, zero dependencies):
node tests/run.js
node tests/market.js
node tests/audio.js
node tests/feedback.js
node tests/i18n.js
node tests/net.js       # online protocol + session (F3a)
node tests/net-state.js # online state + terrain sync (F3b)
node tests/net-integration.js # online network stack (protocol+session+state+transport)
node tests/net-game.js     # end-to-end online GAME (lobby → match → results)
node tests/net-multi.js    # 6 seats (F4): targeted WELCOME, ROOM_FULL, capacity, turns 1→6→1
node tests/net-reconnect.js # disconnect → bot takeover → rejoin same seat (F4)
node tests/portal.js       # portal bridge: provider selection + CG/Poki SDK contract (F5)
node tests/reward-ad.js    # rewarded ads: 2× Scrap at match end (F5)
node tests/release.js      # release package: scope, script order, ZIP, size gates (F6)
node tests/encoding.js     # encoding gate: UTF-8 validity, BOM and mojibake audit
node tests/seo.js          # static SEO metadata, crawler files, structured data, and language content
```

```bash
# Closed test / demo package (zero-dependency, index.html at root):
node tools/build.js --dry   # file list + size check
node tools/build.js         # produces dist/out-of-warranty-<version>.zip + manifest
node tools/build.js --mobile # produces dist/out-of-warranty-<version>-mobile.zip + manifest
```

```bash
# Optional Android debug APK (requires Android SDK platform 36 and JDK 21)
npm ci
npm run android:web  # stages only game runtime files in dist/android-web
npm run android:sync # stages web assets and syncs Capacitor Android project
npm run android:apk  # builds dist/android/out-of-warranty-debug.apk (Windows)
```

```bash
# Art pipeline (ai3090 / Z-Image). Plan: docs/plans/art/art-production-plan-ai3090.md
node tools/art.js gen --zone scrapyard --layer far --prompt "scene" --n 6
node tools/art.js pick --id bg/scrapyard-far --src art/build/scrapyard/far/cand-03-seed140034.png
node tools/art-gate.js      # schema + file + budget + index + type gates
bash ~/.pi/agent/bin/ai shot probes/_art_probe.html -o art/build/probe-art.png   # layer audit
```

```bash
# Audio: objective measurements (headless Chrome, ~70s) and listening probe
node probes/_audio_measure.js        # gates + art/build/audio-measure.json
start probes/_audio_probe.html       # menu/weapon/explosion/hit/sudden death/spatial scenes
```

Shared test harness: `tests/harness.js` (loads the game inside Node's `vm` sandbox with mock DOM).
If you write a new online test file, do not copy DOM/bundle boilerplate; import it from here.

## ⚠️ Critical Rule: Classic Scripts Only, NO ES Modules

The game MUST work when double-clicking `index.html` via `file://`. Therefore:

- **DO NOT use ES modules (`import`/`export`).** Every file is loaded as a classic `<script>`.
- Cross-file sharing is done via **global variables** (`const CHARACTERS = ...`, `class Game {}`, `function useSkill() {}` → automatically global).
- **Script execution order in `index.html` is critical** — any file must be loaded after all globals it references. When adding a new file, add the `<script>` tag in `index.html` in the correct dependency order.
- **Audio:** music and sound effects are synthesized through the Web Audio API (`js/audio.js`); keep direct `file://` launch support and avoid external runtime audio dependencies.

### Prominent Globals

| Global | Defined In | Purpose |
| --- | --- | --- |
| `CHARACTERS` | `characters.js` | Character data catalog |
| `SERVICE_LEVELS`, `resolveRobotBuild`, `calculateMatchReward` | `progression.js` | Economy constants, reward formula, derived builds |
| `loadProfile`, `saveProfile`, `purchaseUpgrade`, `grantMatchReward` | `profile.js` | Persistent profile, validation, and purchase facade |
| `AMMO_PRICES`, `buyAmmo`, `battleLoad`, `weaponBattleMax`, `getAmmoDepot`, `settleDepot` | `market.js` | Ammo pricing, shared depot (999 stock), purchases, battle-max loading, and deduction |
| `PARTS`, `buyPart`, `equipPart`, `getOwnedParts`, `drawPartIcon` | `parts.js` | Equipment catalog, unique purchases, robot slot equipping, part icons |
| `WEAPONS`, `SKILL_PROJECTILES`, `initialAmmo()`, `weaponStats`, `weaponPowerScore` | `weapons.js` | Weapon specs (base ammo + `battleMax` cap) + derived UI stats + skill projectiles |
| `MAPS`, `getMapById()`, `BIOMES`, `drawSky()` … | `maps.js` | Map themes + background layer rendering |
| `useSkill`, `drawCharExtras` | `skills.js` | Module skill behavior + character visual extras |
| `Terrain` | `terrain.js` | Destructible terrain (offscreen canvas pixel mask) |
| `Entity`, `GRAVITY` | `entity.js` | Character physics, kinematics, health, ammo, and `damage()` |
| `Projectile`, `Explosion` | `projectile.js` | Spec-driven projectiles + explosion effects |
| `Game` | `game.js` | Main state machine, game loop, rendering, input |
| `SFX` | `audio.js` | Web Audio effects, procedural music, and voice beeps |
| `I18N`, `t`, `setLocale`, `LANG_ORDER` | `i18n.js` | Localization system (source strings with overrides) |

## Architecture (File Responsibilities)

| File | ~Lines | Responsibility |
| --- | --- | --- |
| `index.html` | — | Canvas viewport, HUD, overlay, `<script>` loading order |
| `css/style.css` | — | Global styling, responsive layout, modal dialogs |
| `js/version.js` | 15 | Version stamp (`GAME_VERSION`, `GAME_CHANNEL`) — read by build tool and menus; **single source of truth** |
| `js/assets-manifest.js` | ~20 | **Generated** runtime asset index (`ASSET_INDEX`): mirrors `assets/manifest.json` because `fetch` is disallowed on `file://`. Generated by `node tools/art.js index`, verified by `tools/art-gate.js` + `tests/release.js` |
| `js/assets.js` | ~75 | Raster asset loader gate: `assetImage` (`null` if unready), `assetPreload`, `drawBackdropAsset`, `drawPreviewAsset`. **Rule:** no renderer may assume an asset is loaded; procedural fallbacks are always drawn when unready |
| `tools/art.js` · `art-prep.py` · `art-gate.js` | — | Art pipeline: generate → prepare (WebP by default; PNG for selected lossless key art) → gate audits. `assets/` holds release assets, `art/build/` holds gitignored source renders |
| `js/diagnostics.js` | ~290 | Diagnostics (F6): unhandled window errors + FPS + game/net/portal states; bug icon 🐞 (shown on `?rapor=1` or error) copies status text to clipboard (no telemetry network calls) |
| `tools/build.js` | ~250 | Release packager (F6): gathers `index.html` + `css` + `js` + `fonts` → `dist/*.zip` (STORE compression, zero dependencies) + manifest |
| `js/portal.js` | ~400 | Web portal bridge (F5): handles `?portal=crazygames|poki`, lazy SDK loading, telemetry events, rewarded & interstitial ads, room invites, `muteAudio`; silent no-op when running outside portals |
| `probes/` | 30 | Visual testing and measurement probes (`probes/_*.html`, `_walk_verify.js`); kept in separate folder to prevent leaking into release packages |
| `js/main.js` | 30 | Application entry point; initializes `Game`, binds buttons and fullscreen listeners, wires `PORTAL.init()` and ad triggers |
| `js/game.js` | ~3800 | **Largest file.** State machine (character select → map select → online lobby → combat → victory/defeat), turn and wind logic, inputs, render loop, damage distribution. Online: `updateOnlineHost`/`updateGuest`, `onlineCommand`, `beginOnlineMatch` |
| `js/characters.js` | ~53 | `CHARACTERS` (34 entries): base HP/armor/damage + data-driven `skill` spec |
| `js/progression.js` | ~330 | Pure economic logic: service level thresholds, scrap formula, `resolveRobotBuild`, skill adaptors |
| `js/profile.js` | ~330 | Profile schema (v8: shared ammo, two part loadout slots, and unlocked arena sector), validation/migration, `loadProfile`/`saveProfile`, upgrades and rewards |
| `js/market.js` | ~250 | Market economy: ammo pricing (table + power formula), depot validation (999 capacity), `buyAmmo`, match loadout caps (`battleLoad` / `weaponBattleMax`), expenditure settlement (`settleDepot`) |
| `js/parts.js` | ~700 | Equipment economy: `PARTS` catalog (6 per slot), unique `buyPart`, `equipPart` (2 sub-slots per slot), sanitization, `drawPartIcon` + 15 vector icon glyphs |
| `js/maps.js` | ~781 | Map themes, biomes, multi-layer parallax sky and background renderers |
| `js/skills.js` | ~357 | `useSkill` (ability behaviors by skill kind) + `drawCharExtras` visual appendages |
| `js/terrain.js` | ~266 | Offscreen canvas + pixel mask for 100% destructible terrain |
| `js/weapons.js` | ~243 | `WEAPONS` spec array, projectile physics constants, `SKILL_PROJECTILES` |
| `js/entity.js` | ~285 | Gravity physics, walking, aiming, health, ammo management, `damage()` |
| `js/projectile.js` | ~171 | Projectile physics (bouncing, timers, cluster splits) + explosion particles |
| `js/i18n.js` | ~165 | `I18N` dictionaries, `t()`/`setLocale()`, language tag normalization, `data-i18n` DOM translator |
| `js/audio.js` | ~380 | `SFX` — Web Audio effects + procedural music and robot voice blips |
| `js/net/protocol.js` | ~200 | Online protocol (F3a): packet validation, sequence tracking, deduplication, input freshness — pure logic, decoupled from DOM/WebRTC |
| `js/net/session.js` | ~340 | Online session (F3a): host-authoritative turns/commands, clocks, disconnect/bot takeover, cancellations; game rules injected via `rules` adapter |
| `js/net/state.js` | ~330 | Online state synchronization (F3b): snapshot capture/apply, terrain mask RLE encoding, crater history replay, state hash validation |
| `js/net/transport.js` | ~300 | Online transport (F3c/F4): loopback transport (with latency/loss simulation for tests) + PeerJS wrapper (ICE/STUN, host N-connection management, `sendTo`/`onPeerClose`) + room code generator |
| `js/net/adapter.js` | ~230 | Game ↔ Network bridge (F3c): `rules` adapter (commands → game actions), host turn/snapshot/terrain broadcasts, guest state application |
| `js/online-lobby.js` | ~800 | Online lobby screen (F3c/F4): room code display/join flow, 2–6 seat capacity, bot/disconnect badges, lazy PeerJS loading, robot picker, error overlays |
| `js/robots.js` | ~1300 | Robot rendering: deterministic Canvas vector characters and weapons, weapon/muzzle placement (`robotMuzzlePoint`), and top offset (`robotTopOffset`) |

## Data-Driven Design & Extension Points

- **Robot Rendering:** Gameplay draws every character and its weapon with the original procedural Canvas vector renderer. Rig atlases, animation sheets, and full character sprites remain available for future comparisons but are not selected in gameplay. The vector renderer works without image assets.
- **Single Source of Truth for Muzzle Geometry:** Because the proportion grammar shifts muzzle pivots, `robotMuzzlePoint(cx, cy, r, facing, aim, charDef)` **requires `charDef`**; `Entity.muzzle`, `aiCreateCandidate`, and `Game` trajectory lines pass `charDef`. The "Muzzle Alignment" group in `tests/run.js` verifies visual alignment against logic coordinates. HP bar height is similarly calculated via `robotTopOffset(charDef)` rather than fixed offsets.

Adding new content is primarily **data-driven rather than code modifications**:

- **Localization Keys:** For any new player-visible string (weapon/part/robot/map name or description), add keys to `js/i18n.js > I18N.en`: `weapon.<id>.name|special|desc`, `part.<id>.label|desc`, `char.<id>.role|skill.label|skill.desc`, `map.<id>.label|skillLabel`, or `mapzone.<zoneId>.zoneLabel`. If registered in `DATA_CATALOGS`, translation is automatically applied. `node tests/i18n.js` verifies coverage. Robot model codes (`characters > label`, `maps > forLabel`) are universal and not translated.
- **New Weapon:** Add a spec entry to `weapons.js > WEAPONS`. Behavior is interpreted by `projectile.js` according to spec fields (bounces, fuse, cluster, blast radius, speed). Define `battleMax` to specify the maximum ammunition usable in a single match (in addition to base `ammo`). Register prices in `market.js > AMMO_PRICES`; otherwise, a default formula based on `weaponPowerScore` is applied. UI stats are derived by `weaponStats`. Update the weapon table in `README.md`.
- **New Equipment Part:** Add an entry to `parts.js > PARTS`: `{ id, label, slot, desc, price, effects, icon }`. Slot must be one of `helmet/body/tool/feet`; effects utilize standard axes (`maxHpFlat`, `maxHpPct`, `armorFlat`, `staminaFlat`, `weaponDamagePct`, `powerPct`, `knockbackRedPct`, `cooldownFlat`, `moveSpeedMult`, `jumpPowerMult`). Each slot accepts `PARTS_PER_SLOT` (2) parts. If a new stat axis is introduced, update `progression.js > PART_EFFECT_KEYS` + `_partEffectTotals` + `resolveRobotBuild` and `partEffectText`. Icons must match `parts.js > PART_ICON_SHAPES`. Update `README.md`.
- **New Character:** Add an entry to `characters.js > CHARACTERS`. The `skill.kind` must match existing kinds (`heal`, `shield`, `damageReduce`, `nextShot`, `jump`, `dash`, `dig`, `glide`, `melee`, `radial`, `quake`, `spit`). If adding a new kind, add a handler branch in `skills.js > useSkill`.
- **New Map Theme:** Configured in `maps.js` biome and theme tables; each robot model is paired with a home arena.
- **Multiplayer Architecture (F3c/F4):** Lobby UI in `js/online-lobby.js`, net core in `js/net/*.js` (protocol → transport → state → session → adapter), integrated into `js/game.js` via `beginOnlineMatch`/`updateOnlineHost`/`updateGuest`/`onlineResumeSeat`. Host is authoritative; guest transmits inputs and applies host state updates. Terrain destruction is recorded on the host with rounded parameters (`terrain.recordChanges`) ensuring identical masks across peers. Command IDs are seat-namespaced (`s0-1`, `s1-1`).
  - **Lobby Capacity (2–6 Seats):** Controlled via `NET_MIN_SEATS`/`NET_MAX_SEATS`. Roster ordering strictly mirrors seat numbers (`players[i]` = seat i). `transport.send()` is a broadcast; `sendTo(peerId, ...)` targets single clients for `WELCOME`/`ACK`. Input sequences are tracked per seat (`session.inputSeqs`). Full lobbies respond with `NET_MSG.REJECT` (`ROOM_FULL`).
  - **Disconnection Handling:** Peer disconnects initiate a 12-second grace period; upon expiry, `rules.setBot` transfers control to a local `BotController`, badging the seat as **BOT**. When the player reconnects with `HELLO` + matching `seatToken`, they seamlessly re-occupy their seat: `resendStart` + terrain mask + full state snapshot are dispatched, and bot control is deactivated. Guarded by `tests/net-multi.js` and `tests/net-reconnect.js`.
  - **Local Host Freshness:** Host updates its own input timestamp (`session.touchLocalInput(0)`). Because the host does not send over-the-wire INPUT packets, failure to touch local inputs would cause movement and power charge to expire every frame.
  - **Weapon Switching over Wire:** Guest weapon selections are routed via `NET_CMD.WEAPON` (`Game.selectWeapon` / `cycleWeapon` → `_syncWeaponOnline`). Because snapshots overwrite the local `weapon` field every 100ms, local selection would otherwise be clobbered.
  - **World Dimensions Authority:** World width is host-authoritative (`648–1620px` based on aspect ratio). On mismatch, `rules.applyTerrainMask` adapts guest world size via `Game.adoptTerrainSize(w, h)` to prevent desyncs and terrain jitter.
  - **Guest Visual Interpolation:** Snapshots arrive at 10 Hz; `netApplyState({ visMs })` stores targets in `_net_<prop>` while `netAdvanceVisuals` smoothly interpolates positions every frame. Projectile specs are resolved by ID via `projectileSpecById`. Module cast animations are synchronized via `game.skillFx`.
  - **Responsive Lobby Layout:** Avoids hardcoded pixel coordinates; adapts to window aspect ratio (`648–1620px`) and offsets UI around DOM controls using `Game.resize > measureHudInsets()`.
  - **Input Events & Keyboards:** Lobby keys do not consume browser-level shortcuts (Ctrl/Cmd/Alt) so that clipboard paste (`paste` event) works for room codes. Pointer coordinates originate directly from pointer event objects rather than cached hover positions, ensuring proper touch screen and stylus handling.
- **Status Buffs & Debuffs:** Duration-based entity statuses (`nextShotMod`, `damageReduce`, `poison`, `dashAttack`, `glideTurns`) live on the `Entity` instance and tick down at turn end (`endTurn`).

## Testing & Verification

`tests/run.js` runs without dependencies: loads game modules into a clean Node.js `vm` sandbox and verifies global contracts.

- Loaded scripts: `i18n.js, audio.js, characters.js, progression.js, profile.js, parts.js, market.js, maps.js, skills.js, robots.js, terrain.js, weapons.js, entity.js, projectile.js, ai.js, game.js`. `parts.js` is included in all test suites because `profile.js` calls its sanitization routines (`sanitizeParts`/`sanitizeLoadoutShape`).
- `game.js` only interacts with the DOM inside specific method bodies, allowing safe evaluation in Node `vm`.
- Verifies: 34 characters data integrity, kind coverage, skill executions without uncaught exceptions, cooldown handling, `Entity.damage` (armor + shields + reduction), poison ticks, `applyAreaDamage` range falloff, `drawCharExtras`, progression calculations, match rewards, and victory card teardown.
- `tests/progression.js`: validates level thresholds, scrap formula, 12 skill adaptors, profile schemas, and prerequisite purchasing logic.
- `tests/market.js`: validates ammo pricing tables, shared depot limits (999), transaction rollbacks, migration from v3 to v4 shared depot, and equipment parts logic (unique purchases, loadout swapping, conflict resolution, v4→v5 migration, stat compounding).

**Always run `node tests/run.js` after touching character, skill, weapon, or damage logic; run `node tests/progression.js` after changing progression or profile code; run `node tests/market.js` after editing market or inventory systems.** Ensure all tests pass.

## Known Caveats & Operational Rules

- **Localization (F2):** Source strings in code serve as Turkish defaults; translations are registered as overrides in `js/i18n.js` (`t("key", "Default text", {vars})`). When adding UI text, write the default in code, add the English override in `i18n.js`, and run `node tests/i18n.js` (verifies coverage and prevents orphan keys). The language selector `#locale-select` fires `localechange`, which triggers dynamic DOM text updates via `data-i18n` attributes.
- **Audio:** Sound effects, menu/battle music, and result stings are synthesized by `audio.js`. Preserve the independent music mute/volume controls and retry AudioContext autoplay on user gestures. Run `node tests/audio.js` for audio tests.
- **Spatial Audio & Variation:** `SFX.shoot` and `SFX.explosion` accept horizontal panning coordinates with a central deadband. Mono output disables panning; mobile uses `0.55` depth (`SFX.spatialInfo()`). Audio concurrency is capped at 40 voices with a 4-slot priority reserve for critical events. Pitch variations use deterministic seeded jitter (±4%). Run `probes/_audio_measure.js` for automated volume/clipping audits.
- **Crater Layering & Void Filling:** Terrain destruction removes pixels using `destination-out`. To prevent background sky from shining through craters ("transparent ground holes"), `Terrain.buildVoidLayer()` places an opaque void under the surface, while `paintCraterWall` and `paintCutBands` paint layered bedrock textures along cut edges.
- **Web Portal Integrations (F5):** All external SDK interactions are quarantined in `js/portal.js`; the game loads no external SDKs when running standalone. Rewarded ads ("2× Scrap") can be claimed once per match only when an ad completes successfully (`Game.doubleMatchScrap`). Interstitial ads are throttled to a minimum 3-minute interval and only display when exiting the match results screen.
- **Script Lists Synchronization:** When adding any new JavaScript file, update all 4 lists: `index.html` script tags, `tests/run.js` FILES, `tests/harness.js` FILES, and `tests/audio.js` source array. Also append script tags to `probes/_*.html` as appropriate.
- **Art Asset Verification:** Adding art assets requires: `node tools/art.js pick` → `assets/manifest.json` + `js/assets-manifest.js`, followed by `node tools/art-gate.js`, `node tests/release.js`, and `node tools/build.js --dry`.
- **Responsive Character Grids:** Character card layouts dynamically adjust column count (6→4) and width based on viewport width (`648–1620px`) via `Game.charSelectLayout()`. Avoid static grid widths.

## Release & Versioning (F6)

Version **single source of truth**: `js/version.js > GAME_VERSION` (currently **0.6.3**, channel `yayin`).
When bumping versions, update all three locations in sync:
`js/version.js`, `docs/itch-release-copy.md`, and this line in `CLAUDE.md`.
`node tests/release.js` verifies that all three match.
Packaging command: `node tools/build.js` (automatically excludes tests, docs, tools, and probes).
Closed testing copy and checklist: `docs/itch-release-copy.md`; report template: `docs/closed-beta-report.md`.

## Coding Style & Guidelines

- Maintain comprehensive, explanatory block comments explaining *why* decisions were made.
- Execute `node tests/run.js` after any functional changes.
- Whenever new gameplay content (weapons, characters, maps, or parts) is introduced, update the corresponding tables in `README.md`.
