# Character Architecture

## 1. Character Formula

Each robot is defined across four conceptual layers:

1. **Chassis Family:** Dictates base silhouette proportions, health, and armor expectations.
2. **Locomotion Base:** Wheels, springs, tracks, armored boots, rotors, or magnetic levitation.
3. **Utility Hardpoint:** Tools that visually express the unit's tactical module skill.
4. **Personality Quirk:** Narrative nuances such as a flickering diode, over-torqued motor, or loose retaining bolt.

This structure prevents units sharing identical skill kinds from appearing as mere color swaps.

## 2. Chassis Families

| Family | Tactical Role | Base Geometry | Representative Hardware |
|---|---|---|---|
| Maintenance | Repair & defensive support | Rounded enclosure | Welding arm, armor patch |
| Magnetic | Shielding & zone control | U-shaped frame, magnetic poles | Induction coil, electromagnet |
| Wheeled | Speed & offensive dashes | Forward-canted teardrop | Monowheel, roller ball, turbo exhaust |
| Spring | Vertical mobility & bouncing | Slender core with heavy spring | Helical coil, pneumatic piston, grappling hook |
| Aerial | Gliding & aerial bombardment | Lightweight tri-segment body | Rotors, ducted fans, stabilizers |
| Industrial Heavy | High HP, heavy armor, melee | Broad rectangular slab | Stamping press, hydraulic claw, wrecking ram |
| Excavation | Terrain drilling & burrowing | Low-profile cylinder | Rotary auger, heavy treads, boring head |
| Experimental | AoE discharges & exotic projectiles | Asymmetric casing | Tesla coil, containment tank, optical projector |

## 3. Silhouette Rules

> **Humanoid Rig Revision:** Silhouettes are built upon an articulated humanoid skeleton (helmet + visor, torso, dual arms + hands, dual legs/feet). Refer to `01_WORLD_AND_ART_DIRECTION.md` §10 for core specifications.

- Every unit must be distinctly recognizable within a 48×48px icon preview.
- Silhouettes are dictated by the chassis and locomotion base, rather than superficial antennas. Locomotion manifests in foot and lower leg geometry (boots, tracks, wheels, spheres, springs).
- Thin structural linkages (arms, struts, fingers) maintain a minimum 2px screen stroke width.
- Facing direction is immediately readable from visor angle, torso cant, and weapon aim vector.
- Heavy and light units display distinct centers of gravity.
- Player team coloration is restricted to accent trim or indicator LEDs.
- Helmets, halos, and dorsal mounts must clear the HP bar. Clearance is dynamically calculated via `robots.js > robotTopOffset(charDef)`.

### 3.1 Proportion Grammar & Verification

`_robot_silhouette_probe.html` computes alpha masks at runtime scales across all 561 pairings of the 34 robots:

| Metric | Before Grammar | After Grammar |
| --- | --- | --- |
| Peak Pair Similarity (IoU) | **1.000** (Identical duplicates) | 0.915 (Max similarity pair) |
| Average Pairwise IoU | 0.694 | 0.650 |
| Pairings with IoU ≥ 0.60 | 426 / 561 | 382 / 561 |
| Identical Family Triplets | 6 units (3 duplicated groups) | 0 (All 34 unique) |
| Helmets Clipping HP Bar | 10 / 34 | 0 / 34 (Clearance: 5.6–12.6px) |

Proportions are generated across four axes via `robots.js > _rbProportions(def)`: `head` (helmet scale), `torsoX` (chassis/shoulder width), `legs` (leg length adjusted to ground contact), and `stance` (foot spread). Helmet shells select from 5 distinct geometric silhouettes (`_rbHeadShellPath`): flat-top slab, dome, capsule, wedge, faceted, and rounded box.

**Rule:** Never hardcode pixel proportions when introducing units; set `chassis`, `body`, and `locomotion` parameters properly.

## 4. Initial Roster (Vertical Slice)

The initial slice finalized five functional archetypes: **FIX-8, MIK-0, ZIP, TEK-8, and PRES-4**, validating repair, shielding, jumping, dash-ramming, and melee mechanics.

