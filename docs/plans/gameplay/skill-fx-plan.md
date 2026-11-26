# Tactical Module VFX Plan (Bespoke Cast Effects & Persistent Auras)

Date: September 26, 2026  
Status: **Phases 1–5 implemented; shared runtime manager added.** See the VFX runtime update below.
Visual Probes: `_skill_fx_sheet.html` (contact sheet) and `_skill_fx_battle.html` (combat sandbox).

## 8. Shared Battle VFX Runtime

`js/vfx.js` owns transient skill-cast and explosion lifecycle through `VFX.emit(game, type, ...args)`, `VFX.update(game)`, and layer-specific `VFX.draw(ctx, game, layer)` calls. It also dispatches entity auras through `VFX.drawAura(ctx, entity, cx, cy, timeMs)` and world-effect rendering. The existing game state remains the backing data so state snapshots and gameplay integrations remain compatible.

- `actors` draws skill casts above robots; `impacts` draws explosions after projectiles.
- `ground` draws fire before robots; `overlay` draws sudden-death acid after impacts; `wind` draws after damage popups. Their simulation clocks and damage state remain owned by `Game`.
- Ready modules pulse at the shoulder tool mount. Poison retains its green ring and gains deterministic rising bubbles driven by `timeMs`.
- Per-match active limits are 32 skill effects and 64 explosions. Emitting at the limit evicts the oldest effect in that category.
- Projectile bodies and trails remain tied to projectile physics/history in `Projectile.draw`; persistent robot auras remain in `Entity.draw`.
- Online snapshots continue to carry skill cast effects through the existing `fx` field. Other effects remain local visual effects; no wire format change is introduced.
- Rendering remains procedural, deterministic, dependency-free, and compatible with direct `file://` launch.

## 1. Problem Statement & Design Objectives

Historically, each of the 34 robots featured a distinct tactical module, but visual expression lacked differentiation:
- `useSkill` triggered generic explosions for `melee/radial/quake`; skills like `heal`, `shield`, `damageReduce`, `nextShot`, `jump`, `dash`, `dig`, `glide`, and `spit` were visually silent.
- The 8 melee strikes and 6 radial pulses appeared visually identical across characters.
- Persistent statuses (shields, damage mitigation, charged shots) were indicated by simple colored outline rings.

Objectives:
1. **Bespoke Cast Animation for Every Module:** Pure Canvas animations reflecting functional hardware behavior (hydraulic stamping plates, magnetic coils, spring releases, EMP arcs, acid jets).
2. **Distinct Persistent Auras:** Readily legible visual indicators for active shields, damage mitigation, charged ordnance, and descent gliding.
3. **Data-Driven Configuration:** Adding a unit requires merely declaring an `fx` block in `characters.js`; zero character-specific branches in `game.js`.

Strict Constraints:
- Pure procedural Canvas rendering; zero external image atlases (`file://` compatibility).
- Invariant combat ballistics; AI bot decision trees remain decoupled from visual effects.
- 100% deterministic rendering: Animations derive from effect progress counters (`t`) and seeded pseudo-random noise (`seeded(fx, i)`); zero calls to `Date.now()` or unseeded `Math.random()`.
- Zero per-frame memory allocations: No dynamic gradient or `shadowBlur` creation; compatible with headless mock contexts (`tests/run.js`).

## 2. Architectural Design Decisions

| ID | Decision | Chosen Specification | Rationale |
|---|---|---|---|
| D1 | Data Location | `fx` block inside `characters.js:skill` | Mirrors `weapons.js > look`; standard extension point |
| D2 | Render Dispatch | `SKILL_FX_SHAPES` registry in `js/skill-fx.js` | Single dispatch registry decoupled from game state logic |
| D3 | Identity Guarantee | Shape key = Module ID | Every robot has a bespoke shape renderer |
| D4 | Geometry Primitives | Shared drawing helpers (`sfxSlashArc`, `sfxRing`, `sfxCone`, `sfxBurst`) | Eliminates duplicate boilerplate across 34 renderers |
| D5 | Animation Clock | Effect lifetime counter `t` (18–42 frames at 60 FPS) | Deterministic replay and automated testing |
| D6 | Coordinate Anchoring | Snapshot captured at cast time (`x, y, facing, aim`) | Effects do not awkwardly drag along behind mobile dashes |
| D7 | Persistent Auras | Dynamic aura render passes inside `Entity.draw` | Clearly communicates active buffs and damage states |
| D8 | Backwards Fallback | Fall back to `SKILL_FX_KIND_DEFAULT` if `fx` is omitted | Graceful tolerance for legacy test data |

## 3. Data Schema: `fx` Block

```js
skill: {
  id: "bigBoom", label: "Pressure Charge", desc: "Next explosion radius significantly increased",
  cooldown: 5, kind: "nextShot", params: { radiusMult: 1.8 },
  fx: {
    shape: "pressureCharge",   // Key in SKILL_FX_SHAPES (required)
    tint:  "#ffa347",          // Primary particle tint (defaults to robot accent)
    accent:"#ffe6a8",          // Secondary highlight color
    label: true,               // Renders floating module title banner
  },
}
```

## 4. Execution Architecture

```
useSkill(entity, game)  →  spawnSkillFx(entity, game, def)
                              │ pushes to game.skillFx[]
                              ▼
Game.update  → updateSkillFx(game, dt)   // ticks t++; prunes when t >= life
Game.render  → drawSkillFx(ctx, game)    // rendered above players, below HUD
Entity.draw  → drawSkillAura(ctx, entity, cx, cy)  // persistent buffs
```

