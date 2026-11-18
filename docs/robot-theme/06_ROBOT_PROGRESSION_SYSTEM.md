# Robot Progression System — Design & Implementation Specification

Date: September 21, 2026  
Status: Implemented (Phases 1–6). Verified via `node tests/progression.js` (164/164) and `node tests/run.js` (572/572).  
Target Milestone: Core progression system following the thematic overhaul.

## 1. Objective

Translate the foundational lore premise of "salvage priority rights" into an active gameplay loop:

1. Complete matches against AI opponents.
2. Earn Service XP and **Scrap Metal**.
3. Upgrade the selected robot's Chassis, Module, or Core systems in the Workshop.
4. Deploy the upgraded unit against harder AI bot difficulties.

The system provides short-term tactical milestones without homogenizing the roster or compromising local hot-seat competitive fairness.

## 2. Core Design Principles

- **Preserve Character Identity:** Upgrades scale strengths and mitigate liabilities proportionally without overwhelming base attribute ratios.
- **Single Currency Economy:** The initial version exclusively uses Scrap Metal. No loot boxes, multi-colored crafting tokens, or premium currencies.
- **Industrial Workshop Flavor:** Interface copy uses terms like "Upgrade", "Calibrate", "Assemble", and "Workshop".
- **Competitive Parity:** Upgrades are disabled in local hot-seat PvP to preserve balance on a shared device.
- **Data-Driven Architecture:** Upgrades resolve via shared branch formulas and skill kind adaptors rather than bespoke switch statements for 34 characters.
- **Fault-Tolerant Persistence:** Malformed save profiles fall back cleanly without breaking game initialization.
- **Zero-Dependency Execution:** Preserves pure vanilla JS, classic `<script>` tags, and `file://` compatibility.

## 3. Scope of Implementation

### In Scope
- Shared Scrap Metal wallet.
- Per-robot Service XP and Service Levels (1–10).
- Three upgrade branches per robot with three tiers each.
- Workshop screen accessible from the main menu.
- Match completion rewards in AI bot skirmishes.
- Match results reward breakdown card.
- `localStorage` persistence with schema versioning, validation, and auto-migration.
- Dynamic level and upgrade summary tags on selection cards.
- Automated math, persistence, and integration test suites.

### Excluded from Initial Scope
- Gating robots or weapons behind unlock grinds.
- Cloud profiles or cross-device account sync.
- Microtransactions, real-money stores, or daily login chores.
- Consumables, crafting timers, or random loot drops.
- Weapon tech trees.

## 4. Behavior Across Game Modes

| Mode | Rewards Granted | Upgrades Active | Design Rationale |
|---|---:|---:|---|
| Singleplayer vs AI | Yes | Active on human player | Primary singleplayer loop |
| Local Hot-Seat | No | Disabled | Competitive parity and anti-farming |
| Custom Matches | No | User-configurable | Future extension |

AI bots do not draw from persistent player profiles or apply stat upgrades in the base implementation; bot difficulty scales cleanly via algorithmic parameters (`AI_DIFFICULTY`).

## 5. Economic Resources

### 5.1 Scrap Metal
- Profile-wide shared account currency.
- Spent to calibrate upgrade tiers.
- Non-negative integer.
- New profiles initialize with **200 Scrap**, allowing an immediate Tier I upgrade upon reaching Service Level 2.

### 5.2 Service XP
- Tracked independently per robot model.
- Non-spendable; unlocks level thresholds.
- Earned XP is awarded to the human-controlled robot upon match conclusion.
- Capped at the Level 10 threshold.

### 5.3 Service Levels

Cumulative XP thresholds:

| Level | Required XP | Unlocks |
|---:|---:|---|
| 1 | 0 | Base robot configuration |
| 2 | 100 | Tier I upgrades available |
| 3 | 250 | Profile Badge I |
| 4 | 450 | Detailed career stats |
| 5 | 700 | Tier II upgrades available |
| 6 | 1000 | Module visual highlight |
| 7 | 1350 | Profile Badge II |
| 8 | 1750 | Tier III upgrades available |
| 9 | 2200 | Battle wear cosmetics hook |
| 10 | 2700 | Master Service Title |

Threshold evaluation uses `>=` logic: exactly 100 XP qualifies for Level 2.

## 6. Match Reward Calculations

Rewards are granted only in `mode === "computer"` upon legitimate `GAMEOVER` resolution.

### Qualification Criteria
- Match initiated via `startGame()`.
- At least one projectile fired by the human player resolves.
- Outcome resolves as victory, defeat, or draw.
- Leaving to the main menu or page reloading forfeits rewards.
- Deduplication ensures each `matchKey` awards scrap exactly once.

### Base Rewards

| Outcome | Scrap | Service XP |
|---|---:|---:|
| Victory | 60 | 70 |
| Defeat | 30 | 40 |
| Draw | 40 | 50 |

### Difficulty Multipliers

| Difficulty | Multiplier |
|---|---:|
| Easy | 0.75 |
| Medium | 1.00 |
| Hard | 1.25 |
| Master | 1.50 |

### Opponent Count Scaling

```text
opponentMultiplier = 1 + 0.20 × (opponentCount - 1)
```

