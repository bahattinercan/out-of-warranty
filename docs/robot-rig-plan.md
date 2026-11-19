# Robot Rig and Rendering Profiles

The robot renderer uses per-character rig data from `js/robot-rig-profiles.js` and shared drawing helpers in `js/robots.js`. The profile catalog is the source of truth for each robot's anatomy, art source, source regions, target layout, anchors, ground contact, weapon pose, and visible gameplay arm.

## Asset and anatomy profiles

- `atlas`: a transparent 3×3 parts atlas, with explicit cell mappings in the profile. FIX-8 has a custom map because its source sheet uses a different semantic layout.
- `parts`: separate art files for the six pilot robots. Their articulated leg, track, wheel, ball, and rotor helpers remain specialized, but consume the shared profile's asset IDs, anatomy, and anchors.
- Each of the 34 characters has a unique shape tuple plus anatomy and ground-contact data. Locomotion families share motion behavior without forcing a shared silhouette or body layout.
- `groundContact` defines the lower visual surface relative to the robot's local render scale. Grounded parts are aligned to it; hover profiles use a hover contact.

The atlas cell contract is explicit: head at top left; torso and back armor on the top row; arm cells on the middle row; lower link/leg cells at middle-right and bottom-left; feet or locomotion modules on the bottom row. FIX-8 overrides its cells. Atlas edits must update the corresponding profile and `tests/robot-rig.js` assertions.

## Weapon pose and gameplay visibility

`robotWeaponPose` remains the shared source for the weapon axis and muzzle point. Both arm poses can be calculated where the weapon grip contract needs them, while gameplay draws only the arm on the facing side so the torso remains readable. Portrait, workshop, and roster previews continue to use `drawRobot`; gameplay requests the facing-side arm through `frontArmOnly`.

Heads, torso, lower body, locomotion modules, weapon, and visible arm are layered by the shared renderer. Weapon and muzzle coordinates remain coupled to the same pose calculation. The physics radius and entity ground coordinate are not changed by art layout.

## Validation

- `node tests/robot-rig.js` checks all 34 profiles, source regions, atlas module placement, ground contact, weapon poses, directions, aim angles, locomotion, and recoil.
- `node tests/run.js` checks the renderer and muzzle/weapon geometry contracts.
- `node tools/art-gate.js` checks manifests and art inventory.
- Orca's `_robot_rig_probe.html` previews the complete roster and pose variations. Final visual acceptance also checks actual gameplay because the combat viewport and overlays differ from the probe.

Do not add a robot-specific layout branch to `js/robots.js` when the difference belongs in profile data. Add a shared helper only when multiple profiles need the same behavior. If an asset has different cell bounds or anatomy, record that explicitly in its profile rather than assuming another robot's layout.
