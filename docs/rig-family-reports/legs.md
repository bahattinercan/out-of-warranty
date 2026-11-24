# Wave 2: legged robot rig report

Status: **incomplete; all eight robots remain on their existing sprite sheets**  
Review date: 2026-11-23

The source art was inspected at 2× from `assets/robots/<id>.webp`; each robot has its own source review image under `art/rigs/<id>/debug/source-2x.png`. The silhouettes are not one interchangeable humanoid template: the roster includes compact armed torsos, a long-necked quadruped, and a crouched multi-limbed robot with a coiled tail. No per-robot cutout masks, pivots, limb measurements, joint repairs, or atlas were authored, because assigning those without tracing the individual art would be guesswork and would not establish seam quality. No robot has rig data, so the ten-clip, bone, and contact gates were not claimed as passed; source sprite sheets and shared gameplay/network coordinates are untouched.

## Per-robot outcomes

| Robot | Source (px) | Nontransparent pixels | Outcome / visual evidence |
| --- | ---: | ---: | --- |
| `tilki` | 512×544 | 93,081 | Incomplete. Compact angular torso, paired back-mounted launchers, and overlapping multi-segment legs need individual part boundaries and pivot tracing. |
| `kaplan` | 512×544 | 96,496 | Incomplete. Humanoid stance has claw/tool forearms and dense armor overlapping the shoulder and knee joints; no source-derived joint masks or pivots yet. |
| `ordek` | 512×544 | 67,722 | Incomplete. Camera head, asymmetric arms, and thin articulated legs need per-part boundaries; FIX-8 proportions do not match the visible anatomy. |
| `aslan` | 512×544 | 102,028 | Incomplete. Broad armored torso, mane/shoulder plates, and cyan chest details overlap at the limb roots; no traced segmentation or seam repair. |
| `kurtadam` | 512×544 | 72,845 | Incomplete. Tall narrow frame with ear-like side discs and thin limbs needs separately measured limb lengths and foot contacts. |
| `dino` | 512×544 | 143,315 | Incomplete. Heavy squat chassis, shoulder-mounted equipment, broad hands, and short legs require a distinct stance and contact model. |
| `bukalemun` | 512×544 | 85,127 | Incomplete. Crouched digitigrade pose, long coiled tail, and overlapping shell plates do not fit a biped leg template. |
| `zurafa` | 512×544 | 54,051 | Incomplete. Long articulated neck and four slender legs require a quadruped hierarchy with individually measured joints and ground contacts. |

## Artifacts and checks

- Family helper: `tools/rig-families/legs-audit.py` creates source-only 2× review boards and can compare a future `debug/reassembled.png` alpha channel against its source.
- Source boards: `art/rigs/<id>/debug/source-2x.png` for each listed robot.
- Reassembly difference: **not measured** for all eight; no reassembled cutout exists.
- Atlas: **not produced** for all eight; dimensions and byte sizes are not applicable.
- Rig data / ten clips: **not produced** for all eight.
- Focused command: `python tools/rig-families/legs-audit.py` — passed; all eight sources reported as 512×544 and source boards were written. No warning or error output.
- Shared integration, manifest, runtime, gameplay, and network files were not changed. Existing sheets remain the fallback for every robot.

Next work should trace each robot's masks and pivots from its own source board, inspect 2× part boards, and only then measure reassembly alpha difference and pack atlases. Keep each robot on its sheet until its own gates pass.
