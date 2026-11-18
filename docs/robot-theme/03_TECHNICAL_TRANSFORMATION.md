# Technical Transformation Plan

## 1. Preserved Architectural Contracts

- The game launches and runs directly by opening `index.html` via `file://`.
- No ES modules, `import`/`export` keywords, build tools, or npm dependencies.
- Existing script execution order in `index.html` remains intact; new scripts load before `game.js`.
- Native canvas internal resolution remains fixed at `960×540`.
- The `kind` and `params` contracts for character skills remain untouched during the visual overhaul.
- Ballistic physics, bot AI heuristics, and terrain destruction logic remain cleanly decoupled from theme rendering.

## 2. Migration Strategy

The thematic transformation was executed across two distinct layers:

### Layer A — Safe Surface Transformation
- Preserve internal character `id` values and catalog array ordering.
- Refactor `label`, skill `label`/`desc`, color definitions, and rendering paths to robotic counterparts.
- Map pairings and test fixtures continue resolving against stable legacy `id` references.
- Interface copy transitions to industrial factory terminology.
- Vertical slice activates `visualKind: "robot"` on the initial five units, falling back to legacy renderers for the rest until full transition.
- Ensure strict fallback handling if procedural data is incomplete.

### Layer B — Internal Model Cleanup
- Migrate legacy animal IDs to lowercase ASCII model identifiers in a single coordinated refactor.
- Replace `drawExtra` hooks permanently with modular procedural attachment systems.
- Decouple arenas from character IDs into dedicated zone and archetype contracts.
- Maintain `LEGACY_CHARACTER_IDS` mapping tables where backwards persistence compatibility requires it.

## 3. File-by-File Technical Scope

### `js/characters.js`
- Roster definitions include `role`, `chassis`, `locomotion`, `body`, `attachment`, `face`, and `personality`.
- Base combat attributes (`hp`, `armor`, `dmgMult`, `skill.kind`, `skill.params`) and catalog ordering are strictly preserved.
- Legacy `id` values are retained internally to maintain save profile and netcode compatibility.

### `js/entity.js`
- Kinematics coordinate contract: `entity.y` represents the ground foot contact point, whereas robot renderer center is `cy = entity.y - entity.r`.
- Muzzle release points and physical collision radii remain independent of visual accessories.
- The chassis fits securely inside the circular collision envelope; antennas and decorative attachments read visually as non-collidable.
- Decouples visual rotations, wheel roll, and low-HP sparks from physical kinematics.
- Renders `playerTint` accents to disambiguate identical robots in mirror matches without clobbering the unit's base color identity.

### `js/skills.js`
- Preserves core `useSkill` state-machine handlers.
- Replaces legacy visual effects with high-tech module signatures:
  - Antennas, robotic appendages, induction coils, exhaust ports.
  - Acoustic resonance shockwaves for radial blasts.
  - High-frequency rotary cutters for melee strikes.
  - Optical cloaking deflectors for shields.
  - Reinforced chassis locking clamps for damage mitigation.

### `js/robots.js` (Core Procedural Renderer)
- Contains the unified `drawRobot` pipeline and helper routines for chassis, locomotion, faces, and attachments.
- Decoupled from `Entity` instances to allow identical invocation across in-match entities, character selection cards, and workshop previews:

```js
drawRobot(ctx, {
  cx, cy, r, facing, charDef,
  playerTint: null,
  timeMs: 0,
  motion: { vx: 0, vy: 0, onGround: true },
});
```

- Status overlays (shields, poison, health bars) render at the `Entity` layer outside `drawRobot`.
- Deterministic rendering: No calls to `Math.random()` or `Date.now()`. Persistent battle scarring and rivets use seeded hashes derived from `charDef.id`.

### `js/maps.js`
- Arena themes transition to factory sectors (Scrapyard, Assembly Line, Cooling Plant, etc.).
- Backdrops incorporate pipes, gantries, storage racks, and dormant hydraulic arms.
- Decorative set pieces paint directly to the offscreen terrain layer, ensuring natural erosion alongside explosive crater deformation.

### `js/terrain.js`
- Preserves heightmap generation and physical bitmasks.
- Terrain stratum textures map to stamped sheet metal, scrap heaps, frost, industrial ash, and chemical sludge.
- Collision bitmasks remain decoupled from decorative prop visuals.

### `js/weapons.js` & `js/projectile.js`
- Preserves ballistic physics, bounce multipliers, and explosive radii.
- Projectile shapes, particle trails, and detonations adopt industrial visual effects.

### `js/game.js`
- UI labels, tooltips, and victory screens reflect factory lore ("Salvage Secured", "Decommissioned").
- Character select cards render units through the shared `drawRobot` renderer.
- `startGame()` binds `playerTint = PLAYER_TINTS[i % PLAYER_TINTS.length]` to distinguish duplicate character selections.

### `js/audio.js`
- Synthesizes audio using procedural Web Audio API nodes.
- Soundscapes evoke metallic impacts, pneumatic releases, servo whines, and relay clicks.
- Preserves audio node pooling, voice budgeting, and graceful muting teardowns.

## 4. Render Pipeline Layer Hierarchy

```text
Entity.draw(ctx, isActive)
  ├─ drawShadow                 (World / Entity layer)
  ├─ drawRobot(ctx, options)    (Pure procedural renderer)
  │   ├─ drawLocomotion
  │   ├─ drawBody
  │   ├─ drawOperatorMarking
  │   ├─ drawFace
  │   └─ drawAttachment
  ├─ drawStatusEffects          (Entity state layer: shields, poison)
  ├─ drawBarsAndActiveMarker    (HUD layer: HP bar, nameplate)
  └─ drawCooldownBadge          (HUD layer)
```

## 5. Performance & Resource Boundaries

- Zero per-frame Canvas allocations or heavy object garbage generation.
- Bounded particle lifespans and pool limits.
- Balanced canvas `save()`/`restore()` matrix state tracking.
- Zero non-deterministic jitter in rendering calculations.

## 6. Verification Criteria

- Automated test execution:
  ```bash
  node tests/run.js
  node tests/audio.js
  ```
- Visual and interactive verification across menus, character cards, combat loops, and responsive viewports.
- 100% of user-facing strings free of legacy animal mascot references.
