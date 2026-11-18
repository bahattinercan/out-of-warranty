# World & Art Direction

## 1. Lore & Setting

**FOUNDRY-9 (DÖKÜMHANE-9)** is a city-scale automated industrial complex whose original manufacturing purpose has been lost to time. Its human creators vanished long ago, yet the automated central governing system continues executing maintenance routines in perpetuity.

As maintenance units degrade, they requisition replacement components. Facing depleted warehouse stock, the central overseer activated an archaic contingency: the **ARENA ALLOCATION PROTOCOL**. The victor of each combat cycle earns priority salvage rights to scarce spare parts.

These machines are not seeking world conquest. One unit merely seeks a functional headlamp to replace a burnt-out bulb; another needs fresh grease for a rusted wheel hub; another desperately strives to complete an obsolete work order that was never assigned. These modest stakes imbue the roster with relatable charm and humor.

## 2. Aesthetic Tone

### Desired Atmosphere

- Charming and expressive without feeling juvenile or sterile.
- Industrial and utilitarian without descending into grimdark dread.
- Comedic, while honoring the poignant absurdity of each unit's plight.
- High visual readability accommodating chaotic explosions and terrain deformation.

### Explicit Anti-Patterns

- Merely attaching metallic textures onto biological animal ears, tails, and paws.
- Reducing characters to simple color swaps of a monolithic round chassis.
- Photorealistic rust overlays, murky backdrops, and low-contrast palettes.
- Cluttering surfaces with tiny micro-details that obscure incoming projectiles.
- Derivatively cloning the silhouette or facial identity of copyrighted pop-culture robots.

## 3. Visual Language

### Shape Hierarchy

- Agile & Lightweight Units: Circles, ovals, and sweeping curved arcs.
- Balanced Service Units: Rounded squares, chamfers, and trapezoids.
- Heavy Industrial Units: Broad rectangular slabs, thick reinforced struts, low center of gravity.
- Hazardous Tooling: Sharp triangular profiles reserved exclusively for drills, buzzsaws, warning hazard stripes, and high-voltage arcs.

### Materials & Textures

- Stamped automotive sheet metal.
- Dense matte rubber tires, boots, and shock bumpers.
- Machined brass and copper hydraulic fittings.
- Luminous plasma power cores and LED status indicators.
- Battle wear: scuffs, localized dents, weld beads, and mismatched salvage replacement panels.

Characters feature a maximum of three core materials and a single primary emissive accent. Small viewport readability demands value separation over complex color noise.

### Palette Strategy

- Player team colors do not overwhelm the unit; team hue is applied to antenna beacons, shoulder rank insignias, or energy core auras.
- Chassis livery preserves character identity across the selection screen.
- Active states (shields, corrosive poison, damage resistance) read distinctly across all robot palettes.
- Background parallax layers remain lower in saturation than combat entities.

### Environmental Scale Cues

To emphasize that these robots are compact maintenance units, environmental backdrops feature:

- Massive industrial bolts and hex nuts.
- Giant conveyor rollers.
- Rough unfinished weld beads.
- Exaggerated industrial hazard safety placards.
- Cable raceways towering several times the height of a robot.
- Immense, dormant hydraulic robotic arms looming in the background.

## 4. Facial Displays & Personality

Faces utilize expressive industrial telemetry rather than mimicked human features:

- Single Monocular Lens: Focused, analytical, or stoic units.
- Dual Status Lamps: Curious, cheerful, or energetic units.
- LED Dot-Matrix Arrays: Emotes shifting through alphanumeric matrix patterns.
- Analog Dial Gauges: Veteran, heavy, or vintage pneumatic units.
- Glitching CRT Monitors: Unstable, quirky, or volatile units.

Personality is conveyed through antenna tilt, chassis lean, idle gyroscopic sway, and suspension oscillation.

## 5. Factory Zones

The original nine biome environments translate into thematic factory sectors. `MAPS` assigns an arena to each character, maintaining 34 arenas categorized under nine distinct visual zones:

