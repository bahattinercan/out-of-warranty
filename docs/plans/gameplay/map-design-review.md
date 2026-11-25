# Map Design Review & Architectural Audit

Date: September 23, 2026  
Superseded / Detailed by: [Tactical Combat Layout Plan for 34 Arenas](./map-combat-layout-plan.md).

## Scope & Limitations

This document audits the procedural terrain generation, prop scattering, and map selection card rendering across the game's arenas. Analysis is grounded in source code architecture and mathematical data representations.

## Root Architectural Flaws Identified

Historically, `buildCharacterMaps` in `js/maps.js` generated arenas based solely on a character's assigned zone and skill archetype. 34 records produced only 21 unique zone/archetype pairings. Across six major clusters, 19 maps shared identical palettes, prop pools, and heightmap templates:

- Assembly / Arena: MIK-0, SİREN-6, DÖNER-5.
- Storage / Open: BOM-12, PERÇİN-3.
- Paint / Open: ÇİFT-6, CİV-1.
- Storage / Arena: PRES-4, TOK-2, SIZ-7, HAYALET-4.
- Gantry / Arena: KES-9, EMP-80, REZ-7.
- Treatment / Arena: SAP-3, KEPÇE-8, VUR-5, PUNTA-1, DALGA-2.

While accent colors and procedural noise shifted slightly, arenas lacked unique architectural identities, signature environmental set pieces, or bespoke tactical routes. Map titles frequently duplicated zone names rather than designating unique locations.

## Shared Technical Observations

1. `Terrain.buildProfile()` layered high-frequency pseudo-random noise over six generic archetypes. Shifting topography degraded player mastery of learned arena layouts.
2. Initial heightmaps occupied a single continuous column height from surface to viewport bottom, precluding floating platforms, overhangs, or underpasses without bespoke pixel bitmask carving.
3. Map selection cards rendered generic approximations (`_previewProfile`) rather than actual combat heightmaps.
4. Preview props across six zones defaulted to identical generic cuboid glyphs.
5. Decorative props were scattered procedurally and excluded from collision bitmasks, creating visual ambiguity where non-collidable crates appeared as physical cover.
6. Player spawn flattening historically assumed static 18%/82% positions, whereas live matches distributed entities across 12%–88% ranges.

## 34-Map Tactical Design Matrix