Yields `1.00`, `1.20`, and `1.40` for 1, 2, and 3 opponents respectively.

### Final Reward Formula

```text
scrap = min(150, round(baseScrap × difficultyMultiplier × opponentMultiplier))
xp    = min(180, round(baseXp    × difficultyMultiplier × opponentMultiplier))
```

Example (Hard victory against 2 bots):
```text
Scrap = round(60 × 1.25 × 1.20) = 90
XP    = round(70 × 1.25 × 1.20) = 105
```

## 7. Upgrade Branches

Each robot features three independent branches. Tiers must be acquired sequentially:

| Tier | Level Gate | Scrap Cost |
|---:|---:|---:|
| I | 2 | 60 |
| II | 5 | 120 |
| III | 8 | 220 |

Maxing a single branch costs 400 Scrap; fully upgrading all three branches costs 1200 Scrap.

### 7.1 Chassis Branch
- **Tier I — Reinforced Frame:** Max HP increased by 5% (`baseHp × 1.05`).
- **Tier II — Layered Armor:** +0.02 base armor (hard-capped at `0.40`).
- **Tier III — Redundant Bearings:** Max HP increased by 10% total (`baseHp × 1.10`), knockback velocity reduced by 10%.

### 7.2 Module Branch
- **Tier I — Precision Calibration:** Module power increased by 6%.
- **Tier II — Rapid Relay:** Module cooldown reduced by 1 turn (floor of 2 turns).
- **Tier III — Overclocked Assembly:** Module power increased by 15% total; emissive module highlight enabled when ready.

Module power maps cleanly across the 12 skill kinds via dedicated adaptors:
- `heal`: Scales healing `amount`.
- `shield`: Awards stamina refund on shield pop (5 stamina at Tier I–II, 10 at Tier III).
- `damageReduce`: Improves damage absorption multiplier.
- `nextShot`: Scales `dmgMult`, `radiusMult`, and `knockbackMult`.
- `jump`: Scales jump impulse velocities.
- `dash`: Scales velocity, impact damage, and knockback.
- `dig`: Scales burrow depth.
- `glide`: Reduces descent gravity scale.
- `melee`: Scales damage, range, and knockback.
- `radial`: Scales damage, blast radius, and knockback.
- `quake`: Scales global seismic damage and knockback.
- `spit`: Scales projectile damage, radius, and muzzle speed.

### 7.3 Core Branch
- **Tier I — Capacitor Bank:** Max movement stamina increased from 70 to 78.
- **Tier II — Flux Regulator:** +4% weapon damage bonus.
- **Tier III — Overcharge Turbine:** Max movement stamina set to 85; +7% weapon damage bonus total.

## 8. Derived Build Resolution

Base entries in `CHARACTERS` are immutable. When launching combat, the system derives an active build object:

```js
const build = resolveRobotBuild(charDef, robotProgress, {
  upgradesEnabled: game.mode === "computer",
});
```

Returns:
```js
{
  maxHp,
  armor,
  weaponDamageMult,
  maxStamina,
  knockbackTakenMult,
  skill: {
    cooldown,
    params,
    shieldStaminaRefund,
    glideGravityMult,
  },
  tiers: { chassis, module, core },
}
```

Resolution rules:
- Pure function with zero input mutations.
- Missing or corrupted data safely defaults to `{ chassis: 0, module: 0, core: 0 }`.
- Armor is clamped to `[0, 0.40]`; cooldown is clamped to `[2, baseCooldown]`.
- Output properties are verified finite numbers.

## 9. Persistence Model

Stored under the browser `localStorage` key:
```text
dokumhane9_profile
```

### Schema Structure
```json
{
  "version": 1,
  "scrap": 200,
  "robots": {
    "kopek": {
      "xp": 0,
      "upgrades": {
        "chassis": 0,
        "module": 0,
        "core": 0
      },
      "stats": {
        "matches": 0,
        "wins": 0
      }
    }
  },
  "claimedMatches": [],
  "updatedAt": 0
}
```

- If `localStorage` access throws due to quota limits or private browsing restrictions, gameplay continues in-memory with a one-time alert.
- `claimedMatches` tracks a rolling ring buffer of the 20 most recent match tokens (`sessionId + ":" + matchId`) to prevent duplicate rewards.

## 10. Purchase Transaction Integrity

All purchases execute through a centralized transaction routine:
```js
purchaseUpgrade(profile, robotId, branch)
```

Validates robot ID, tier prerequisites, level gates, and scrap reserves. Returns `{ ok: true, profile, cost, newTier, persisted }` on success, or `{ ok: false, reason }` on rejection.

## 11. Workshop User Experience

- **Main Menu Entry:** "WORKSHOP — Calibrate your units • [Scrap] Scrap". Transitions state to `WORKSHOP`.
- **Layout:** Two-column 960×540 viewport:
  - Left: Paged 34-robot grid displaying model portraits, Service Level, and upgrade completion (`x/9`).
  - Right: High-resolution robot preview, XP gauge, Scrap balance, and the three branch upgrade panels.
- Upgrading triggers a short procedural audio click and balance adjustment animation without disruptive modal dialogs.
