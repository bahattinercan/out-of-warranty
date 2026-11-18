# Arena Mode Design

## Objective

Arena Mode is a single-player tournament ladder where the player, with their chosen robot, faces off against opposing robots **one by one**. Each encounter utilizes standard combat rules; Arena Mode chains the matches into a continuous progression.

This document records the architectural decisions and scope for Arena Mode.

## Player-Confirmed Decisions

- The opponent sequence is fixed.
- The player enters every match with the same chosen robot.
- After each victory, health points and ammunition are fully replenished.
- Difficulty is selected via the existing difficulty screen and remains constant throughout the run.
- Each match's arena is selected randomly from the active map pool.
- Workshop upgrades and equipped parts on the player's robot are active.
- A single consolidated reward is granted at the end of the run; defeat grants a single loss reward. Individual intermediate matches do not grant separate rewards.
- Each match begins with the baseline ammo loadout; Arena does not draw from or consume the shared market ammo depot.
- Active run state lives in volatile session memory only; page reloads do not persist the active run in progress.
- Locked robots appear in the opponent pool; the player may only select robots they have unlocked.
- Following robot selection, a stage selection screen (stages 1–33) opens. Only unlocked stages may be selected.
- The highest unlocked stage persists in Profile Schema v8; pristine profiles start at stage 1.
- Defeating a stage unlocks the next stage. Losing a stage preserves the right to retry that stage directly.
- If the player initiates a run from any unlocked stage, the run proceeds from that stage onwards; prior stages do not need to be replayed.

## Proposed Match Flow

1. Select **Arena** from the Main Menu.
2. The player selects an unlocked robot from their profile roster.
3. Arena follows the sequential order in the `CHARACTERS` catalog, matching the player against every robot except their own chosen robot.
4. The model code and encounter index of the upcoming opponent are displayed prior to combat.
5. Combat resolves under standard single-player rules against the AI bot. The arena map is drawn randomly from the map pool.
6. Upon victory, the player clicks **Continue** on the results screen to advance to the next opponent. Health and ammunition are restored.
7. If the player is eliminated, the run ends. A summary screen displays the encounter count reached and the opponent that dealt the final blow.
8. Upon defeating the final opponent, the completion screen displays. The player is offered **Retry** and **Main Menu** actions.

## Initial Release Scope

- Single player, single robot, leveraging existing bot/combat infrastructure.
- Fixed opponent order following catalog sequence (excluding player's picked robot).
- Full starting HP and ammunition replenished upon each victory.
- No mid-run access to Workshop, Market, or equipment re-gearing between encounters.
- Dedicated outcome screens for defeat and full ladder completion.
- Player-facing UI copy defined via English keys in `js/i18n.js`.

## Rewards and Progression

No rewards are distributed mid-run. Upon completing the ladder, a victory reward is issued; upon defeat, a defeat reward is granted. Calculations query the existing single-player reward calculator, scaling opponents by encounters completed within established reward ceilings. Forfeits or browser reloads grant zero rewards.

Workshop upgrades and equipped parts apply to the player's robot. Bot opponents play with baseline loadouts. Arena encounters initialize with `initialAmmo()` baseline munitions; the shared market depot remains untouched throughout the run.

## Implementation Guidelines

- Mode state and inter-match transitions integrate into the existing `js/game.js` state machine.
- Player-facing strings must be defined with English keys in `js/i18n.js` and verified via `node tests/i18n.js`.
- Reward integration must guarantee exactly one reward payout per run.
- Active run state remains in memory; page reloads reset the active run while preserving highest unlocked stage progress.
- Locked robots remain valid opponents, while player selection respects existing unlock/purchase gates.
- Implementation must follow the game architecture in `CLAUDE.md` and verification gates in `AGENTS.md`.