| Index / Code / Unit | Legacy Flaw | Proposed Location | Tactical Geometry & Signature Feature |
|---|---|---|---|
| 01 · HS-01 · FIX-8 | Scrapyard/bastion; generic basin | Maintenance Pit | Central sunken service pit, flanking ramp and stepped terrace. Massive overhead floodlight. |
| 02 · MH-02 · MIK-0 | Assembly/arena duplicate | Magnetic Crossover | Twin plateaus joined by a narrow, destructible bridge. Colossal U-magnet backdrop. |
| 03 · DR-03 · BOM-12 | Storage/open duplicate | Pressure Tank Farm | Wide central expanse flanked by three distinct low bunkers. Heavy pressure vessels. |
| 04 · ST-04 · ZIP | Cooling/vertical duplicate | Glacial Terraces | Stepped ascending terraces with a low-ground bypass route. |
| 05 · BA-05 · ÇİFT-6 | Paint/open duplicate | Twin Spray Booths | Staggered elevation booths separated by a wide clearing. |
| 06 · DR-06 · PRES-4 | Storage/arena duplicate | Stamping Plaza | Low-slung arena basin fed by elongated access ramps. Giant hydraulic press frame. |
| 07 · DY-07 · KES-9 | Gantry/arena duplicate | Shearing Wharf | Stepped cantilevered platforms over a lower maintenance conduit. |
| 08 · AA-08 · SAP-3 | Sump/arena duplicate | Elbow Manifold | Elevated side bluff with a winding lower corridor. Giant elbow pipe fixture. |
| 09 · AA-09 · KEPÇE-8 | Sump/arena duplicate | Settling Basin | Broad dry basin floor bordered by terraced retaining dikes. |
| 10 · DR-10 · TOK-2 | Storage/arena duplicate | Calibration Benches | Three low, wide workbenches creating distinct micro-combat pockets. |
| 11 · AA-11 · VUR-5 | Sump/arena duplicate | Filter Terraces | Opposing inclined terraces descending to a central drainage trench. |
| 12 · AA-12 · PUNTA-1 | Sump/arena duplicate | Welding Concourse | Elongated catwalk with a narrow central barrier. |
| 13 · DR-13 · SIZ-7 | Storage/arena duplicate | Obsolete Filter Stacks | Sunken lateral pockets flanked by a high central causeway. |
| 14 · DY-14 · EMP-80 | Gantry/arena duplicate | Transformer Substation | Raised central mesa providing high ground at the expense of exposed silhouette. |
| 15 · MH-15 · SİREN-6 | Assembly/arena duplicate | Klaxon Tower | Asymmetrical high/low platforms linked by wide industrial stairs. |
| 16 · DY-16 · REZ-7 | Gantry/arena duplicate | Echo Hangar | Shallow basin interrupted by a central line-of-sight crest. |
| 17 · MH-17 · DÖNER-5 | Assembly/arena duplicate | Centrifuge Bowl | Concave bowl with stepped perimeter walls. |
| 18 · AA-18 · DALGA-2 | Sump/arena duplicate | Sump Discharge Weirs | Three stepped horizontal weirs over drainage collection sumps. |
| 19 · ST-19 · KRİYO-7 | Cooling/arena duplicate | Cryo Tank Field | Distant opposing bluffs over a depressed central transit line. |
| 20 · DO-20 · ŞOK-9 | Smelting/bastion duplicate | Bedrock Foundry Bed | Thick bedrock foundation capable of withstanding heavy seismic impacts. |
| 21 · DY-21 · TEK-8 | Flattened corridor | Gantry Launchway | Elongated flat straightaway terminating in an ascending launch ramp. |
| 22 · HS-22 · BİLYE-3 | Wheeled duplicate | Scrap Raceway | Staggered short flats bisected by a shallow debris trench. |
| 23 · DR-23 · KANCA-4 | Lacks vertical shelves | High-Bay Racking | Multi-tiered racking with clear lower corridors and fragile upper shelves. |
| 24 · KU-24 · ZIP-X | Generic vertical | Sandblasting Dune | Prominent central sand ridge flanked by stepped ascents. |
| 25 · MH-25 · VIZIR | Obscured ventilation theme | Overhead Catwalks | High leftward service platform descending to broad lower landing zones. |
| 26 · KU-26 · MAT-6 | Homogeneous terrain | Sub-Surface Conduit | Massive central earthwork encouraging subterranean tunneling routes. |
| 27 · HS-27 · ZIRH-2 | Generic arena | Armor Plate Bunker | Reinforced angled bulkhead shields protecting opposing dugouts. |
| 28 · DR-28 · HAYALET-4 | Shared bunker duplicate | Inspection Corridor | Staggered baffle walls rewarding tactical flanking. |
| 29 · DO-29 · FIRIN-3 | Generic open layout | Furnace Crucible Rim | Flanking slag platforms overlooking a central molten basin. |
| 30 · ST-30 · SOĞUT-2 | Generic open layout | Coolant Manifolds | Twin hollows bifurcated by an elevated cooling spine. |
| 31 · DR-31 · PERÇİN-3 | Storage duplicate | Freight Stacks | Flat base supporting three distinct vertical cargo piers. |
| 32 · BA-32 · CİV-1 | Paint duplicate | Fastener Sorting Rig | Compact central island flanked by deep lateral collection bins. |
| 33 · HS-33 · FAN-5 | Generic open layout | Intake Screening Bed | Depressed central grating flanked by inclined air filtering banks. |
| 34 · DY-34 · ASİT-6 | Gantry duplicate | Container Washdown | Four staggered container plinths with wide drainage runoffs. |

## Acceptance Standards for Visual & Mechanical Distinctiveness

- Every arena must display a unique title, signature landmark, and identifiable terrain silhouette.
- Silhouettes must remain visually distinct even in monochromatic threshold tests.
- Card previews and live matches must execute identical procedural geometry.
- Tactical mobility skills should provide distinct utility without being strictly mandatory for traversing terrain.
- Clear visual differentiation between physical collidable terrain and background scenery.
