# Robot Theme Roadmap

## Phase 0 — Design Lock

Objective: Finalize the shared visual, mechanical, and narrative direction prior to executing codebase modifications.

Deliverables:
- [x] World premise and core design pillars.
- [x] Chassis taxonomy and family classifications.
- [x] Detailed specifications for initial 5 vertical slice units.
- [x] Mapping table for the nine factory zones.
- [x] Complete 34-character transition matrix.
- [x] Release branding and title finalized (*Out of Warranty / Garanti Dışı*).
- [x] Silhouette reference sheets.
- [x] Palette keys for the Scrapyard biome.

Acceptance Criterion: The five prototype robots are immediately distinguishable by pure black silhouette, with specialized modules identifiable by physical hardware tooling.

## Phase 1 — Vertical Theme Slice

Objective: Validate the end-to-end thematic experience within a live, playable combat match before scaling across the entire game.

Scope:
- Units: FIX-8, MIK-0, ZIP, TEK-8, and PRES-4.
- Arena: Scrapyard factory zone.
- Character selection cards and tactical tooltips.
- Visual FX for five tactical module abilities.
- Industrial terminal UI styling and layout.
- Procedural audio pass for servos, forcefields, and hydraulic impacts.

Acceptance Criteria:
- Five vertical slice robots fully playable in live combat.
- Zero legacy biological sprite fragments on prototype robots.
- Remaining 29 characters continue rendering reliably via legacy fallback paths.
- Silhouettes distinct within 48×48px preview cards.
- Core ballistics, turn sequences, and mathematical balance remain 100% identical.
- Scrapyard terrain deforms cleanly with procedural craters.
- 100% automated test suite pass rate.

## Phase 2 — Full Roster Scale-out

Objective: Convert the remaining 29 characters using the procedural modular assembly system.

Work Packages:
- Industrial heavy and close-quarters combat units.
- Radial area-of-effect and harmonic resonance units.
- High-mobility wheeled, ball-bearing, and spring units.
- Support, armor reinforcement, and repair units.
- Experimental units deploying specialized interior ordnance.

Acceptance Criteria:
- All 34 robot display designations are unique.
- Units within identical chassis families are disambiguated by locomotion gear and utility tools.
- Zero biological animal references on character cards.
- Every skill kind verified in interactive test scenarios.

## Phase 3 — Factory World Architecture

Objective: Transform the original nine biomes into cohesive industrial sectors of FOUNDRY-9.

Deliverables:
- Nine dedicated zone color palettes.
- All 34 arenas preserved and categorized under the nine visual palettes.
- Minimum three signature industrial props per zone.
- Parallax horizon silhouettes and layered terrain stratum bands.
- Arena cards displaying sector codes and tactical archetypes.
- Industrial atmospheric particle effects (embers, steam vents, ash, oily droplets).

## Phase 4 — Arsenal, Audio & UI Cohesion

Objective: Eliminate legacy stylistic friction across weapon catalogs, sound effects, and menus.

Deliverables:
- Industrial re-theming of weapon descriptions.
- Consistent procedural vector icon glyphs.
- Audio synthesizer presets for servos, hydraulics, arcs, and alarms.
- Localization strings updated across menus, HUD, victory cards, and tooltips.

## Phase 5 — Internal ID Refactoring & Documentation

Objective: Clean technical debt and legacy identifiers retained for prototype backwards compatibility.

Deliverables:
- ASCII model designations established as primary display codes.
- Deprecation of obsolete `drawExtra` legacy dispatch trees.
- Documentation, architecture diagrams, and comments aligned with the robotic universe.

## Risk Register & Mitigations

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| Units look indistinct | Dilutes roster diversity | Prioritize silhouette geometry over color; enforce proportion grammar |
| Mechanics alter during reskin | Obscures balance regressions | Freeze numeric constants during aesthetic passes |
| Rendering complexity bloats | Performance dips on low-end machines | Enforce pure Canvas modular pipeline with zero runtime allocations |
| Stale asset links break | Game fails to load | Maintain zero-dependency classic `<script>` architecture |