### FIX-8 — Emergency Repair Unit
- Family: Maintenance.
- Role: Resilient self-repair support.
- Silhouette: Chamfered toolbox chassis, dual compact wheels, side-stowed welding torch arm.
- Face: Dual green status LEDs.
- Module: **Emergency Patch** — restores 25 HP.

### MIK-0 — Magnetic Sorter
- Family: Magnetic.
- Role: Defensive zone control.
- Silhouette: U-frame chassis over central stabilizing wheel.
- Face: Monocular diode scanning between magnetic poles.
- Module: **Polar Barrier** — blocks the next incoming damage instance.

### ZIP — Spring-Loaded Shelf Inspector
- Family: Spring.
- Role: High-mobility reconnaissance.
- Silhouette: Compact head over heavy helical spring with twin balance skids.
- Face: LED eyes that widen during leaps.
- Module: **Piston Leap** — explosive directional leap.

### TEK-8 — High-Priority Courier
- Family: Wheeled.
- Role: Rapid kinetic dash.
- Silhouette: Forward-raked chassis mounted over a high-speed monowheel.
- Face: Semicircular digital tachometer display.
- Module: **Turbo Charge** — surges forward, knocking back collided targets.

### PRES-4 — Hydraulic Stamper
- Family: Industrial Heavy.
- Role: High-HP melee brawler.
- Silhouette: Broad reinforced slab with a massive hydraulic stamping arm on dual crawler tracks.
- Face: Analog pressure gauge with red overload lamp.
- Module: **Piston Strike** — delivers devastating close-quarters blunt force.

## 5. Roster Transformation Matrix (34 Robots)

Internal IDs are retained for data persistence backwards compatibility; display names, procedural rigs, and module text are updated:

| Internal `id` | Display Designation | Chassis Family | Tactical Module | Gameplay Mechanic |
|---|---|---|---|---|
| `kopek` | FIX-8 | Maintenance | Emergency Patch | heal |
| `kedi` | MIK-0 | Magnetic | Polar Barrier | shield |
| `ayi` | BOM-12 | Industrial Heavy | Overpressure Bore | nextShot: blast radius |
| `tavsan` | ZIP | Spring | Piston Leap | jump |
| `tilki` | ÇİFT-6 | Experimental | Twin-Bore Protocol | nextShot: pellets |
| `panda` | PRES-4 | Industrial Heavy | Piston Strike | melee |
| `kaplan` | KES-9 | Industrial Heavy | Dual Shear | melee |
| `timsah` | SAP-3 | Industrial Heavy | Rotary Joint | melee |
| `suaygiri` | KEPÇE-8 | Industrial Heavy | Hydraulic Pincer | melee |
| `koala` | TOK-2 | Maintenance | Calibration Mallet | melee |
| `kunduz` | VUR-5 | Industrial Heavy | Counterbalance Hammer | melee |
| `ordek` | PUNTA-1 | Maintenance | Spot-Weld Strike | melee |
| `kokarca` | SIZ-7 | Experimental | Slag Vent Purge | melee + poison |
| `aslan` | EMP-80 | Experimental | EMP Shockwave | radial |
| `kurtadam` | SİREN-6 | Experimental | Klaxon Resonance | radial |
| `sirtlan` | REZ-7 | Experimental | Harmonic Overflow | radial |
| `rakun` | DÖNER-5 | Wheeled | Centrifugal Toss | radial |
| `ornitorenk` | DALGA-2 | Experimental | Coolant Surge | radial |
| `yeti` | KRİYO-7 | Experimental | Cryo Blast | radial |
| `dino` | ŞOK-9 | Industrial Heavy | Ground Pounder | quake |
| `gergedan` | TEK-8 | Wheeled | Turbo Charge | dash |
| `kirpi` | BİLYE-3 | Wheeled | Roller Ram | dash |
| `maymun` | KANCA-4 | Spring | Service Grapple | jump |
| `kanguru` | ZIP-X | Spring | Over-Tension Coil | jump |
| `yarasa` | VIZIR | Aerial | Emergency Rotor | glide |
| `armadillo` | MAT-6 | Excavation | Sub-Surface Auger | dig |
| `hamster` | ZIRH-2 | Industrial Heavy | Armor Lock | damageReduce |
| `bukalemun` | HAYALET-4 | Experimental | Optical Deflector | shield |
| `ejderha` | FIRIN-3 | Experimental | Slag Orb | spit: fireball |
| `penguen` | SOĞUT-2 | Experimental | Coolant Canisters | spit: fish |
| `oklukirpi` | PERÇİN-3 | Maintenance | Rivet Salvo | spit: quill |
| `sincap` | CİV-1 | Maintenance | Explosive Bolt | spit: acorn |
| `kus` | FAN-5 | Aerial | Vortex Turbine | spit: tornado |
| `zurafa` | ASİT-6 | Experimental | Corrosive Sprayer | spit: venom |

