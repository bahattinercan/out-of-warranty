# Robot Models and Weapon Gripping Rig

Game models are layered: for each of the 34 robots, generated chassis and head SVGs, animated arms, hands, running gear (locomotion), and equipped parts come together. Monolithic raster sprites are not used for animated models. The [34-robot concept board](../art/robot-roster-concept.png) sets the art direction. The body SVG never covers the firing hand; muzzle points, dual grip handles, and elbow inverse kinematics derive directly from the game's procedural rig skeleton.

`tools/robot-models.js` produces separate chassis/head SVG assets from character data in `js/characters.js` (chassis type, locomotion, facial features, and palette). Outputs are stored under `assets/robot-models/<id>/`, with runtime paths indexed in `assets/manifest.json` and `js/assets-manifest.js`. Rebuilding is triggered via `npm run models:robots`. Until SVGs are loaded, procedural Canvas rendering serves as an immediate fallback.

## Visual Quality Standards

- Each chassis maps to a distinct silhouette; animal origins translate into recognizable head attachments (ears, horns, beaks, snouts, or quills). Eyes and visors feature high contrast and exaggerated scale to remain readable at combat distances.
- Chassis surfaces feature layered depth: dark baseplate, colored main armor plate, top edge specular highlight, metallic textures, rivets, and shoulder sockets. Shoulder sockets align precisely with arm joint pivots.
- The `viewBox` and Canvas bounding boxes remain invariant across renders, ensuring weapon grip positions, muzzle coordinates, and animation pivots never shift when assets change. SVGs define consistent coordinate spaces; linear gradients live in reusable `defs`.
- Heavy SVG blur/drop-shadow filters are avoided to keep silhouette boundaries sharp at combat resolution; clean strokes, solid fills, gradients, and contrasting facets are preferred. External SVGs are fully compatible with Canvas `drawImage()`.

These standards align with MDN specifications for [viewBox](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox), [linearGradient](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/linearGradient), [SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image), and [Canvas drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage).

## Rig Architecture

- `robotWeaponPose`: Computes weapon axis, two grip points, two arm positions, and muzzle output in the robot's local coordinate space.
- `_rbProportions`: Evaluates shoulder width, head scale, and leg length based on chassis, body, and locomotion specs across all 34 models.
- `robotArmPose`: Solves elbow positions for two fixed-length limbs using inverse kinematics. Unreachable grips trigger assertion errors rather than unnatural limb stretching.
- `weaponRig`: Maps 20 weapons into grip archetype families (launchers, rifles, shotguns, grenade launchers, utility tools). Each archetype specifies grip offsets and recoil profiles.
- `robotMuzzlePoint`: Calculates world-space muzzle release coordinates from the exact rendered pose. Ballistic logic remains completely identical.
- `Entity.heldWeaponSpec`: Retains the fired weapon spec until recoil finishes, even when the last round of ammunition is spent.

Hands are drawn over weapon grips. Heads render on top to keep eyes and visors readable. Held utility tools are stowed when a weapon is drawn. Equipped parts and active skill effects render in lockstep with the articulated skeleton.

Locomotion animations (walking, treads, hover, jump/landing) utilize current entity kinematic states. Torso idle sway is locked during aiming so hands, weapon, and muzzle remain rock-solid. Firing recoil kicks arms and weapons without displacing entity physics coordinates.

HUD portraits, character select cards, and the workshop preview all share the same `drawRobot` pipeline with cached portrait surfaces.

## Acceptance Criteria

1. Both gripping hands render cleanly upon visual asset loading.
2. Arm lengths remain constant across all 34 models, 20 weapons, 2 facing directions, 7 aim angles, and 3 recoil states.
3. Hand positions align with grip coordinates, and muzzle rings match projectile spawn positions within a 0.01px tolerance under Canvas matrix transforms.
4. On the final round of ammo, projectiles emit from the depleted weapon's muzzle before switching back to the default weapon once recoil settles.
5. `_robot_rig_probe.html` validates 6 aim angles, both facings, locomotion states, and roster cards for SAP-3, KEPÇE-8, and BOM-12. `index.html` verifies live combat, menus, and workshop.
6. `node tests/robot-rig.js` runs clean without introducing external dependencies, preserving `file://` compatibility.

## Visual Polish Extension

Visuals are enhanced across the roster under the following conventions:

- Walk cycles and idle loops adapt speed and oscillation to chassis locomotion types without perturbing aim or muzzle vectors.
- Weapon archetypes define distinct elbow bends and wrist rotations for both hands.
- Damage weathering scales with remaining HP percentage; damage impacts produce brief flashes, and absorbed damage displays cyan shield auras. These effects are purely cosmetic.
- Skill activations trigger brief characteristic poses and colored particle signatures without affecting gameplay physics or netcode sync.
- `_robot_rig_probe.html` provides interactive controls for all 34 robots, facing flips, 6 aim angles, status effects (damage/shield/skill), and equipped part previews.
