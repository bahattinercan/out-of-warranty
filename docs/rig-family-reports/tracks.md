# Tracks family rig report

Wave 3 source review: all eight source files are 512×544 WebP illustrations. They do not share one silhouette or joint layout: `ayi`, `panda`, and `suaygiri` are tracked humanoids; `timsah`, `armadillo`, `ejderha`, and `oklukirpi` have vehicle-like or hybrid chassis; `yeti` has a round front-facing body. FIX-8 wheel/limb pivots cannot be reused for these drawings.

No robot is marked complete. There are no per-robot reviewed polygon masks, extracted parts, authored pivots, rig clips, or atlases in this batch. Generating those from guessed boxes would violate the source-match gate, so every robot stays on its existing sheet. No source atlas was generated.

| Robot | Outcome | Source / visual evidence | Alpha reassembly diff | Atlas | Focused check | Unresolved |
| --- | --- | --- | --- | --- | --- | --- |
| `ayi` | Incomplete; sheet fallback | 512×544 source inspected; tracked humanoid, symmetric tread modules | N/A; no reviewed masks/parts | None | Source dimensions inspected | Trace separate legs, arms, torso, head, and both treads; author per-part pivots and ten clips |
| `panda` | Incomplete; sheet fallback | 512×544 source inspected; armored humanoid with distinct shoulder/arm plates and dual treads | N/A; no reviewed masks/parts | None | Source dimensions inspected | Trace armor overlaps and articulated limbs; author pivots and ten clips |
| `timsah` | Incomplete; sheet fallback | 512×544 source inspected; low crocodile-shaped tracked chassis with elevated weapon | N/A; no reviewed masks/parts | None | Source dimensions inspected | Define chassis/weapon/track separation and stable ground contact; author ten clips |
| `suaygiri` | Incomplete; sheet fallback | 512×544 source inspected; broad humanoid with purple armor and dual treads | N/A; no reviewed masks/parts | None | Source dimensions inspected | Trace broad torso, arms, head, and tread assemblies; author pivots and ten clips |
| `yeti` | Incomplete; sheet fallback | 512×544 source inspected; front-facing rounded body and centered tread | N/A; no reviewed masks/parts | None | Source dimensions inspected | A side-facing humanoid template is inapplicable; define body motion and centered contact rig |
| `armadillo` | Incomplete; sheet fallback | 512×544 source inspected; low armored animal chassis with drill-like front appendage | N/A; no reviewed masks/parts | None | Source dimensions inspected | Trace shell plates, front tool, and track; preserve tool attachment; author ten clips |
| `ejderha` | Incomplete; sheet fallback | 512×544 source inspected; hybrid dragon/vehicle with horns, arms, and multi-track base | N/A; no reviewed masks/parts | None | Source dimensions inspected | Resolve articulated limbs vs. chassis segmentation and contacts; author ten clips |
| `oklukirpi` | Incomplete; sheet fallback | 512×544 source inspected; low spiked chassis with small arms and tread base | N/A; no reviewed masks/parts | None | Source dimensions inspected | Trace spike silhouette without detached gaps; define appendage and tread pivots; author ten clips |

`tools/rig-families/tracks-extract.py` is the family-owned extraction helper. It accepts only explicit source-space polygons and pivots from each robot's `masks.json`, extracts alpha-preserving parts, reconstructs the source, and reports differing alpha pixels; it intentionally does not guess anatomy or pivots. No gameplay, networking, manifest, script-list, or rig-runtime files were changed.
