# AI Difficulty Tiers Specification

Date: September 17, 2026  
Status: Implemented & Verified.

## 1. Objectives

Allow singleplayer operators to select from calibrated AI difficulty tiers. Balances trajectory accuracy, candidate search depth, tactical movement thresholds, weapon availability, and response latencies across four distinct difficulty tiers.

## 2. Architecture & Design Principles

- Four difficulty tiers (`easy`, `normal`, `hard`, `expert`) managed centrally via the `AI_DIFFICULTY` registry.
- Candidate generation: Generates 234–600 initial coarse candidate trajectories (`coarseElevations × coarsePowerSteps × 2 facings`).
- Local Pattern Search: Following coarse passes, the best candidate evaluates adjacent neighbors in step reductions from `refineStart` down to `refineMin`, decoupling accuracy from coarse grid granularity.
- Aim Error Perturbation: Bounded angular jitter (`baseError`) is applied, and the resulting perturbed vector is re-simulated through the physics core to verify safety.
- Active Firing Policy: When a safe trajectory is found, the bot **always fires**; skipping a turn is reserved strictly for scenarios where zero safe options exist.
- Damage Scaling: Bot outgoing damage scales via `damageMult` (Easy ×0.8, Normal ×1.0, Hard ×1.1, Expert ×1.2); human players remain strictly at ×1.0.

## 3. Difficulty Tier Specifications

### 3.1 Easy (`easy`)

| Parameter | Value | Functional Role |
|---|---|---|
| `searchSeconds` | 3 | Trajectory search time budget |
| `actionSeconds` | 6 | Total action phase budget |
| `baseError` | 0.03 | ±1.7° angular aim jitter |
| `refineFactors` | `[1, 0.6]` | Jitter safety fallback factors |
| `settleTime` | 0.5s | Turn contemplation delay |
| `damageMult` | 0.8 | Outgoing damage scale |
| `passScore` | 3 | Discards candidates below utility threshold |
| `selfDamageWeight` | 3.0 | Heavy penalty against self-damage |
| `coarseElevations` | 13 | 13 elevations × 9 power steps × 2 facings = 234 candidates |
| `coarsePowerSteps` | 9 | Power increment `0.105` |
| `refineStart` | 0.12 | Pattern search initial delta |
| `refineMin` | 0.05 | Coarse pattern search termination threshold |
| `predictTarget` | false | Kinematic trajectory prediction disabled |
| `multipleTargets` | false | Evaluates nearest target only |
| `useSkills` | false | Tactical module abilities disabled |

**Player Experience:** Fires with moderate accuracy (~56% hit rate), rarely repositions, and allows novice players room to counter-attack.

### 3.2 Normal (`normal`)

| Parameter | Value | Functional Role |
|---|---|---|
| `searchSeconds` | 3 | Trajectory search time budget |
| `actionSeconds` | 8 | Total action phase budget |
| `baseError` | 0.025 | ±1.4° angular aim jitter |
| `refineFactors` | `[1, 0.6, 0.3]` | Jitter safety fallback factors |
| `settleTime` | 0.25s | Turn contemplation delay |
| `damageMult` | 1.0 | Outgoing damage scale |
| `passScore` | 3 | Discards candidates below utility threshold |
| `selfDamageWeight` | 2.4 | Standard self-damage penalty |
| `coarseElevations` | 15 | 15 elevations × 10 power steps × 2 facings = 300 candidates |
| `coarsePowerSteps` | 10 | Power increment `0.093` |
| `refineStart` | 0.12 | Pattern search initial delta |
| `refineMin` | 0.04 | Pattern search termination threshold |
| `predictTarget` | false | Kinematic trajectory prediction disabled |
| `multipleTargets` | false | Evaluates nearest target only |
| `useSkills` | false | Tactical module abilities disabled |

**Player Experience:** Balanced skirmish opponent (~94% hit rate with average 22px miss distance on misses); repositions around obstructive cover.

### 3.3 Hard (`hard`)

