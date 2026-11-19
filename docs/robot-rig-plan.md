# Robot Rendering

The active gameplay renderer draws each robot as a complete sprite from `assets/robots/<id>.webp`. It adds the launcher sprite while aiming and uses procedural Canvas rendering when an image is unavailable. This restores complete character silhouettes, including their individual legs and feet. Modular part and atlas composition is inactive. The [34-robot concept board](../art/robot-roster-concept.png) remains the art direction reference.

Full sprites are indexed through `assets/manifest.json` and `js/assets-manifest.js`. The renderer does not assemble generated chassis/head SVGs or key art parts.

## Runtime behavior

- `drawRobot` requests the character's full sprite through `assetImage("robots/" + def.id)` and draws it as one image.
- While aiming, it layers `weapons/launcher` over the robot and mirrors the composition for the opposite facing direction.
- `robotMuzzlePoint` and `robotTopOffset` keep projectile origin and HUD placement consistent with the character definition.
- If a full sprite is unavailable, the procedural Canvas renderer is used.
- Menus, workshop previews, portraits, and gameplay call the same renderer.

## Verification

- `node tests/robot-rig.js` checks all 34 sprites, both facing directions, the launcher overlay, and procedural fallback.
- `node tests/run.js` checks gameplay rendering contracts, including muzzle placement and draw ordering.
- Orca's `_robot_rig_probe.html` can be used to inspect robot silhouettes at combat scale.
