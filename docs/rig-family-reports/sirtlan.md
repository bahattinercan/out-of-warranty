# Sirtlan cutout kit

Status: **incomplete; keep the existing spritesheet active**.

## Source and extraction

- Source: `assets/robots/sirtlan.webp`, 512×544 RGBA, 142,025 nontransparent pixels.
- A first source-specific set of 21 pivots and region guides is in `tools/rig-families/sirtlan-rig.py`; extracted PNGs and alpha reassembly are under `art/rigs/sirtlan/`.
- The extractor groups paint islands by their nearest authored pivot and assigns dark outline pixels to adjacent islands. This preserves the bind alpha but does not reliably group all islands into the intended moving plate.
- Alpha reassembly: **0 / 142,025 differing pixels (0.000%)**. Atlas and runtime data have not been created.

## Visual review and remaining work

- `debug/masks-2x.png` and `debug/parts-2x.png` were inspected. Several armor details and outline fragments are assigned to separate or neighboring pieces; joint surfaces are not reconstructed.
- No pose, facing, aim, fallback integration, or in-game visual gate was run. This kit is not accepted and must not be registered.
- The existing spritesheet remains the active renderer. Rework the plate grouping and hidden joints before producing runtime data.

## Focused command

- `python tools/rig-families/sirtlan-rig.py` — alpha reassembly 0/142,025 (0.000%); 21 source regions.