| Parameter | Value | Functional Role |
|---|---|---|
| `searchSeconds` | 5 | Extended trajectory search budget |
| `actionSeconds` | 12 | Extended action budget |
| `baseError` | 0.015 | ±0.9° angular aim jitter |
| `refineFactors` | `[1, 0.7, 0.4, 0.2]` | Jitter safety fallback factors |
| `settleTime` | 0.15s | Snappy response time |
| `damageMult` | 1.1 | Outgoing damage scale |
| `passScore` | 5 | Discards candidates below utility threshold |
| `selfDamageWeight` | 1.8 | Tolerates calculated self-damage |
| `coarseElevations` | 20 | 20 elevations × 11 power steps × 2 facings = 440 candidates |
| `coarsePowerSteps` | 11 | Power increment `0.084` |
| `refineStart` | 0.14 | Pattern search initial delta |
| `refineMin` | 0.025 | Fine pattern search termination threshold |
| `predictTarget` | true | Evaluates moving target vectors |
| `multipleTargets` | true | Evaluates all targets and prioritizes weak entities |
| `useSkills` | true | Tactical module abilities active |

**Player Experience:** Highly lethal (~94% hit rate, 19px average miss), frequently repositions, targets shield vulnerability, and deploys tactical modules.

### 3.4 Expert / Master (`expert`)

| Parameter | Value | Functional Role |
|---|---|---|
| `searchSeconds` | 8 | Deep candidate exploration budget |
| `actionSeconds` | 15 | Total action budget |
| `baseError` | 0.008 | ±0.5° angular aim jitter |
| `refineFactors` | `[1, 0.8, 0.6, 0.4, 0.2]` | Fine jitter safety fallback factors |
| `settleTime` | 0.1s | Near-instantaneous response time |
| `damageMult` | 1.2 | Outgoing damage scale |
| `passScore` | 10 | High threshold discarding low-utility shots |
| `selfDamageWeight` | 1.2 | Highly aggressive trade evaluation |
| `coarseElevations` | 25 | 25 elevations × 12 power steps × 2 facings = 600 candidates |
| `coarsePowerSteps` | 12 | Power increment `0.08` |
| `refineStart` | 0.16 | Pattern search initial delta |
| `refineMin` | 0.01 | High-precision termination threshold |
| `predictTarget` | true | Kinematic extrapolation + line-of-sight tracking |
| `multipleTargets` | true | Prioritizes highest lethality / weakest entity |
| `useSkills` | true | Full tactical module integration |

**Player Experience:** Pinpoint accuracy (~97% hit rate, 14px average miss), comprehensive angle evaluation, and aggressive high-risk, high-reward tactical play.

## 4. Trajectory Evaluation & Scoring Formula

```js
score = enemyDamage
      + shield * shieldValue
      + proximity                 // max 0.45 pt
      + pathBonus                 // max 0.45 pt
      - selfDamage * selfDamageWeight
      - steps * 0.002;
```

Where:
```js
proximity = Math.max(0, 1 - targetDistance / 420) * 0.45;
pathBonus = Math.min(opensPathValue * 0.1, 0.45);
```

### Damage Multiplier Binding
```js
dmgMult = shooter.dmgMult
        * (shotIsSkill ? 1 : weaponDamageMult)
        * shooter.aiDamageMult;
```

`aiAssignDamageScale` applies `damageMult` exclusively to bot combatants at match start. `aiEvaluateExplosion` accounts for this factor so self-damage and lethal execution thresholds evaluate accurately.

## 5. Automated Benchmark Measurements

Simulated across 300 randomized arena heightmaps using live `BotController` cycles:

| Tier | Scale | Shots Fired | Global Hit Rate | Avg Miss Distance | Pure Bazooka Hit Rate | Avg First-Turn Damage |
|---|---|---|---|---|---|---|
| Easy | ×0.8 | 100% | 56% | 69 px | 54% | 12.5 |
| Normal | ×1.0 | 99% | 94% | 22 px | 63% | 30.6 |
| Hard | ×1.1 | 99% | 94% | 19 px | 80% | 34.8 |
| Master | ×1.2 | 99% | 97% | 14 px | 94% | 40.4 |

The "Pure Bazooka Hit Rate" isolates pure ballistic aiming from arsenal weapon selection, demonstrating a strictly monotonic accuracy progression across tiers: `54% < 63% < 80% < 94%`.
