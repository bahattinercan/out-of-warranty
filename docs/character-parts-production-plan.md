# Character Parts Production Plan

## Goal

Create complete, readable key-art part sheets for every robot that does not yet have a completed parts atlas. Keep the established Out of Warranty industrial 2D look and make every sheet usable for later in-game assembly.

## Scope

There are 34 selectable robots. Existing part-art work covers FIX-8, MIK-0, BOM-12, ZIP, ÇİFT-6, PRES-4, and DÖNER-5. This plan covers the remaining 27:

| Batch | Robots | Visual focus |
| --- | --- | --- |
| A — articulated service and combat frames | KES-9, SAP-3, KEPÇE-8, TOK-2, VUR-5, PUNTA-1, EMP-80, SİREN-6, MAT-6, HAYALET-4, PERÇİN-3, ASİT-6 | Complete hips, visible paired legs and feet; signature cutter, rotary arm, clamp, mallet, hammer, punch, EMP coil, siren, drill, optical module, rivet rack, or acid nozzle |
| B — rolling, tracked and heavy frames | SIZ-7, REZ-7, DALGA-2, KRİYO-7, ŞOK-9, TEK-8, BİLYE-3, ZIRH-2, CİV-1, FIRIN-3, SOĞUT-2 | Distinct wheel/ball/track assemblies, grounded lower chassis, and signature gas, resonator, coolant, cryo, ground-ram, turbo, bearing, armor-lock, bolt-launcher, slag, or capsule modules |
| C — spring and flight frames | KANCA-4, ZIP-X, VIZIR, FAN-5 | Spring legs and feet remain visible; rotor units read clearly without hiding the lower body |

## Standard atlas specification

- One combined transparent PNG master per robot, with parts separated into clearly spaced cells and no labels baked into the art.
- Required pieces: head/helmet, upper torso, pelvis/lower torso, near arm, far arm, left leg, right leg, left foot, right foot. For wheel, track, spring, or rotor locomotion, use the appropriate complete movement modules while preserving the lower-body connection.
- Keep the current game presentation: compact readable silhouettes, bold dark outlines, cel-shaded metal, restrained palette based on each robot's `color` and `accent`, and no scene/background.
- Design arms as directional gameplay parts: only the arm on the facing side should be shown during play. Preserve the recognizable weapon/tool attachment without covering the torso.
- Establish consistent joint overlap and attachment points so the parts can be assembled without gaps. Feet must be visible below the body at the intended gameplay scale.
- Name source masters `art/character-parts/<model-code>-complete-parts.png`; derived game assets and manifest records are a later integration step after visual approval.
- Contact sheet for the full roster: [`art/character-parts/character-parts-contact-sheet.jpg`](../art/character-parts/character-parts-contact-sheet.jpg).

## First production slice: KES-9

Start with KES-9 as the style and assembly prototype. Its sheet will include a compact angular torso and pelvis, yellow/black industrial armor, paired cutter arms, articulated legs, and two grounded feet. Keep the cutter silhouette distinct from FIX-8's welder and make sure the lower body is not hidden by the weapon.

Prototype acceptance checks:

1. All nine required parts are present, separated, and fully inside the canvas.
2. Both legs connect visually to the pelvis and both feet are clearly visible.
3. Near/far arm distinction supports left- and right-facing gameplay.
4. Parts remain readable at the game's small character scale and match the existing robot art family.
5. Save the chosen master in the project before preparing any runtime derivative.

## Production workflow

1. Generate a complete-sheet concept for the current batch prototype.
2. Inspect anatomy, silhouette, feet, palette, and cell separation; revise only the failed details.
3. Freeze the prototype's sheet layout and naming convention.
4. Produce the remaining robots in the locomotion batches above, keeping each character's tool/ability silhouette unique.
5. Review every sheet at full size and at gameplay scale; reject missing feet, merged parts, stray background, duplicated limbs, or unreadable attachments.
6. After the sheets are accepted, derive optimized runtime assets, register them in `assets/manifest.json` and `js/assets-manifest.js`, wire the renderer, and run the art and character verification gates.

## Status

- [x] Inventory existing parts art and remaining roster.
- [x] Define atlas contents, style constraints, and acceptance checks.
- [x] Create and review KES-9 prototype sheet: [`art/character-parts/kes-9-complete-parts.png`](../art/character-parts/kes-9-complete-parts.png).
- [x] Produce batches A, B, and C: all 27 planned robot masters are present, alongside the existing FIX-8 reference master.
- [x] Add the omitted PRES-4 atlas: [`art/character-parts/pres-4-complete-parts.png`](../art/character-parts/pres-4-complete-parts.png).
- [x] Prepare transparent runtime atlases and register them in `assets/manifest.json` and `js/assets-manifest.js`.
- [x] Wire atlas-backed characters into the in-game renderer with a procedural fallback while images load; keep the existing part-art path for the six pilot robots.
- [x] Inspect all 28 atlas-backed characters in seven Orca matches and view all 34 roster characters; a follow-up screenshot exposed missing visible lower-body parts on FIX-8 and MIK-0, which were repaired and rechecked in gameplay.
