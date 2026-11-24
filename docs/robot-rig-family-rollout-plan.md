# Robot Rig Family Rollout

Status: **approved for execution**  
Scope: migrate the remaining 33 robots from full-body sheets to cutout rigs, keeping each sheet as fallback until its rig passes the gates. FIX-8 is the pilot and remains the reference for Canvas runtime, script order, legacy muzzle behavior, and test conventions.

## Locked constraints

- Keep vanilla Canvas 2D, classic scripts, zero new runtime dependencies, and direct `file://` support.
- Preserve render order: ready rig, spritesheet, static sprite, procedural fallback.
- Do not remove or rewrite existing sheets. A robot switches to rig rendering only after its source kit, reassembly, data, clips, atlas, and checks pass.
- Keep the established `robotMuzzlePoint()` gameplay coordinate until that robot’s online/determinism checks explicitly pass a change. Rig muzzle geometry is initially visual only.
- Every rig has the ten shared semantic states: `idle`, `walk`, `aim`, `fire`, `jump`, `fall`, `land`, `hit`, `skill`, `death`.
- Source part kits stay under `art/rigs/<id>/`; shipped atlases stay under `assets/robot-rigs/`; data stays under `js/rigs/`.
- Do not commit, push, deploy, or delete assets as part of this rollout.

## Family order and roster

| Wave | Family | Robots | Family-specific motion |
|---|---|---|---|
| 1 | Wheel-legged humanoids | `sirtlan`, `ornitorenk`, `kedi`, `koala`, `kunduz` | Wheel spin follows traveled distance; humanoid legs retain planted contacts. |
| 2 | Legs and quadrupeds | `tilki`, `kaplan`, `ordek`, `aslan`, `kurtadam`, `dino`, `bukalemun`, `zurafa`, `gergedan`, `sincap` | Biped/quadruped gait, knee bend, wheel spin where present, per-robot limb proportions. |
| 3 | Tracks and vehicle chassis | `ayi`, `panda`, `kokarca`, `timsah`, `suaygiri`, `yeti`, `armadillo`, `ejderha`, `oklukirpi`, `penguen` | Stable tread/housing contact and body bob; per-robot vehicle, hybrid, or tracked chassis motion. |
| 4 | Spring | `tavsan`, `maymun`, `kanguru` | Compression, extension, airborne tuck, landing rebound. |
| 5 | Ball | `rakun`, `kirpi`, `hamster` | Whole chassis roll and ground contact; arms/accessories remain attached to the rolling body. |
| 6 | Rotors | `yarasa`, `kus` | Rotor spin, flight/fall poses, and grounded landing transitions. |

Each family is a separate acceptance batch. A robot remains on its sheet if its part kit fails; that does not block other robots in the same family.

## Per-robot workflow

1. Record source dimensions, visible part bounds, pivots, hierarchy, draw order, and locomotion contact points.
2. Author per-robot masks and extract parts. Do not transplant FIX-8 coordinates blindly; use the family template only for motion relationships.
3. Complete hidden joints with matching source-style artwork and manually clean every edge. Keep generated concepts separate from approved final parts until palette, line weight, and silhouette match.
4. Reassemble the bind pose. Require no more than 2% differing source-alpha pixels, with any intentional tool/hand replacement listed explicitly.
5. Pack an alpha WebP atlas at the existing runtime scale and emit per-robot atlas dimensions, rects, pivots, and origins.
6. Author the ten states from the family clip template, then tune limb lengths, contact offsets, and timing per robot.
7. Run structural, clip, ground-contact, height, muzzle, reassembly, and draw-fallback checks. Keep the sheet active on any failed check.
8. Inspect both facings at match scale and 6×. Check walk, aim extremes, fire, skill, jump/fall/land, hit, and death. Record the result in the family report.
9. Integrate only passing rigs into classic script lists, `assets/manifest.json`, generated `js/assets-manifest.js`, and the all-rig checker. Preserve `file://` loading.
10. Run `node tools/art-gate.js`, the rig checker, focused rig tests, existing animation/game/network suites, and `npm run verify` before enabling the family.

## File ownership for supervised implementation

- Family workers own only their roster’s `art/rigs/<id>/`, `assets/robot-rigs/<id>.webp`, and `js/rigs/<id>.js`, plus a family report and any family-exclusive helper under `tools/rig-families/`.
- Do not have parallel family workers edit `index.html`, `assets/manifest.json`, `js/assets-manifest.js`, `package.json`, `tests/harness.js`, `tests/run.js`, or shared rig runtime/checker files.
- After family outputs settle, a dedicated integration task owns the shared script lists, asset manifest/index, aggregate checker, and focused tests.
- Tasks are limited to the exact family roster in their immutable spec. No nested runs/workflows, no `git add -A`/`git add .`, no commit, and no unrelated cleanup.

## Acceptance gates

### Per robot

- Bind reconstruction is at most 2% different in source alpha.
- Atlas metadata matches the shipped image; all rects are in bounds and all bones/parents/clips are valid.
- All ten clips produce finite poses; ground contacts stay within 1 rig px in grounded states; height drift stays within 6% except the authored landing squash and death fall.
- Aim and launcher remain attached to the front hand for battle states. Skill-only tools appear in the intended hand and window.
- Wheel, tread, spring, ball, or rotor motion matches that robot’s family; no drift from traveled distance where contact motion requires phase locking.
- Both facings render without detached limbs or uncovered joints at match scale and 6×.
- Rig failure or missing atlas falls back to that robot’s unchanged sheet.

### Per family

- Every passing robot has a family report with source diff, atlas size, visual states inspected, focused checks, and fallback result.
- `node tools/art-gate.js`, all-rig structural/pose checks, `node tests/robot-animation.js`, existing game/network tests, and `npm run verify` pass.
- Only passing robot IDs are enabled in the rig registry/script list. Unfinished IDs continue to use sheets.

### Final rollout

- 34 robot IDs appear exactly once in animation/rig registries; 34 sheets remain available as fallback.
- Every shipped rig atlas is registered and under the 200 KB per-atlas budget.
- Full local verification and file-URL browser inspection report no console errors; online muzzle behavior remains deterministic.
- The final report lists all six family outcomes and any robots intentionally left on sheets.

## Rollback

Disable a failing robot’s rig registration/script inclusion and keep its atlas/source files for repair; the existing renderer then uses its spritesheet. Do not delete art or change gameplay/network state to recover a visual failure.

## Source-survey correction

The first broad audit showed that the original wheel/leg roster mixed different chassis: `kokarca` is a multi-wheel vehicle, `penguen` is tracked, `gergedan` is quadrupedal, and `sincap` is digitigrade. They are reassigned above by observed source silhouette and contact type. No rig was enabled by that audit; each remains on its existing sheet until its own kit passes acceptance.

## Current execution checkpoint

FIX-8 has the first integrated rig and its existing pilot checks. The initial broad family tasks produced source audits but no accepted rigs, so implementation restarts with one source-specific robot per task. The six families above remain the final rollout order. Shared manifest and script-list changes are deferred to the integration task so concurrent robot work does not collide.
