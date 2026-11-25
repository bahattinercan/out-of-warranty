# Artificial Intelligence Bot Architecture & Implementation Plan

Date: September 17, 2026  
Status: Initial version implemented; verified via automated test suites.

Revision (Accuracy & Difficulty Scaling): Integrated post-coarse **pattern search** (`refineStart` down to `refineMin`), decoupling hit accuracy from coarse grid density. Deprecated the legacy `opensPath * opensPathValue` term which previously overweighted terrain clearing on Hard/Master, resulting in intentional short-fall misses and wasted turns. Replaced with bounded `proximity` and `pathBonus` terms: bots always fire when a safe shot exists. Scaled bot damage output dynamically by difficulty (`AI_DIFFICULTY[].damageMult`: Easy ×0.8, Medium ×1.0, Hard ×1.1, Master ×1.2), applied via `aiAssignDamageScale` exclusively to bot entities at match initialization. Hit rates across 300 random maps measured at ~56% on Easy (up from ~33%) and ~94% on Medium (up from ~83%). For comprehensive parameter tables, refer to [difficulty plan](./difficulty-plan.md).

## Objectives

Deliver a fully autonomous singleplayer AI skirmish mode where computer-controlled entities navigate terrain, calculate ballistic trajectories, deploy tactical abilities, and complete turn-based matches seamlessly.

## Baseline Architecture

- HTML5 Canvas and vanilla JavaScript; zero compiler or package manager dependencies.
- Runs out of the box via `file://index.html`.
- Turn state machine transitions cleanly through `AIMING → PROJECTILE → SETTLE` with a 25-second turn lease.
- Simulates destructible terrain, crosswinds, ammunition inventory, and active abilities.

## Core Functional Scope

### 1. Mode & Character Setup
- Added "Singleplayer vs AI" alongside "Local Multiplayer".
- Player selects their robot followed by the AI opponent's robot.
- Preserved existing 2–6 player local hot-seat flows.
- Cleanly reset bot state upon rematching or returning to the main menu.

### 2. Ballistic Trajectory Heuristics
- Evaluates candidate combinations of angle and power using identical physics constants (gravity, wind, muzzle offset, collision bitmask).
- Evaluates terminal explosions based on expected enemy damage, shield mitigation, and self-damage hazards.
- Rejects candidate trajectories that inflict fatal self-damage or blast away supporting terrain beneath the bot.
- Applies bounded aim error jitter per difficulty tier, verifying the perturbed angle via secondary simulation before discharging.
- Limits computation budgets to prevent frame drops: max 2,000 simulated physics steps or 2ms computation per frame.
- Arsenal selection (`aiSelectWeapon`) scales with difficulty: Easy uses Bazooka; Medium adds Grenades and Shotguns; Hard adds Sniper, Clusters, and Tri-Rockets; Master deploys the full arsenal.

### 3. Kinematic Navigation
- Evaluates short, safe repositions if current firing positions are obstructed or unsafe.
- Traverses terrain respecting stamina constraints, step heights, fall boundaries, landmines, and fire hazards.
- Prevents infinite oscillating movement loops between two waypoints within the same turn.
- Evaluates parabolic jump clearance via `aiCanJumpOver()` and obstacle negotiation via `aiFindJumpPoint()`.

### 4. Turn State & User Experience
- Enforces strict execution time limits on bot deliberation, walking, and aiming.
- Displays clear HUD status indicators ("Computer is aiming…").
- Blocks human keyboard/mouse inputs during bot turns.
- Cancels pending bot decisions immediately upon entity death, turn timeout, or menu exit.
- Bot module usage (`aiShouldUseSkill` / `aiSelectSkill`) activates on Hard/Master, scoring heals, shields, buffs, and radial blasts dynamically.

## Algorithmic Contracts

### Trajectory Simulation & Scoring
1. Angles and velocities remain bounded within legal limits; muzzle release coordinates compute from the robot's physical center offset by barrel length.
2. Steps discrete physics identically to `Projectile.update`, maintaining step-level collision parity rather than relying on idealized continuous parabolas.
3. Evaluates blast damage against target armor, shields, and distance attenuation without invoking stateful `damage()` or `explode()` methods.
4. Weighs expected enemy damage heavily against self-damage penalties. Depleting enemy shields is scored favorably even if immediate damage is zero.
5. Employs coarse grid sampling followed by refined local pattern searches around the top-scoring candidates.

### Aim Error Jitter & Safety Verification
- Aim error jitter is determined once per shot rather than recalculated per frame.
- The perturbed candidate is re-simulated through the physics core. If self-damage is detected, jitter is reduced or dropped in favor of the unperturbed safe candidate.

### Phase Timing Budgets
- Bot turn execution progresses: **wait for settle → search trajectory → execute safe move if needed → settle and re-search → render aim indicator → final verification → fire or pass**.
- Maximum 240 steps per candidate trajectory; max 2,000 steps or 2ms compute per frame.
- Search budget capped at 3 seconds per bot turn; total action phase capped at 8 seconds.