| Factory Zone | Visual Identity | Terrain & Decorative Props | Legacy Biome |
|---|---|---|---|
| Scrapyard | Muted turquoise sky, oxidized rust heaps | Gears, stamped plates, cabling, crushed chassis | meadow |
| Assembly Line | Cold blue-grey, hazard caution stripes | Conveyor belts, robotic weld arms, parts bins | city |
| Cryo Cooling Plant | Pale cyan, high-pressure steam, frost | Pipe manifolds, valves, frozen storage tanks | snow |
| Paint Shop | Vibrant overspray, tinted skylights | Spray drums, paint drips, stenciled masking jigs | autumn |
| Storage Stacks | Deep olive-drab, towering vertical silhouettes | Pallets, shipping crates, barcodes, forklift tracks | forest |
| Smelting Foundry | Ash black, intense incandescent orange glow | Slag crucibles, glowing ingots, blast furnace gates | volcano |
| Sandblasting Bay | Warm beige haze, matte eroded surfaces | Grit hoppers, dust filters, pneumatic tanks | desert |
| Sump Treatment | Toxic acid green, iridescent oily runoff | Chemical drums, drainage grates, pipe leakages | swamp |
| Gantry Terminal | Warm sunset amber, colossal gantry cranes | Cargo shipping containers, chains, lifting spreaders | savanna |

## 6. UI Vocabulary & Terminology

| Legacy Term | Updated Term |
|---|---|
| Select Character | Select Robot |
| Character Skill | Tactical Module |
| Health / HP | Health (retained for clarity) |
| Armor | Armor (retained for clarity) |
| Damage | Damage (retained for clarity) |
| Player | Operator |
| Select Map | Select Factory Zone |
| Turn | Turn / Shift Cycle |
| Victory | Salvage Secured |
| Defeated | Decommissioned |

*Core combat metrics remain straightforward:* To avoid player confusion, simple, universal terms are preserved — **Health**, **Armor**, and **Damage** — rather than abstract jargon like "structural integrity" or "flux capacity".

## 7. Nomenclature Conventions

- Visible model designations are punchy: `MIK-0`, `ZIP`, `PRES-4`, `FIX-8`.
- Designations hint at function, locomotion, or role.
- Model numbers complement rather than replace identity; unit cards provide a brief descriptive mission profile.
- Internal code identifiers follow lowercase ASCII formatting: `mik_0`, `pres_4`.

## 8. Audio Aesthetics

Synthesized entirely via procedural Web Audio API nodes:

- UI Navigation: Relay clicks and sharp terminal teletype pulses.
- Jumping: Spring compression coupled with rising servo pitch.
- Heavy Locomotion: Low-frequency pneumatic chugs and motor hums.
- Defensive Shielding: Ascending sinusoidal phase tone.
- EMP & Shock: Sub-bass pop followed by electrical white noise sizzle.
- Impacts: Clanging sheet metal impact and rattling loose fasteners.
- Decommissioning: Winding-down flywheel deceleration whine.

## 9. Vertical Slice Deliverables

The initial visual validation slice required:
- Five distinct robot chassis models.
- Kinematic poses for idle, movement, jumping, firing, and damage recoil.
- One complete Scrapyard sky and terrain palette.
- Four environmental props: gears, plates, cables, and crushed crates.
- Character select cards and combat portraits.
- VFX for shields, overclock, turbo boost, glide, and seismic shockwaves.

## 10. Articulated Humanoid Rig Revision

All 34 robots share an articulated structural rig:

- Every unit features a helmet + visor, torso chassis, **two articulated arms**, **two hands** (palm + 3 fingers + thumb), and dual legs/running gear.
- Distinct locomotion archetypes (treads, wheels, springs, hover gyros) integrate directly into lower leg and foot assemblies. Rotors mount as dorsal flight packs while retaining articulated legs.
- Utility gear mounts to one of three designated hardpoints: **handheld tool**, **shoulder-mounted cannon**, or **dorsal pack / halo**. Mounts remain consistent between menu and match.
- In-match, units grip weapons with both hands; barrels rotate to track aim vectors. In menus, hands rest in relaxed poses.
- Proportion hierarchy (ground baseline `+1.0r`): Helmet apex `-1.32r`, shoulders `-0.38r`, waist `+0.06r`, knees `+0.46r`, ankles `+0.82r`. Legs ≈ 36%, helmet ≈ 30%, torso ≈ 24%.
- HP bar anchors at `cy - r - 12`; headgear and antennas must clear this boundary.
- Walking animations cycle legs in opposite phase with realistic ankle articulation (heel → sole → toe) and gentle torso bobbing. Motion is driven by `motion { vx, vy, onGround, walk, walkAmp, walkPhase, rollPhase }`.
