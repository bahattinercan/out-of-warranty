# Robot Rendering

The active gameplay renderer draws every robot and its weapon with the original procedural Canvas vector system. Rig atlases, animation sheets, and full character sprites remain in the repository but are not selected by gameplay. The [34-robot concept board](../art/robot-roster-concept.png) remains the art direction reference.

Artwork remains indexed through `assets/manifest.json` and `js/assets-manifest.js` for previews and future renderer comparisons. Gameplay does not require those assets for robot rendering.

## Runtime behavior

- `drawRobot` uses Canvas paths and vector primitives for the robot, equipment, and launcher.
- Aiming moves the robot's vector arm and launcher together; facing direction mirrors the vector composition.
- `robotMuzzlePoint` and `robotTopOffset` keep projectile origin and HUD placement consistent with the character definition.
- The vector renderer works without loaded image assets.
- Menus, workshop previews, portraits, and gameplay call the same renderer.

## Verification

- `node tests/robot-rig.js` checks all 34 vector characters, both facing directions, seven aim angles, and asset-free drawing.
- `node tests/run.js` checks gameplay rendering contracts, including muzzle placement and draw ordering.
- Orca's `_robot_rig_probe.html` can be used to inspect robot silhouettes at combat scale.