## 5. Shape Catalog (34 Modules across 12 Families)

| Family | Shape Key | Unit · Module | Visual Signature |
|---|---|---|---|
| heal | `patchWeld` | FIX-8 · Emergency Patch | Electric welding arcs and floating green repair cross |
| shield | `magField` | MIK-0 · Polar Barrier | Orbiting metal shavings + hexagonal magnetic forcefield |
| shield | `cloakShift` | HAYALET-4 · Optical Deflector | Holographic scanlines and chromatic ghost after-images |
| nextShot | `pressureCharge` | BOM-12 · Overpressure Bore | Needle sweeps into the red, steam vent pop, muzzle pressure rings |
| nextShot | `dualLoad` | ÇİFT-6 · Twin-Bore Protocol | Twin muzzle flash ignite + stacked chevrons |
| damageReduce | `plateLock` | ZIRH-2 · Armor Lock | Four interlocking armor plates clamp shut with rivet sparks |
| jump | `springJump` | ZIP · Piston Leap | High-tension spring compression and release with dust ring |
| jump | `hookSwing` | KANCA-4 · Service Grapple | Pneumatic grappling hook launched forward with cable line |
| jump | `overCoil` | ZIP-X · Over-Tension Coil | Dual-stage coil compression with blue-hot electric discharges |
| dash | `turboCharge` | TEK-8 · Turbo Charge | Jet exhaust flame, motion streaks, and tire smoke puff |
| dash | `ballRoll` | BİLYE-3 · Roller Ram | Ball bearing spin with orbital sparks |
| dig | `drillSink` | MAT-6 · Sub-Surface Auger | Spiral auger boring animation + displaced dirt debris |
| glide | `rotorSpin` | VIZIR · Emergency Rotor | Rotor blade blur with downward toroidal air rings |
| melee | `pressSlam` | PRES-4 · Piston Strike | Heavy hydraulic stamping plate drop + ground shockwave |
| melee | `twinSlash` | KES-9 · Dual Shear | Cross-cutting twin shear arcs with metallic friction sparks |
| melee | `rotaryWhip` | SAP-3 · Rotary Joint | 360-degree rotating arm sweep with motion blur |
| melee | `clampBite` | KEPÇE-8 · Hydraulic Pincer | Heavy hydraulic jaws clamping shut at strike range |
| melee | `malletBonk` | TOK-2 · Calibration Mallet | Rapid overhead mallet strike + comic impact star |
| melee | `hammerSwing` | VUR-5 · Counterbalance Hammer | Heavy sledgehammer arc with dislodged metal shavings |
| melee | `punchPoke` | PUNTA-1 · Spot-Weld Strike | Rapid horizontal pneumatic punch with velocity streaks |
| melee | `gasSpray` | SIZ-7 · Slag Vent Purge | Forward-expanding toxic green gas cone + corrosive bubbles |
| radial | `empPulse` | EMP-80 · EMP Shockwave | Expanding electrical ring with branching lightning arcs |
| radial | `sirenWave` | SİREN-6 · Klaxon Resonance | Concentric soundwave rings + flashing red hazard beams |
| radial | `resonanceWave` | REZ-7 · Harmonic Overflow | Sinusoidal frequency modulation shockwave ring |
| radial | `centrifuge` | DÖNER-5 · Centrifugal Toss | High-velocity orbital debris ring with centrifugal trails |
| radial | `coolantFlood` | DALGA-2 · Coolant Surge | Expanding fluid wave ring with splashing droplets and steam |
| radial | `cryoBurst` | KRİYO-7 · Cryo Blast | Jagged ice crystal spikes + freezing frost mist |
| quake | `groundRam` | ŞOK-9 · Ground Pounder | Radiating ground fissures + seismic debris kick |
| spit | `slagCannon` | FIRIN-3 · Slag Orb | Molten slag splatter with incandescent muzzle flash |
| spit | `coolantCapsule` | SOĞUT-2 · Coolant Canisters | Twin capsule ejection flashes + condensed vapor plumes |
| spit | `rivetSalvo` | PERÇİN-3 · Rivet Salvo | Triple rapid rivet muzzle bursts with flying metal sparks |
| spit | `boltBlast` | CİV-1 · Explosive Bolt | Hex-bolt head ejection with black powder smoke |
| spit | `vortexFan` | FAN-5 · Vortex Turbine | Spiral aerodynamic vortex cyclone discharge |
| spit | `acidSpray` | ASİT-6 · Corrosive Sprayer | Concentrated acid droplet spray + toxic vapor |

## 6. Persistent Auras (`Entity.draw`)

| Combat State | Visual Effect |
|---|---|
| Module Ready (`skillCooldown === 0`) | Subtle breathing pulse at the utility attachment mount |
| `blockShield` Active | Hexagonal energy shell with shimmering edges |
| `damageReduce` Active | Interlocking plate ring with violet reinforced aura |
| `nextShotMod` Active | Concentric pressure charge rings around the weapon muzzle |
| `glideTurns > 0` | Downward airflow lines beneath thrusters/wings |
| `dashAttack` Active | Forward kinetic speedlines with red thermal friction glow |
| Corrosive Poison | Green bubbling vapor particles |

## 7. Verification & Implementation Notes

- `spawnSkillFx` executes directly inside `useSkill` (`js/skills.js`) to service both player inputs and bot AI invocations uniformly.
- Physical explosions remain intact; skill cast animations layer dynamically on top.
- `resolveRobotBuild` (`js/progression.js`) explicitly copies the `fx` descriptor to derived skill objects so workshop upgrades preserve custom VFX.
