# Weapon Key Art — Implementation Plan

Status: **Implemented - November 23, 2026**  
Scope: Create and integrate an in-game key-art illustration for every player-selectable weapon in *Out of Warranty*.

## 1. Goal

Give each weapon a distinct, polished illustration in the weapon UI so players can recognize the weapon at a glance. The art should feel native to the game's industrial robot world and remain legible at the small sizes used by the HUD and market.

This is presentation work only. Weapon stats, names, projectile behavior, ammunition economy, and save data remain unchanged. Existing procedural projectile previews remain useful as a fallback and as the in-flight projectile visual.

## 2. Catalog Scope

Produce one illustration for each of the **20 player-selectable weapons** in `WEAPONS` (`js/weapons.js`). The internal cluster payloads `bomblet`, `megabomblet`, and `mirvlet`, plus skill projectiles, are not separate weapons and do not receive independent key art in this plan.

| Weapon ID | Visual identity to communicate |
| --- | --- |
| `bazooka` | Compact industrial rocket launcher / rocket |
| `grenade` | Single rugged hand grenade |
| `sniper` | Long, precise piercing shot / rifle-like weapon |
| `shotgun` | Short-range multi-pellet spread |
| `cluster` | Cluster projectile splitting into bomblets |
| `triple` | Three rockets fired in a fan |
| `sticky` | Adhesive bomb with a visible fuse |
| `rubber` | Rebounding rubber bomb |
| `rubbertrio` | Three bouncing rubber bombs |
| `grenadetrio` | Three fanned hand grenades |
| `megacluster` | Large canister splitting into many fragments |
| `nuke` | Heavy radioactive warhead; stylized, non-realistic |
| `barrage` | Dense fan of rockets |
| `mirv` | High-arc carrier releasing bomblets at its apex |
| `airstrike` | Aerial drop / descending bombs |
| `drill` | High-speed ground-penetrating drill projectile |
| `mine` | Armed proximity mine |
| `napalm` | Incendiary canister and flame |
| `teleportball` | Luminous teleport orb |
| `hook` | Grappling hook and cable |

The count is 20 selectable weapons; the table has 20 entries. IDs are the stable asset keys; localized display names must not be used in filenames or lookup logic.

## 3. Art Direction and Asset Contract

- Match the established industrial, repaired-scrap aesthetic: painted metal, welds, bolts, restrained hazard colors, readable silhouettes, purposeful wear.
- Give each weapon one dominant silhouette and one restrained accent color that supports its existing projectile identity.
- Compose each image as a centered product illustration, three-quarter view where suitable, with enough negative space for cropping in compact UI cards.
- Use a transparent background where the generator and cleanup pipeline produce clean edges. Do not bake labels, numbers, UI frames, stats, or text into the art.
- Keep the art illustrative and game-like; avoid photorealistic military imagery. The nuclear weapon should be a fantastical game prop, not a realistic technical depiction.
- Master target: square 512×512 PNG with alpha in `art/weapon-key-art/` for review. Runtime target: 256×256 WebP with alpha in `assets/weapon-key-art/`.
- Initial per-image target: ≤100 KiB; aggregate target for all 20 runtime images: ≤1.5 MiB. If this cannot be met without visibly damaging edges or detail, document measured size and propose a revised budget before integration.
- File and manifest IDs: `weapon-key-art/<weapon-id>`; runtime files: `assets/weapon-key-art/<weapon-id>.webp`.

## 4. Runtime Integration

### Weapon selector and description panel

- Use the weapon key art in the compact weapon chips and selected quick slot so the in-match HUD matches the weapon detail and market cards. Keep `Projectile.drawIcon` for in-flight projectiles and as the missing-art fallback.
- Use the key art in the selected weapon description panel (`#weapon-desc`) as the larger visual beside the weapon name. This gives the illustrations room to read without crowding the 20-item selector.
- Preserve the existing name, description, ratings, special effect, and ammunition metadata. The illustration supplements these elements and must not cover or replace them.

### Ammunition market

