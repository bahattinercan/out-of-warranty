# Aslan cutout rig

Status: **incomplete; do not enable**.

## Source and extraction

- Source: `assets/robots/aslan.webp`, 512×544, 102,028 nontransparent pixels.
- Eighteen source-specific polygon regions and joint pivots are recorded in `art/rigs/aslan/masks.json` and `polygons.json`; extracted source-resolution pieces are in `art/rigs/aslan/parts/`.
- Bind alpha reassembly: **0 / 102,028 changed pixels (0.000%)**. No source-alpha replacement was made. This measures alpha silhouette only; it does not certify color reconstruction.
- Atlas: **798×266, 37,908 bytes** (`assets/robot-rigs/aslan.webp`); rects are generated into `js/rigs/aslan.js`.
- Ten named clips are present. Focused pose sampling covers 188 poses across both facings and ±90° aim; all sampled transforms are finite and grounded states lock their contacts.

## Visual review and remaining work

- `debug/source-2x.png` was reviewed at 2× against the source; source silhouette and transparency are intact. `debug/parts-2x.png` shows the assembled extracted overlays at 2×.
- **Acceptance is not met.** The part board is a bind assembly, not a posed animation review. The hidden joint surfaces have not been painted in, and the source regions are assigned by polygon coverage with uncovered pixels retained in the torso region. Limb rotations can therefore expose cut surfaces or move artwork that belongs to a neighboring plate. No defensible no-disconnection result at match scale or 6× is available.
- `aslan-rig.py` does not test draw appearance, RGB reassembly, launcher attachment, or fallback integration. The game remains on its existing spritesheet as requested.

## Commands

- `python tools/rig-families/aslan-rig.py` — alpha diff 0/102,028 (0.000%); atlas 798×266, 37,908 bytes.
- Focused runtime sampling (Node VM loading `js/robot-rig-runtime.js` and `js/rigs/aslan.js`) — `aslan-focused: 10 clips, 188 poses across facings/aim extremes; finite and grounded`.
