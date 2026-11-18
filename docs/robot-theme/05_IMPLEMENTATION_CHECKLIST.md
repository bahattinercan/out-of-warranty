# Implementation Checklist

This document serves as an operational checklist tracking the thematic overhaul milestones.

> **Status as of September 21, 2026:** Core transformation complete. All 34 robots, 34 arenas, 9 factory zones, unified procedural renderer, updated interface copy, and test suites are active. `tests/run.js` (531/531) and `tests/audio.js` (17/17) pass with zero errors.

## A. Baseline Integrity

- [x] Baseline pass for `node tests/run.js`.
- [x] Baseline pass for `node tests/audio.js`.
- [x] Character counts, map counts, and skill kinds verified.
- [x] Script execution order in `index.html` logged and validated.
- [x] Confirmed zero-dependency launch over `file://`.
- [x] Mathematical combat invariants locked: base HP, armor, damage multiplier, cooldowns, and skill params.

## B. Data Modeling

- [x] Authorized `chassis` enumeration defined.
- [x] Authorized `locomotion` enumeration defined.
- [x] Authorized `body`, `attachment`, and `face` tokens defined.
- [x] Extended procedural data fields across initial vertical slice characters.
- [x] Validated fallback behavior for remaining units during staged rollout.
- [x] Established safe defaults for missing parameters.
- [x] Documented temporary retention of internal legacy IDs for backwards compatibility.
- [x] Added automated schema integrity test suites.

## C. Procedural Robot Renderer

- [x] Implemented core `drawRobot` entry point in `js/robots.js`.
- [x] Decoupled `drawRobot` from `Entity` instances using `{ cx, cy, r, facing, charDef, ... }`.
- [x] Audited code to ensure zero calls to `Math.random()` or unseeded `Date.now()`.
- [x] Wired animation loop timestamps (`Game.loop(ts)`) into render passes.
- [x] Verified renderer does not read legacy `drawExtra` fields.
- [x] Implemented dynamic drop shadows.
- [x] Implemented locomotion assemblies: wheels, springs, tracks, boots, rotors, balls.
- [x] Implemented chassis geometries: light, maintenance, experimental, and heavy.
- [x] Implemented expressive facial displays: monocular lens, dual LEDs, LED matrices, analog dials.
- [x] Implemented utility attachments: welding torches, electromagnets, stampers, turbo nozzles.
- [x] Layered `playerTint` markings independently from robot chassis palettes.
- [x] Bound muzzle alignment and facing orientation accurately.
- [x] Layered status effects (shields, poison, mitigation) on top of the entity mesh.
- [x] Verified `save()` and `restore()` balance on Canvas context state stacks.
- [x] Unified character select card and in-match combat rendering pipelines.

## D. Prototype Roster (Vertical Slice)

- [x] **FIX-8:** Toolbox chassis, dual wheels, welding torch arm, Emergency Patch module.
- [x] **MIK-0:** U-shaped magnetic chassis, polarity LEDs, Polar Barrier shield module.
- [x] **ZIP:** Helical spring assembly, idle suspension bob, Piston Leap module.
- [x] **TEK-8:** Aerodynamic monowheel, speed-linked wheel roll, Turbo Charge module.
- [x] **PRES-4:** Reinforced heavy chassis, crawler tracks, hydraulic Piston Strike module.

## E. Scrapyard Factory Zone

- [x] Atmospheric industrial sky palette.
- [x] Scrapyard terrain gradient with metallic stratum bands.
- [x] Procedural props: gears, stamped plates, wiring looms, crushed crates.
- [x] Distant scrap heap parallax silhouettes.
- [x] Terrain deformation confirmed: craters erode props and stratum layers cleanly.
- [x] Added handlers for all prop types in `PROP_DRAWERS`.

## F. User Interface & Terminology

- [x] Updated game titles and headers.
- [x] "Select Robot" selection screen.
- [x] Chassis family and tactical role tags on cards.
- [x] Retained readable, intuitive core combat terms: **Health**, **Armor**, and **Damage**.
- [x] "Select Factory Zone" arena picker.
- [x] "Salvage Secured" / "Decommissioned" victory and defeat screens.
- [x] Card layout overflow audits for long localized strings.
- [x] Keyboard focus navigation and high-contrast styling verified.

## G. Procedural Audio Synthesizer

- [x] Servo actuation audio.
- [x] Terminal relay selection clicks.
- [x] Electrostatic shield hum.
- [x] Hydraulic stamping impact sound.
- [x] Metallic impact feedback.
- [x] Complete resource teardown on mute.
- [x] Verified `node tests/audio.js` coverage.

## H. Full Roster Scale-out (34 Robots)

- [x] Maintenance family units completed.
- [x] Magnetic family units completed.
- [x] Wheeled family units completed.
- [x] Spring family units completed.
- [x] Aerial family units completed.
- [x] Industrial Heavy family units completed.
- [x] Excavation family units completed.
- [x] Experimental family units completed.
- [x] Validated uniqueness of all 34 display designations.
- [x] Validated horizontal facing symmetry across all 34 models.

## I. Factory Environments

- [x] Scrapyard, Assembly Line, Cooling Plant, Paint Shop, Storage Stacks.
- [x] Smelting Foundry, Sandblasting Bay, Sump Treatment, Gantry Terminal.
- [x] Preserved 34 arenas across the 9 visual sector palettes.
- [x] Verified high visual contrast between background layers and combat projectiles.

## J. Regression Audits

- [x] Bot skirmish end-to-end completion.
- [x] 2-player local hot-seat combat.
- [x] 6-player lobby setup and turn cycling.
- [x] Full arsenal firing and ballistic trajectory checks.
- [x] Wind deflection accuracy.
- [x] Shield and status duration ticks.
- [x] Terrain cratering, physics tunnelling, and pitfall elimination.
- [x] Audio muting and volume persistence.
- [x] Fullscreen scaling across responsive viewports.
- [x] Full pass across `node tests/run.js` and `node tests/audio.js`.