- Replace or augment the small projectile icon at the leading edge of each ammunition card with that weapon's key art, sized and cropped to the existing card geometry.
- Preserve all current card states and text: hover, selected/purchase flash, full depot, unaffordable price, bulk hint, metadata, and pagination.
- Review card layout at the current supported aspect ratios and compact window sizes. If adding the art makes text unreadable, first adjust image bounds within the card; do not remove market information or increase the card count/height without a separate layout decision.

### Loading and fallback behavior

- Resolve the image by stable weapon ID through `assetImage("weapon-key-art/" + spec.id)`.
- Draw only when the asset is ready. Keep the current procedural icon/preview path available when an asset is missing, failed, or still loading.
- Do not introduce `fetch`, ES modules, new runtime dependencies, or a network request. The game must continue to work from `file://`.
- Register each runtime image in both `assets/manifest.json` and generated `js/assets-manifest.js`; use the existing art-index generation command where applicable rather than hand-maintaining generated output.

## Implementation Record (November 23, 2026)

- Generated 20 distinct transparent source illustrations at 512x512 and prepared 20 runtime WebP files at 256x256.
- Runtime key art totals **422,950 bytes (about 413 KiB)**; the largest file is 36,656 bytes, below the 100 KiB per-image budget.
- `js/game.js` draws art in weapon detail, ammunition market cards, compact weapon chips, and the selected quick slot. In-flight projectiles retain their procedural shape. The bazooka has art in the catalog/detail UI; 19 weapons are sellable in the ammunition market.
- Missing or not-yet-loaded art falls back to the existing procedural projectile icon. The HUD refreshes the selected preview when its art finishes loading.
- Art production uses the built-in image generation tool with a shared teal, cream, orange, and riveted industrial toy-prop style. Source prompts and generation provenance are in `art/weapon-key-art/gen.json`; the contact sheet is `art/weapon-key-art/contact-sheet.png`.
- Visual review: `screenshots/weapon-key-art-market.png` (960x540), `screenshots/weapon-key-art-hud.png` (1280x900), and `screenshots/weapon-key-art-market-mobile.png` (390x844).
- Added the weapon key-art size budget and catalog-to-asset coverage check to `tools/art-gate.js`; `tools/art.js` now prepares alpha-preserving 256×256 art.
- Verification passed: `npm run verify`, `node tests/run.js` (1485), `node tests/market.js` (373), `node tests/i18n.js` (139), `node tests/release.js` (58), `node tests/encoding.js` (266), `node tools/art-gate.js` (4287), and `node tools/build.js --dry`.

## 5. Phases and Deliverables

### Phase 0 — Baseline and visual contract

1. Re-read `js/weapons.js`, the market card renderer and the weapon HUD description renderer in `js/game.js`, plus `js/assets.js`, both asset manifests, and relevant art-pipeline code.
2. Capture or inspect the existing market and weapon panel at representative desktop and narrow-window sizes.
3. Confirm current selectable weapon count against `WEAPONS`, excluding internal cluster payload specs and skills.
4. Lock a 3–4 image style sheet using representative silhouettes: rocket (`bazooka`), explosive (`grenade`), energy utility (`teleportball`), and tool utility (`hook`).

**Gate:** all four samples read clearly at 48–96 px, share one visual language, and have usable transparency/crops. Revise the prompt/cleanup recipe before producing the full set if the gate fails.

### Phase 1 — Generate and curate the full set

1. Generate one final candidate for each of the 20 weapon IDs using a shared style reference plus weapon-specific silhouette and behavior details. Four representative props passed the style review before completing the set.
2. Review the complete contact sheet and reject unclear silhouettes, accidental lettering, and mismatched weapon identities. This rollout produced one curated image per weapon rather than several unused variants per ID.
3. Normalize canvas framing, transparent edges, color balance, and output dimensions. Keep approved source renders and generation metadata in the art source directory.
4. Build a contact sheet containing all selected art with stable IDs for review and consistency checks.

**Gate:** every selectable ID appears exactly once; the art remains distinguishable at the smallest intended display size; no image contains baked-in text; no candidate silently changes the game's weapon fantasy.