## 6. Procedural Chassis Geometry Catalog

### Chassis Form Factors (`body`)

| `body` | Visual Form | Associated Units |
|---|---|---|
| `wide` | Broad trapezoid + chest gussets | BOM-12, PRES-4, KEPÇE-8, ŞOK-9 |
| `long` | Elongated chassis + structural X-struts | SAP-3 |
| `compact` | Rounded cuboid + central seam | FIX-8, TOK-2, VUR-5, REZ-7, PERÇİN-3 |
| `small` | Minimalist housing with oversized helmet | ZIP, PUNTA-1, VIZIR, CİV-1, FAN-5 |
| `round` | Barrel/oval container + retaining bands | DÖNER-5, BİLYE-3, ZIRH-2 |
| `tank` | Cylindrical canister + side dials | SIZ-7, DALGA-2, KRİYO-7, SOĞUT-2 |
| `coil` | Ring housing flanked by twin inductive coils | EMP-80 |
| `tall` | Slender vertical column + vertical heat fins | ZIP-X, ASİT-6 |
| `flat` | Raked wedge with forward-angled facets | HAYALET-4 |
| `low` | Low-slung dome + heavy shoulder yoke | MAT-6 |
| `furnace` | Ribbed furnace housing + exhaust stack | FIRIN-3 |
| `u_frame` | Open U-frame cradling glowing plasma core | MIK-0 |
| `angular` | Forward-canted industrial wedge | ÇİFT-6, KES-9, SİREN-6 |
| `forward` | Wedge chassis with aerodynamic nose cowl | TEK-8 |

### Locomotion Assemblies (`locomotion`)

| `locomotion` | Running Gear Anatomy | Associated Units |
|---|---|---|
| `legs` | Reinforced boots: armored toe caps, ankles | ÇİFT-6, KES-9, PUNTA-1, EMP-80, SİREN-6, ŞOK-9, HAYALET-4, ASİT-6 |
| `tracks` | Crawler tracks: tread belt + 3 rollers + fenders | BOM-12, PRES-4, SAP-3, KRİYO-7, MAT-6, FIRIN-3, PERÇİN-3 |
| `wheel` | Monowheel: dual fork arms over wide tire | MIK-0, TOK-2, VUR-5, TEK-8, CİV-1 |
| `wheels` | Inline skate pods under foot assemblies | SIZ-7, REZ-7, DALGA-2, SOĞUT-2 |
| `ball` | Omnidirectional rolling sphere | DÖNER-5, BİLYE-3, ZIRH-2 |
| `spring` | Coil spring + shock absorber + footplate | ZIP, KANCA-4, ZIP-X |
| `rotors` | Boots with heel thrusters + dorsal flight rotor | VIZIR, FAN-5 |

## 7. Locomotion Kinematics & Foot Skating Prevention

Locomotion animations derive deterministically from entity physics (`motion = { vx, vy, onGround, walk, walkAmp, walkPhase, rollPhase }`, `timeMs`).

Stride frequency is strictly **distance-locked** rather than time-locked: `Entity.advanceStride(dx)` steps `walkPhase` and `rollPhase` proportional to `dx`. When movement stops against a wall, stride animation pauses cleanly without sliding in place.

- **Foot Articulation:** Ankles articulate naturally (heel strike → mid-stance roll → toe push-off).
- **Torso Oscillation:** Torso bobs vertically and sways laterally with each stride in sync with distance traveled.
- **Roll Phase:** Wheels, balls, and tracks rotate proportionally to distance traveled, avoiding visual slippage or backwards strobing.
- **Deterministic Rendering:** Identical `(id, timeMs, motion)` parameters always generate bit-identical pixel outputs across clients.
