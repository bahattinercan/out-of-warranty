# Projectile Visual Design Specification (Bespoke Ordnance & HUD Previews)

Date: September 26, 2026  
Status: **Implemented (Phases 1–5).** Automated tests: `run.js` (691/691), `progression.js` (165/165), `audio.js` (21/21), and `maps.js` (960/960).  
User Decisions: (a) Enforce shape uniqueness with explicit design family whitelists; (b) Full HUD weapon icon preview integration.

## 1. Problem Statement & Design Goals

Historically, across **27 distinct projectile specifications** (18 weapons + 3 cluster submunitions + 6 internal skill projectiles), `Projectile.draw()` rendered identical generic circles: particle trail = identical radius decay, projectile body = solid circle, border = stroke outline. Weapons differed exclusively by color.

Objectives:
1. **Bespoke Visual Silhouette for Every Munition Type:** Distinct geometry reflecting flight behavior (finned rockets, pin-primed grenades, spiral-grooved drills, disc landmines, bubbling acid droplets).
2. **Design Family Grouping:** Scale and volley variants share family geometry (e.g., Grenade ≡ Grenade Trio; Rubber Bomb ≡ Rubber Trio; Bazooka ≡ 3-Shot Rocket ≡ Missile Barrage).
3. **Dynamic HUD Previews:** Projectile shapes render directly inside weapon selection chips, tooltip descriptions, and module skill cards.

Strict Constraints:
- Pure procedural Canvas rendering; zero external image atlases (`file://` offline compatibility).
- Invariant combat ballistics; AI bot trajectory simulations (`ai.js`) remain completely decoupled.
- Data-driven configuration via `look` blocks declared directly on weapon specs in `weapons.js`.
- Headless test execution in Node `vm` sandboxes (`tests/run.js`).

## 2. Architectural Design Decisions

| ID | Decision | Specification | Rationale |
|---|---|---|---|
| K1 | Spec Schema | Embedded `look` block on specs (`weapons.js` + `SKILL_PROJECTILES`) | Maintains existing data-driven contract; cluster submunitions inherit parameters automatically |
| K2 | Render Dispatch | `PROJECTILE_SHAPES` registry in `js/projectile.js` | Centralized dispatch decoupled from gameplay logic |
| K3 | Design Families | Shape key defines family identity; shared across quantity tiers | Grenade and 3-Shot Grenade share identical silhouette |
| K3a | Whitelist Audits | `SHARED_SHAPES` mapping table strictly enforced via unit tests | Prevents accidental copy-paste drift |
| K3b | Uniqueness Audit | Recorded mock Canvas context verifies that distinct shapes produce distinct operation sequences | Catches duplicate/redundant renderers |
| K4 | Shape Primitives | Shared drawing helpers (`rocketBody`, `finBody`, `canisterBody`, `blobBody`, `discBody`, `needleBody`) | Eliminates duplicate boilerplate while preserving bespoke accents |
| K5 | Flight Orientation | `look.orient`: `"vel"` (tracks velocity vector) / `"spin"` (rotational roll) / `"none"` | Rockets align with flight path; grenades and bouncing bombs tumble |
| K6 | Animation Source | `Projectile.age` + `Projectile.spinAngle` (deterministic frame steps) | Zero reliance on `Date.now()`, ensuring deterministic replays |
| K7 | Trail Particles | `look.tail`: `flame` / `smoke` / `spark` / `drip` / `mist` / `air` / `none` | Extends visual identity to particle contrails |
| K8 | Render Performance | Zero dynamic gradient allocations or `shadowBlur` calls | Eliminates per-frame garbage collection spikes |
| K9 | Fallback Path | Omitting `look` defaults cleanly to standard circular rendering | Backwards compatibility for testing fixtures |
| K10 | Landmines | Armed deployed landmines share the identical procedural shape renderer | Visual consistency between falling and armed mines |
| K11 | Preview API | `Projectile.drawIcon(ctx, spec, size, opts)` | Single source of truth for in-flight sprites and UI previews |

## 3. Data Schema: `look` Block

```js
look: {
  shape: "rocket",     // Key in PROJECTILE_SHAPES (required design family identifier)
  orient: "vel",       // "vel" | "spin" | "none" (default: "vel")
  spin: 0.35,          // Rotation speed in radians per frame (if orient === "spin")
  size: 1.0,           // Visual rendering scale (projRadius collision remains unaffected)
  tail: "flame",       // Contrail particle archetype
  accent: "#fff2c4",   // Secondary accent color (fins, pins, arming LEDs)
  glow: "#ffb347",     // Soft outer halo tint (optional)
  fuseFx: true,        // Flashing warning ring on burning fuses
}
```