### Phase 2 — Prepare and register runtime assets

1. Convert approved masters to 256×256 WebP with alpha using the repository's existing preparation conventions.
2. Register all 20 images in `assets/manifest.json` and regenerate `js/assets-manifest.js` through the supported art tooling.
3. Run the art gate and inspect file count, dimensions, alpha, manifest-to-disk parity, per-file size, and total runtime size.

**Gate:** 20/20 runtime files resolve by ID; art gate passes; combined runtime payload is within the agreed budget.

### Phase 3 — Integrate into UI

1. Add a small shared drawing helper in `js/game.js` only if it avoids duplicated crop/fallback logic; otherwise use the existing renderer style at each call site.
2. Draw selected weapon key art in the existing weapon description title area.
3. Draw key art in ammunition market cards without changing purchase hitboxes or market behavior.
4. Retain procedural fallback visuals during asynchronous image loading and on errors.
5. Add/update focused probes for all weapon cards and selected-weapon states if the existing probe architecture supports them; do not add a new production script.

**Gate:** no missing/wrong weapon mapping; visuals do not overlap text, stats, purchase controls, or pagination; UI remains responsive while art is loading.

### Phase 4 — Verification and documentation closeout

1. Run `node tests/i18n.js` (coverage regression), `node tests/run.js`, `node tests/market.js`, `node tools/art-gate.js`, and `node tests/release.js`.
2. Run `node tools/build.js --dry` and inspect its asset inclusion and size report.
3. Run `bash ~/.pi/agent/bin/verify.sh` as the repository-wide required gate; inspect the actual output and fix failures before repeating the same command.
4. Visually inspect the contact sheet and UI probes at desktop and narrow sizes, including the pending-load/fallback state and a missing-asset state.
5. Update this plan's status and record final asset count, measured runtime bytes, verification results, and any deferred issue.

## 6. Files Expected to Change

| Path | Expected change |
| --- | --- |
| `docs/weapon-key-art-plan.md` | Plan, implementation record, and acceptance results |
| `art/weapon-key-art/` | Approved 512x512 PNG masters, prompt metadata, and contact sheet |
| `assets/weapon-key-art/` | 20 runtime WebP images |
| `assets/manifest.json` | 20 runtime asset records |
| `tools/art.js` | weapon key-art preparation defaults and alpha-preserving contain fit |
| `tools/art-gate.js` | 20-file catalog coverage and aggregate/per-image budget checks |
| `probes/_hud_probe.html` | Refresh the HUD preview after local art loading for visual QA |
| `js/assets-manifest.js` | Regenerated asset lookup entries |
| `js/game.js` | Key art rendering in description panel and ammunition cards, with fallbacks |
| `probes/` | Focused visual probe updates, if needed for reliable visual review |

No changes are planned for weapon definitions, market economy, profile/save schema, projectile physics, `index.html` script order, or localization strings.

## 7. Acceptance Checklist

- [x] All 20 player-selectable weapons have one approved key-art asset each; 19 are market offers.
- [x] Internal cluster payloads and skill projectiles are excluded from the 20-image set.
- [x] Key art appears in the selected weapon detail panel and ammunition market cards.
- [x] Compact weapon chips and the selected quick slot show weapon key art; in-flight projectiles retain their procedural shapes.
- [x] Missing, failed, and not-yet-loaded art uses the existing procedural visuals.
- [x] `file://` launch remains supported; no runtime dependency or network fetch is introduced.
- [x] Art gate confirms manifest, files, dimensions, alpha, and budgets.
- [x] Automated verification and package dry-run pass with recorded output.
- [x] Desktop and 390px narrow-window probe confirms the art stays inside its card bounds; the canvas keeps its existing scaled 16:9 layout.

## 8. Rollback

Remove the key-art drawing calls and their asset registrations. Existing projectile previews and UI content remain the fallback presentation. The art files can then be removed from the runtime manifest and generated index; no save migration or gameplay rollback is required.

