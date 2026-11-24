# Wheel family report

Status: **incomplete — no robot passed source-kit acceptance**

No parts, rig data, or atlases were emitted. The supplied sources are complete character illustrations rather than separable limb layers; several also do not match a wheel-legged humanoid silhouette (for example kokarca is a multi-wheel vehicle, penguen is tracked, and gergedan is a four-legged quadruped). The existing extractor is hard-coded to kopek masks, coordinates, and replacement art, so reusing it would create guessed/placeholder pivots and could not establish the required ≤2% alpha reconstruction. Per the family stop condition, the existing sheets remain the only assets and no shared integration files were changed.

| Robot | Source inspection | Outcome | Reassembly diff | Atlas |
|---|---|---|---:|---|
| kokarca | Multi-wheel vehicle; no articulated humanoid limbs | Failed: no source-specific segmentation/pivots authored | N/A | N/A |
| sirtlan | Wheeled humanoid with large rear dish accessory | Failed: no source-specific segmentation/pivots authored | N/A | N/A |
| ornitorenk | Tall wheeled humanoid with asymmetrical back tank | Failed: no source-specific segmentation/pivots authored | N/A | N/A |
| penguen | Compact tracked body, not wheels | Failed: family motion model does not match source | N/A | N/A |
| kedi | Small two-wheel humanoid | Failed: no source-specific segmentation/pivots authored | N/A | N/A |
| koala | Box-bodied two-wheel humanoid with large back tank | Failed: no source-specific segmentation/pivots authored | N/A | N/A |
| kunduz | Humanoid with one prominent wheel and hammer | Failed: no source-specific segmentation/pivots authored | N/A | N/A |
| gergedan | Four-legged wheeled quadruped | Failed: family motion model does not match source | N/A | N/A |
| sincap | Digitigrade animal-like robot with segmented limbs and tail | Failed: source proportions do not support guessed humanoid rig | N/A | N/A |

Focused checks: none; there are no authored rig files to validate. No 2× part boards or atlas previews exist. Atlas dimensions/bytes and per-robot command output: N/A. Existing sprite sheets were left untouched and continue to be the fallback.
