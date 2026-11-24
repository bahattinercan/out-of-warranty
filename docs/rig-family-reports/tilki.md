# Tilki cutout rig report

Status: **not accepted; keep the current spritesheet fallback**.

## Outputs

- `art/rigs/tilki/parts/`: 19 extracted source cutouts.
- `art/rigs/tilki/masks.json`, `polygons.json`: traced source coordinates, pivots, hierarchy, and crop metadata.
- `art/rigs/tilki/debug/`: source board, part review board, and bind reconstruction.
- `assets/robot-rigs/tilki.webp`: 976×148 alpha atlas, 34,036 bytes.
- `js/rigs/tilki.js`: source-pivot-derived hierarchy and all ten semantic clips; not registered by shared integration.
- `tools/rig-families/tilki-rig.py`: reproducible extraction, reassembly, atlas, and data generator.

## Measured gates

- Source: 512×544 RGBA, 93,081 nontransparent pixels.
- Reassembly alpha diff: **0 / 93,081 (0.000%)**. Intentional replacement: none.
- Atlas: **976×148, 34,036 bytes**, below the 200 KB limit; data rects are in bounds.
- Focused structural command: `node --check js/rigs/tilki.js; node -e "const fs=require('fs'),vm=require('vm');let c={};vm.runInNewContext(fs.readFileSync('js/rigs/tilki.js','utf8'),c);let r=c.ROBOT_RIGS.tilki; console.log('clips='+Object.keys(r.clips).join(',')+' bones='+r.bones.length+' parts='+Object.keys(r.parts).length+' rects='+Object.keys(r.rects).length); for(let b of r.bones){if(b.parent&&!r.bones.slice(0,r.bones.indexOf(b)).some(p=>p.id===b.parent))throw Error('non-topological '+b.id)} for(let [n,q] of Object.entries(r.rects)){if(q[0]<0||q[1]<0||q[0]+q[2]>r.atlasSize[0]||q[1]+q[3]>r.atlasSize[1])throw Error('bad rect '+n)}"`
- Focused output: `clips=idle,walk,aim,fire,jump,fall,land,hit,skill,death bones=20 parts=19 rects=19` (exit 0).

## Visual review and remaining work

Reviewed `art/rigs/tilki/debug/parts-2x.png` at 2×. The polygon partition fragments several cutouts and assigns visible neighboring anatomy to the wrong part; disconnected fragments are visible at this scale. The source alpha reassembles exactly because the extractor assigns each visible source pixel once, but that does not establish clean moving cutouts or completed hidden joint surfaces. 6× pose inspection and both-facing pose review were not completed; no pass is claimed for walk, aim extremes, fire, jump/fall/land, skill, hit, or death. The rig must remain opt-in and the existing spritesheet fallback remains authoritative until the traced masks and joint surfaces are repaired and those pose reviews pass.
