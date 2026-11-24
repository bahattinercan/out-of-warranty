# Kaplan cutout rig report

Status: **incomplete — visual part continuity gate failed**

## Source and extraction

- Source: `assets/robots/kaplan.webp`, 512×544 RGBA, 96,496 nontransparent alpha pixels.
- 21 source-specific polygon masks and pivots are recorded in `art/rigs/kaplan/masks.json` and `polygons.json`.
- Bind reconstruction alpha diff: **0 / 96,496 (0.000%)**. The extraction audit assigns every source-alpha pixel to exactly one source-derived mask; no intentional replacement was made.
- Atlas: **512×274, 40,346 bytes**, alpha WebP. The image dimensions and 21 source rects are in `js/rigs/kaplan.js`.
- Ten clips are authored: idle, walk, aim, fire, jump, fall, land, hit, skill, death. Grounded contacts lock to 129 rig units.

## Checks

- Focused command: `node -e "const fs=require('fs'),vm=require('vm'),s={Math,Number,Map,Set,WeakMap,Object};vm.createContext(s);for(const f of ['js/robot-rig-runtime.js','js/rigs/kaplan.js'])vm.runInContext(fs.readFileSync(f,'utf8'),s);const r=s.ROBOT_RIGS.kaplan,n=['idle','walk','aim','fire','jump','fall','land','hit','skill','death'];let c=0;for(const facing of [-1,1])for(const state of n)for(const aim of [-1.45,1.45]){const p=s.evaluateRobotRigPose(r,{state,timeMs:320,stateElapsedMs:320,aim,facing,r:14,motion:{onGround:!['jump','fall'].includes(state),walkPhase:Math.PI/2}});if(!p||[...p.bones.values()].some(b=>![b.x,b.y,b.rot].every(Number.isFinite)))throw Error(state+'/'+facing);c++}console.log('kaplan focused: '+c+' facing/state/aim poses finite; 10 clips present')"`
- Output: `kaplan focused: 40 facing/state/aim poses finite; 10 clips present`.
- Ground contact query: idle, walk, aim, fire, land, hit and skill each report maximum contact y `129.000` (0.000 px from target).
- `node --check js/rigs/kaplan.js`: passed.

## Visual review and remaining work

- Reviewed source and mask overlay at 2× (`art/rigs/kaplan/debug/masks-2x.png`) and extracted part board at 2× (`parts-board-2x.png`). The board shows detached scraps in the torso, shoulder and several limb pieces; this is a failed review.
- Reviewed the 6× extracted part board (`parts-board-6x.png`); the same disconnected scraps are visible. Drawn pose review for both facings is consequently not accepted. Numerical pose evaluation covers both facings and both aim extremes, but does not establish visual correctness.
- Hidden-joint repairs have not been painted. The launcher art is not introduced, game/network muzzle coordinates remain untouched, and the existing spritesheet fallback remains enabled because no shared integration files were changed.
- Files produced: `art/rigs/kaplan/parts/*.png`, `masks.json`, `polygons.json`, `debug/*`, `assets/robot-rigs/kaplan.webp`, `js/rigs/kaplan.js`, `tools/rig-families/kaplan-rig.py`, this report.
