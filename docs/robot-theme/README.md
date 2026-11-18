# Robot Theme Transformation — Master Plan

Date: September 17, 2026  
Last Implementation: September 21, 2026  
Status: Core theme transformation fully implemented and verified via automated test suites.

## Vision

Retain the classic turn-based artillery mechanics while replacing legacy animal mascots with a distinctive robotic universe.

> In the abandoned industrial megafactory **FOUNDRY-9 (DÖKÜMHANE-9)**, discarded service units battle in automated arena protocols to salvage the critical spare parts needed to stave off permanent shutdown.

The goal is far deeper than painting metallic textures onto existing sprites. Character selection, module skill names, arenas, weapon styling, interface typography, and sound design must coalesce into a unified aesthetic.

## Design Pillars

1. **Readable Silhouettes:** Each robot is instantly recognizable by its chassis geometry and locomotion system.
2. **Mechanical Personality:** Functional attachments visually explain character stats and tactical modules.
3. **Charming Scrap:** Gritty and industrial, but never grimdark or overly sterile.
4. **Modular Architecture:** Shared chassis families and attachment sockets eliminate the unsustainable cost of hand-crafting 34 bespoke sprites.
5. **Gameplay Integrity:** Ballistics, turn order, bot AI, and weapon physics must remain completely unaffected throughout the overhaul.

## Documentation Structure

- [01_WORLD_AND_ART_DIRECTION.md](./01_WORLD_AND_ART_DIRECTION.md): World lore, visual language, factory zones, UI, and audio direction.
- [02_CHARACTER_SYSTEM.md](./02_CHARACTER_SYSTEM.md): Chassis families, the initial vertical slice roster, and the 34-robot transformation matrix.
- [03_TECHNICAL_TRANSFORMATION.md](./03_TECHNICAL_TRANSFORMATION.md): File-by-file architectural changes, data contracts, and verification strategy.
- [04_ROADMAP.md](./04_ROADMAP.md): Phasing, deliverables, acceptance criteria, and technical risks.
- [05_IMPLEMENTATION_CHECKLIST.md](./05_IMPLEMENTATION_CHECKLIST.md): Granular execution checklist.
- [06_ROBOT_PROGRESSION_SYSTEM.md](./06_ROBOT_PROGRESSION_SYSTEM.md): Scrap economy, Service Levels, progression branches, persistence schemas, and implementation roadmap.

## Finalized Decisions

- Core thematic universe: **FOUNDRY-9 (DÖKÜMHANE-9)**.
- Aesthetic tone: "Charming, weathered, gritty industrial".
- Cast identity: Repurposed industrial maintenance units rather than biological animals.
- Compositional hierarchy: Chassis Family + Locomotion Base + Utility Rig + Visual Personality.
- Initial slice verified via **FIX-8, MIK-0, ZIP, TEK-8, and PRES-4** on the Scrapyard arena, then scaled across the full 34-unit roster.
- Preserved existing `CHARACTERS` ordering, base stats, skill mechanics, and internal IDs during phase 1.
- All 34 characters transitioned to the shared modular Canvas renderer; legacy IDs are retained strictly for persistence backwards compatibility.
- Factory zones define visual color palettes across arenas.
- Retains zero-dependency, classic `<script>`, and `file://` execution standards.

## Scope Exclusions

The initial transformation scope explicitly excludes:
- Real-time online netcode.
- Cloud profiles, premium currencies, or loot boxes (local Scrap economy is specified in [06_ROBOT_PROGRESSION_SYSTEM.md](./06_ROBOT_PROGRESSION_SYSTEM.md)).
- Replacing the physics engine or introducing external game frameworks.
- Global weapon re-balancing.
- Asset loading pipelines with remote binary dependencies.
- Touch/mobile virtual d-pads.

## Implementation Milestones Achieved

- All 34 robots spec'd with chassis, locomotion, facial features, utility tools, accent colors, and personality markers.
- Character select cards and live combat rendering unified under a single pure-Canvas procedural renderer.
- UI, HUD, tactical modules, and victory cards transitioned to industrial nomenclature.
- Player team colors decoupled from robot chassis colors, ensuring high readability during mirror matches.
- Automated test suites pass 100%.
