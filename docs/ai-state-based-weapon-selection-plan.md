# Context-Aware Weapon Selection for AI Bots

Status: **DRAFT — Pre-implementation Specification**  
Objective: Enable AI bots to evaluate match context and real weapon characteristics dynamically rather than gravitating toward the same weapon every turn.

## 1. Baseline Assessment

`aiSelectWeapon(game, shooterIdx)` in `js/ai.js` previously scored weapons based primarily on horizontal distance, target shields, nuke execution thresholds, and low ammunition conservation. Because these scores frequently tied, selection often defaulted to the first qualifying weapon in the list. `aiWeaponLevels` restricts pools by difficulty: Easy uses Bazooka only, Medium uses three weapons, and Hard uses six. The bot subsequently searches for aim angles and power separately; weapon selection operated decoupled from ballistic simulation.

## 2. Target Behavior

The bot evaluates the tactical combat state and compares plausible shots across all available weapons. A safe, high-impact shot is selected by simultaneously weighing hit probability, expected damage, target counts, self-damage risk, terrain interaction, and ammunition reserves. Catalog ordering or nominal weapon power must not artificially bias selection. Identical combat state and PRNG seeds must yield deterministic decisions.

## 3. Decision Inputs

- **Target Geometry:** Horizontal and vertical distance, target elevation, line of sight clearance.
- **Explosion Dynamics:** Shooter proximity to blast radius, blast containment, nearby friendly/neutral bots.
- **Target Status:** Remaining HP, armor, shield value, and lethal execution thresholds.
- **Terrain & Ballistics:** Projectile velocity, gravity, bounce physics, ground penetration, cluster spread, fuse timers, and terrain carving profile.
- **Resource Management:** Current ammo count, match battleMax caps, and opportunity cost of expending rare munitions.
- **Bot Profile:** Difficulty tier, authorized weapon pool, search compute budget, and variety scoring.

Inputs derive from live game state and `WEAPONS` definitions. Non-damaging utility gear (Teleport, Grappling Hook) is excluded from attack candidate pools unless explicit tactical heuristics are defined.

## 4. Turn Decision Flow

1. Filter the authorized pool based on difficulty tier; prune depleted, unowned, or cooldown-locked weapons.
2. Generate coarse representative angle/power candidates for each weapon and simulate trajectories using existing projectile physics.
3. Discard candidates with unacceptable self-damage or suicide risks; score surviving candidates against uniform damage and safety metrics.
4. Select the highest-scoring weapon. Hand off to `prepareAim` to compute fine-grained ballistic aiming.
5. If top scores are within an epsilon margin, apply a minor novelty bonus to recently unselected weapons without overriding decisive tactical advantages.
6. If no viable candidates emerge, fall back to the standard default weapon; never select depleted ammo.

Weapon selection and final aiming share common ballistic simulation logic. To stay within real-time turn limits, coarse selection evaluates bounded candidate sets per difficulty tier rather than running exhaustive aim searches.

## 5. Context-Driven Preferences

| Combat Context | Expected Decision |
| --- | --- |
| Close-Range Target | Prioritize shotguns/spread weapons or high point-blank accuracy; verify blast safety. |
| Distant or Elevated Target | Favor high-velocity, flat-trajectory, or direct-impact weapons. |
| Clustered Enemies | Value cluster and large AoE weapons proportionally to total expected damage across all targets. |
| Low-HP Target | Select reliable lethal execution; avoid wasting expensive or rare heavy ordnance. |
| Shielded Target | Factor simulated shield penetration into score rather than relying on raw catalog damage. |
| Enemy Adjacent to Shooter | Penalize blast radii and bounce vectors that risk self-inflicted damage. |
| Obstructed Line of Sight | Choose bouncing, digging, lobbed, or indirect AoE weapons only when simulation confirms clear trajectories. |
| Low Ammunition Reserves | Do not ban the final round; deploy if expected value decisively exceeds future retention value. |
| No Favorable Shot | Conserve special ammunition; fall back to safe default fire or repositioning. |

## 6. Scoring & Balance Principles

The primary scoring term is simulated net utility: enemy damage/eliminations, shield reduction, and tactical terrain advantages, minus friendly fire, self-damage, and ammunition opportunity costs. All scoring coefficients reside in centralized constants rather than ad-hoc inline numbers.

Priority hierarchy: **safety → expected net damage → execution/multi-target utility → ammo economy → novelty tie-breaking**. Avoid static ID bonuses or distance thresholds.

## 7. Difficulty Tiers & Performance Budgets

- **Easy:** Narrow weapon pool and minimal candidate sampling; straightforward context reactivity.
- **Medium:** Standard combat arsenal with balanced trajectory sampling.
- **Hard / Master:** Full arsenal, comprehensive sampling of indirect fire, cluster splits, and ricochets.
- Difficulty scaling adjusts candidate budgets, predictive horizons, and aim jitter in alignment with `AI_DIFFICULTY`.
- Compute execution must remain strictly bounded to prevent frame hitching or multiplayer turn lease expirations.

## 8. Target Files

| File | Changes |
| --- | --- |
| `js/ai.js` | Weapon qualification, coarse ballistic evaluation, state scoring, novelty tracking, and tier budgets. |
| `tests/run.js` | Extend `aiSelectWeapon` assertions to test decision heuristics and safety regressions. |

## 9. Acceptance Criteria

1. Never selects depleted, unregistered, or tier-locked weapons.
2. Yields correct weapon archetypes for close/long ranges, shields, low HP, clustered targets, and obstructed lines of sight.
3. Novelty tie-breakers never override significant tactical or safety advantages.
4. Single-round ammo reserves are evaluated rationally rather than blindly banned.
5. Deterministic output given identical state and seed.
6. Execution time stays strictly within allocated tier budgets.
