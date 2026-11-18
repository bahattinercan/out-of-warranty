# Munitions Balancing, Stock Depot (999) & Battle Load Caps

Status: **IMPLEMENTED** (Approved under D-01 through D-14; automated test suites green).  
Schema Version: **Retained at v6** — `battleMax` lives directly on weapon specifications in code, requiring zero profile migration.

This specification addresses three unified operational objectives:
1. **Munition Physics & Stat Balancing** — Normalizes damage, blast radius, knockback, and derived rating metrics (`stats`).
2. **Pricing Curve Standardization** — Calibrates ammunition pricing via a unified power-score formula (`weaponPowerScore`) plus explicit table overrides.
3. **999 Depot Stock & Per-Match Battle Caps** — The shared depot stores up to 999 rounds, while in-match deployment is restricted by weapon-specific **battle caps** (`battleMax`).

---

## 1. Architectural Baseline

| Metric | Baseline | Location |
|---|---|---|
| Weapon Count | 20 (1 infinite: Bazooka, 19 purchasable) | `weapons.js > WEAPONS` |
| Base Ammunition | 1–3 rounds provided free per match | `spec.ammo` |
| Depot Capacity | **999 rounds per weapon** | `market.js > AMMO_DEPOT_CAP` |
| Bulk Purchase Steps | `Shift` → 10, `Ctrl/Alt/Cmd` → 50 | `market.js > AMMO_BULK_QTY` |
| Match Ammunition Loading | `min(baseAmmo + depot[id], battleMax)` | `market.js > battleLoad` |
| Post-Match Settlement | Unspent loaded rounds return to depot | `market.js > settleDepot` |
| Scope | Singleplayer progression modes, human entity only | `game.js > isSinglePlayerProgressionMode` |

### Core Mechanical Principle
To decouple long-term stockpiling from in-match balance:
- **Depot Reserves (Inventory):** Persistent account inventory capped at 999.
- **Battle Cap (`battleMax`):** The absolute maximum number of rounds of that weapon usable in a single match. Rounds up to the cap are loaded from the depot; excess inventory remains safely in storage for future matches.

---

## 2. Mathematical Balancing & Pricing Curves

### 2.1 Battle Load Caps (`battleMax`)

| ID | Base Free Ammo | Battle Cap (`battleMax`) | Max Loadable from Depot |
|---|---:|---:|---:|
| `bazooka` | ∞ | ∞ | 0 |
| `grenade` | 3 | 5 | 2 |
| `sniper` | 2 | 3 | 1 |
| `shotgun` | 2 | 4 | 2 |
| `cluster` | 1 | 3 | 2 |
| `triple` | 2 | 4 | 2 |
| `sticky` | 2 | 4 | 2 |
| `rubber` | 3 | 6 | 3 |
| `rubbertrio` | 2 | 4 | 2 |
| `grenadetrio` | 2 | 4 | 2 |
| `megacluster` | 1 | 2 | 1 |
| `nuke` | 1 | 2 | 1 |
| `barrage` | 1 | 3 | 2 |
| `mirv` | 2 | 3 | 1 |
| `airstrike` | 1 | 2 | 1 |
| `drill` | 2 | 4 | 2 |
| `mine` | 2 | 5 | 3 |
| `napalm` | 1 | 3 | 2 |
| `teleportball` | 2 | 5 | 3 |
| `hook` | 2 | 5 | 3 |

### 2.2 Standardized Pricing Formula

Base pricing derived from single-shot effective power score $P$ (`weaponPowerScore`):

$$\text{Price} = \text{clamp}(\text{round}(0.8 \times P + 20), 30, 130)$$

| ID | Power Score ($P$) | Formula Price | Catalog Price | Pricing Rationale |
|---|---:|---:|---:|---|
| `grenade` | 40 | 52 | **30** | Intentional entry-level discount |
| `sniper` | 50 | 60 | 60 | Standard direct-hit rifle |
| `shotgun` | 48 | 58 | 58 | Standard close-quarters spread |
| `cluster` | 73 | 78 | 78 | Standard cluster canister |
| `triple` | 56 | 65 | 65 | Tri-rocket salvo |
| `sticky` | 44 | 55 | 55 | High utility stickiness |
| `rubber` | 34 | 47 | 47 | High bounce unpredictability |
| `rubbertrio` | 48 | 58 | 58 | Multi-bounce spread |
| `grenadetrio` | 56 | 65 | 65 | Tri-grenade volley |
| `megacluster` | 110 | 108 | 108 | High-tier area bombardment |
| `nuke` | 80 | 84 | 84 | High damage single warhead |
| `barrage` | 66 | 73 | 73 | Rebalanced missile swarm |
| `mirv` | 73 | 78 | 78 | Two-stage warhead |
| `airstrike` | 84 | 87 | 87 | Laser-targeted aerial salvo |
| `drill` | 34 | 47 | 47 | Terrain penetration utility |
| `mine` | 34 | 47 | 47 | Defensive proximity mine |
| `napalm` | 46 | 57 | 57 | Lingering fire zone hazard |
| `teleportball` | 0 | 30 | **40** | Utility mobility tool |
| `hook` | 0 | 30 | **35** | Utility positioning tool |

### 2.3 Derived Display Ratings (`stats`)
Hardcoded display ratings were replaced with algorithmic derivation via `weaponStats(spec)`:
- `dmg`: Evaluates realistic single-shot damage potential (1 to 5 dots).
- `radius`: Evaluates explosion pixel radius (1 to 5 dots).
- `speed`: Evaluates base projectile launch velocity (1 to 5 dots).
- Non-damaging utility gear (`damage === 0`) renders `0` dots across all three axes.

---

## 3. Implementation Summary

- `js/weapons.js`: Removed hardcoded `stats` arrays; added `battleMax`; implemented `weaponPowerScore` and `weaponStats`.
- `js/market.js`: Updated `AMMO_DEPOT_CAP = 999`, `AMMO_BULK_QTY = 10`, `AMMO_BULK_QTY_BIG = 50`; implemented `battleLoad`, `weaponBattleMax`, and standardized pricing routines.
- `js/game.js`: `startGame` initializes entity loadouts via `battleLoad`; updated market card layouts to display `Base • Battle ≤ • Depot`.
- `tests/market.js` & `tests/run.js`: Unit assertions verify load caps, depot refunds, and pricing invariants.
