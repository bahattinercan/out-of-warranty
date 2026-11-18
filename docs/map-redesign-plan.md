# Industrial Arena Design and Implementation Plan

Status: The original six arenas and host-controlled online selection are implemented. The runtime roster has since expanded to 14 arenas; the map picker paginates the cards. Additional layouts and art are tracked in [map-combat-layout-plan.md](map-combat-layout-plan.md).

## Objective

Maintain a set of visually and tactically distinct arenas. Each map features its own location premise, terrain silhouette, and signature environmental centerpiece. Map selection is fully decoupled from character selection; all 34 robots can be played across every arena.

Classic *Wild Ones* aesthetics serve as a benchmark for tactical diversity: varied biomes, pronounced terrain silhouettes, and immediate thematic readability. Visual assets, names, and geometries are not copied. *Out of Warranty*'s gritty, charming industrial aesthetic is preserved, tailoring color schemes and atmospheric lighting to each biome.

## The Six Arena Concepts

| ID | Location | Terrain & Gameplay Archetype | Signature Landmark |
| --- | --- | --- | --- |
| `furnace` | Molten Foundry Basin | High flanking ramps with a narrow, deep central slag basin | Massive casting ladle and molten slag culvert |
| `crane_yard` | Midnight Gantry Yard | Stepped rooftops and suspended platforms navigated via vertical jumps | Industrial gantries and an unfinished tower |
| `reactor_garden` | Overgrown Reactor Core | Low sunken trench flanked by towering defensive embankments | Bio-mechanical vines entwining a cooling tower |
| `moon_scrapyard` | Lunar Debris Field | Jumping trash heaps, low-gravity feel, continuous sub-trench route | Shattered satellite dish and crawler excavator |
| `ice_rift` | Glacial Chasm | A lethal, bottomless crevasse dividing opposing cliffs | Jagged ice walls and luminous rift glow |
| `flooded_lab` | Flooded Cleanroom | Perimeter containment walls with destructible interior glass partitions | Overturned test containment vat and observation deck |

Environmental liquids, lava pools, and aesthetic hazards do not inflict arbitrary collision damage; unless explicitly spec'd as a core combat mechanic, they remain evocative cosmetic set pieces.

## Architecture & Modifications

- `js/maps.js` maintains 14 fixed `MAPS` definitions independent of robot selection.
- The map card removes `forChar`, `forLabel`, and robot ownership callouts. Cards showcase arena title, tactical summary, and a backdrop preview.
- `js/online-lobby.js` previously bound maps to host character selection. The host now explicitly selects from the six arenas; lobby state and match packets broadcast the chosen `mapId`.
- `js/net/session.js` carries `mapId`. `NET_PROTOCOL_VERSION` checks prevent legacy mismatch crashes.
- `js/terrain.js` supports procedural surface heightmaps, plateaus, and floating geometry masks.
- Arena titles and tactical tips are localized in `js/i18n.js` and referenced in `README.md`.

## Implementation Phases

### 1. Design Matrix & Greybox Atlas
Define surface contours, solid/void masks, 6 spawn points, and primary lines of sight within a 960×540 viewport. Review side-by-side in a greybox atlas. Silhouettes must remain recognizable in thumbnail silhouette tests.

### 2. Geometry Validation
`furnace` serves as the testbed for steep basin geometry, while `moon_scrapyard` tests disjointed/floating platforms. Confirm 2–6 player spawns, reliable foot movement, standard weapon arcs, and crater traversability. Bots must not get trapped in dead-end geometry.

### 3. Vertical Visual Slice (Two Arenas)
Develop comprehensive art assets for `furnace` and `moon_scrapyard` (far/mid backdrops, ground textures, decor, and cards). Robots and projectiles must pop against backdrops; decorative elements must not look like collidable terrain.

### 4. Remaining Four Arenas
Batch-produce remaining arenas using shared modular kits. Landmark assets, compositions, and terrain silhouettes remain distinct per arena.

### 5. Lobby & Localization Integration
Local map picker paginates the 14 arena cards. In online lobbies, the host picks the arena while guests view real-time updates. Host room packets communicate `mapId`.

### 6. Gameplay & Visual Acceptance
Inspect all 14 maps in active combat. Verify spawn safety, robot/projectile contrast, destruction geometry, bot pathfinding, and netcode synchronization. Procedural fallbacks render seamlessly if assets are missing.

## Target Files

- Map specifications and renderers: `js/maps.js`, `js/terrain.js`.
- Local map select and defaults: `js/game.js`.
- Online selection and lobby: `js/online-lobby.js`, `js/net/protocol.js`, `js/net/session.js`.
- Art pipeline: `js/assets.js`, `assets/manifest.json`, `js/assets-manifest.js`, `tools/art.js`, `tools/art-prep.py`, `tools/art-gate.js`.
- Localization and docs: `js/i18n.js`, `README.md`.
- Automated test suites: `tests/maps.js`, `tests/run.js`, `tests/i18n.js`, `tests/net-game.js`, `tests/net-state.js`, `tests/release.js`.

## Acceptance Criteria

1. `MAPS` contains 14 records; IDs are unique and independent of character IDs.
2. All 14 arenas feature distinct gameplay silhouettes in geometry tests.
3. Safe ground spawns for 2–6 players with adequate head clearance.
4. Rendered terrain, collision mask, and destruction craters align with sub-pixel precision.
5. Local selection offers 14 paginated cards; all 34 characters can fight in any arena.
6. Host picks map; guests see updates; matches start with matching `mapId`.
7. Full English & Turkish localization in `i18n.js`.
8. Asset budget and packaging tests pass cleanly.
9. Tactical diversity: ice rift has a fatal pitfall, flooded lab features interior cover.