## 4. Execution Pipeline (`js/projectile.js`)

```text
Projectile.draw(ctx)
├─ drawTrail(ctx)                 // 7 trail variants; reads this.trail history
├─ ctx.save()
│   ctx.translate(this.x, this.y)
│   ctx.rotate(orient === "vel" ? atan2(vy,vx) : orient === "spin" ? spinAngle : 0)
│   PROJECTILE_SHAPES[shape](ctx, this)   // Scaled to look.size, centered on 0,0
│   ctx.restore()
├─ drawFuse(ctx)                  // Spark emitter + terminal fuse warning indicator
└─ drawGlow(ctx)                  // Emissive halo passes

Projectile.drawIcon(ctx, spec, size, opts)   // Static preview renderer for UI
├─ Transforms and scales centered preview pose inside bounding box
├─ PROJECTILE_SHAPES[shape](ctx, mockProjectile)
└─ Optional miniature contrail whisps
```

## 5. Shape Catalog (20 Shapes across 27 Munition Specs)

### 5.1 Standard Arsenal (`WEAPONS`)
1. `bazooka` (`rocket`): Cylindrical casing + conical orange nosecone + 3 stabilizing tail fins.
2. `grenade` (`grenade`): Ribbed oval casting + percussion cap + arming ring pin.
3. `sniper` (`needle`): High-velocity saboted round with red tracer tip and streak lines.
4. `shotgun` (`pellet`): High-speed buckshot pellets.
5. `cluster` (`canister`): Heavy ribbed submunition payload canister.
6. `triple` (`rocket`): Tri-rocket volley sharing `rocket` family geometry.
7. `sticky` (`blob`): Viscous adhesive blob that flattens upon terrain contact.
8. `rubber` (`rubber_ball`): High-bounce baseball seam geometry with rapid spin.
9. `rubbertrio` (`rubber_ball`): Tri-shot bouncing ball volley.
10. `grenadetrio` (`grenade`): Tri-grenade volley.
11. `megacluster` (`canister`): Heavy industrial cluster canister.
12. `nuke` (`nuke`): Oversized warhead with trefoil radiation markings and green pulse aura.
13. `barrage` (`rocket`): Swarm missile volley.
14. `mirv` (`mirv`): Two-stage missile with payload separation collar.
15. `airstrike` (`bomb`): Aerodynamic aerial bomb with 4 cruciform tail fins.
16. `drill` (`drill`): Hardened tungsten carbide conical auger with fluted spirals.
17. `mine` (`mine`): Disc mine with central pressure fuse and pulsing arming diode.
18. `napalm` (`napalm`): Teardrop canister discharging liquid chemical flame droplets.

### 5.2 Submunition Fragments (`clusterSpec`)
19. `bomblet` (`bomblet`): Compact spherical submunition with cast fragmentation grooves.
20. `megabomblet` (`bomblet`): Heavy fragmentation bomblet.
21. `mirvlet` (`bomblet`): Terminal MIRV warhead fragment.

### 5.3 Internal Module Ordnance (`SKILL_PROJECTILES`)
22. `fireball` (`fireball`): Spinning incandescent plasma core with trailing flame tongues.
23. `fish` (`capsule`): Cryogenic coolant canister with frost crystal lattice.
24. `acorn` (`bolt`): Heavy hexagonal machine bolt with threaded shank.
25. `quill` (`rivet`): Slender aerodynamic structural rivet with trailing fins.
26. `tornado` (`vortex`): Concentric translucent aerodynamic cyclone whorls.
27. `venom` (`acid`): Corrosive sludge droplet with toxic bubbles.

### 5.4 Whitelist Verification (`SHARED_SHAPES`)

```js
const SHARED_SHAPES = {
  rocket:      ["bazooka", "triple", "barrage"],
  grenade:     ["grenade", "grenadetrio"],
  rubber_ball: ["rubber", "rubbertrio"],
  canister:    ["cluster", "megacluster"],
  bomblet:     ["bomblet", "megabomblet", "mirvlet"],
};
```

Automated assertions verify that any shape shared across multiple specs strictly matches the whitelist.
