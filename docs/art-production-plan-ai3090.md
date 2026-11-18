# Expanded Implementation Status — November 15, 2026

The in-game robot weapon-handling system was transitioned to an articulated Canvas rig. Full-body robot renders and portraits are retained as source references; match, menu, garage, and HUD use the identical articulated rig. The weapon, two hands, and projectile muzzle align to a shared skeletal pose. The active rig specification is documented in [robot-rig-plan.md](robot-rig-plan.md). The raster production records below reflect the historical generation pipeline for the art package.

Final user approval brought robot, projectile, and skill visuals into raster scope, superseding the original plan's raster exclusions. Game physics, collision hitboxes, and effect durations remain hardcoded in the engine, while visible sprites were migrated to generated WebP assets.

| Package | Status |
| --- | --- |
| 9 zones / 18 backdrop layers | Complete |
| 10 terrain surface textures | Complete |
| 34 robot sprites + 34 portraits | Complete; wired to game and HUD previews |
| Projectile, skill, and equipment atlases | Generated; bound to Canvas render routines |
| UI atlas | Generated; integrated into main menu icons |
| Key art, store capsules, itch banner | Generated under `art/marketing/` |

Active game runtime assets are registered in `assets/manifest.json` and `js/assets-manifest.js`. In production distributions, `tools/build.js` packages the `assets/` directory; raw source PNGs and generation prompts reside under `art/build/` and `art/marketing/`.

Generation tooling: New illustrations in this rollout were generated via Codex `image_gen`.

---

# Art Production Plan — ai3090 Pipeline (Implementation Plan)

Date: November 14, 2026
Status: Initial planned asset milestones complete; expanded scope implemented.
License matrices reside in `docs/ai-visual-production-plan.md`. If contradictions arise, **this document** takes precedence, as all figures below were **benchmarked** on ai3090 hardware on November 14, 2026.

Scope: Player-visible raster assets — environments, terrain textures, 34 robots and portraits, projectile/skill/equipment atlases, UI, and marketing collateral.

## 0. Locked Decisions (November 14, 2026, User Approved)

| Decision | Selection |
| --- | --- |
| Scope | **A + B + C + D full suite** + Phase E (34 portraits) + Phase F |
| Portraits | **All 34** to be generated; Phase E decision gate still subject to acceptance tests |
| Storage | **`assets/` + WebP files** (base64 `js/assets-*.js` storage rejected) |

Under the expanded scope, visual routines in `robots.js`, `projectile.js`, `skill-fx.js`, and `parts.js` render raster atlases/sprites. Physics, hitboxes, and timing remain in code; procedural Canvas fallbacks remain active until assets load.

---

## 1. Measured Hardware Baseline (November 14, 2026)

### 1.1 ai3090 Environment Inventory

| Item | Status |
| --- | --- |
| Hardware | RTX 3090 24 GB, ComfyUI 0.45.0 **active**, queue empty, 231 GB free disk |
| Vision Model | **Z-Image-Turbo** bf16 (`z_image_turbo_bf16.safetensors`) + TE `qwen_3_4b` + VAE `ae` |
| Image Editing | **Qwen-Image-Edit-2511** fp8mixed + Lightning 4-step LoRA (`ai edit`) |
| Background Removal | `birefnet.safetensors` installed (`models/background_removal`) — native ComfyUI node |
| 3D Pipeline | TRELLIS.2 int8 (`ai 3d`) + Blender turntable |
| Video / Animation | LTX-Video 0.9.8 (2B + 13B distilled fp8), `ai anim` sprite/loop pipeline |
| **Missing Components** | **No** SDXL checkpoints, `controlnet/` **empty**, `upscale_models/` **empty**, `loras/` contains only Qwen-Edit Lightning, **no custom nodes** (except `websocket_image_save`) |
| Output Path | `C:/Orca/Command Center/ai-center/{images,edit,video,audio}` |

### 1.2 Measured Generation Benchmarks (Z-Image, 8 steps, `ai image`)

| Workload | ComfyUI Execution Time | Wall-Clock Time |
| --- | --- | --- |
| 1024×1024, cold (including model load) | 24.2 s | 26 s |
| 1280×720, warm | 16.0 s | 17 s |

Average generation speed is **16–25 s per image**. 12 candidates per zone take ≈ 4 min; 9 zones take ≈ 36 min of raw compute. Prior estimates ("SDXL + Lightning in 1–2 s") are **invalid** on this setup due to the absence of SDXL.

### 1.3 `ai image` Contract Constraints

`~/ai/gen.py` pipeline: `KSampler(cfg=1, sampler=euler, scheduler=simple)` + `ConditioningZeroOut` on negative conditioning branch. Implications:

1. **Negative prompts are ineffective.** `ConditioningZeroOut` zeroes negative embeddings; at `cfg=1`, negative conditioning is mathematically ignored. Placing negative terms like "photorealistic, text, watermark" has zero effect. Constraints must be incorporated directly into positive prompt phrasing ("flat vector only, blank background") or resolved via candidate curation.
2. **Narrow parameter space:** `--size --steps --n --seed`. Style weights, ControlNet, and IPAdapter are absent. Visual cohesion is achieved through **prompt scaffolding + fixed seed families + post-processing palette normalization + Qwen-Image-Edit touchups** (Phase A).

> Verification artifacts: `ai-center/images/img_00024_.png` (flat vector industrial arm — bold outline, 3-color palette, exact target style) and `img_00025_.png` (factory skyline, 1280×720, ready for distant parallax backdrop). Both generated on first attempt; however, they exhibit **low contrast / excessive greys**, requiring automated palette normalization across all assets.

### 1.4 Repository Integration Constraints

- No initial `assets/` directory existed; all original game graphics were procedurally rendered (`robots.js`, `maps.js`, `parts.js`).
- Sky & backdrop rendering: `js/game.js:3895-3896` → `drawSky()` (`maps.js:308`) + `drawBackdrop()` (`maps.js:371`) → **`_buildBackdrop(theme, W, H)`** (`maps.js:439`) caches composite offscreen canvases keyed by theme and dimension. Raster layers insert here with near-zero per-frame CPU overhead.
- Map preview render pipeline: `drawMapPreview()` (`maps.js:983`) must render the identical raster layers downscaled to preserve visual parity between menus and matches.
- Surface textures: `terrain.js:331-332` `paintSurfaceBand()` + `paintProps()` render into an offscreen **terrain canvas**, correctly eroding alongside blast craters without additional logic.
- `file://` compatibility: `fetch()` is forbidden; `<img>` and `data:` URIs are fully functional; `getImageData` is not called in gameplay code, meaning Canvas security tainting is harmless.
- Build packaging: `tools/build.js` defines `PACKAGE_DIRS = ["css","js","fonts","assets"]`. The local dry-package and art gates use a **500 MiB** ceiling; verify each distribution platform's current upload limit separately before publishing.
- Fixed test suites: `tests/run.js` FILES, `tests/harness.js` FILES, `tests/audio.js`.
- Host machine has **Python 3.12 + Pillow 13**, allowing image cropping, palette quantization, and WebP conversion to execute via Python inside `tools/` without adding npm dependencies.

---

## 2. Deviations from Historical Planning

| Historical Assumption | Measured Reality | Adopted Decision |
| --- | --- | --- |
| "Primary generator: SDXL + Illustrious/NoobAI + Lightning, 1–2 s" | SDXL not installed on ai3090 | Primary generator is **Z-Image-Turbo**; SDXL setup skipped |
| "Train custom style LoRA (ai-toolkit/kohya)" | No training harness or SDXL checkpoint | Style enforcement: **prompt scaffold + seed family + palette normalization + Qwen-Edit** |
| "Mandatory negative prompt scaffold" | cfg=1 + `ConditioningZeroOut` | Negative conditioning **disabled**; constraints placed in positive phrasing + curation |
| "Consistency via ControlNet/IPAdapter/LayerDiffuse" | Custom ComfyUI nodes unavailable | Avoid external nodes; handle alpha and refinement in post-processing |
| "4× AI upscaling followed by downsampling" | `upscale_models/` directory empty | **Generate at 2× target resolution, downsample 1×** |
| "Historical speed estimates" | Measured 16–25 s per frame | Work schedules updated to §1.2 benchmarks |

---

## 3. Style Lock Pipeline (Phase A Output)

Aesthetic consistency is established across **four systematic layers**:

1. **`STYLE_CARD`** (`assets/styles/card.md`, versioned in repo): A standardized prefix applied to all prompt templates:
   `flat vector, 2d, cel shading, thick dark outline, 4-color limited palette, muted desaturated, clean edges, no text, no watermark`
2. **Seed Families:** Fixed seed bases per asset tier (`bg=140000`, `tex=240000`, `ui=340000`, `portrait=440000`), generating variations via `seed = base + a*17 + b`. Identical prompt + matching seed reproduces identical assets. Generation parameters are versioned in `assets/manifest.json`.
3. **Palette Normalization** (`tools/art-prep.py`): Scale to target dimensions → quantize to a **5-color palette** derived from the zone's `BIOMES[zone]` theme → clamp saturation ceilings (`S ≤ 0.45` for backdrops / `≤ 0.75` for UI) → 2× Lanczos resample with subtle unsharp mask → export to WebP. This step eliminates AI color drift and muted greys deterministically.
4. **Qwen-Image-Edit Touchups:** When candidate compositions are strong but contain extraneous details, apply `ai edit <png> "flatten shading, remove small details, keep silhouette, flat vector"` in 4 steps (≈ 6–10 s).

**Acceptance Gate (Phase A):** 6 candidates generated with the prompt scaffold; at least **4** must visually belong to the same game universe, and palette variance across candidates must maintain an average ΔE < 12.

---

## 4. Asset Inventory and Production Sequence

| # | Asset Tier | Quantity | Sequencing Rationale | Estimated Duration |
| --- | --- | --- | --- | --- |
| A | Toolchain + Zone 1 Prototype | — | Foundation for all downstream assets | 1 session |
| B | Zone Backdrops (far skyline + mid silhouette) | 9 zones × 2 | Maximum visual impact, zero animation dependencies | 2 sessions |
| C | Terrain Textures (sheet metal, rust, frost, ash, sand, oil, concrete, steel grate) | 8+2 tileable | Feeds directly into destructive terrain rendering | 1 session |
| D | UI Kit (panels, hazard stripes, rivet badges, 6 icons) | 9 | Enhances store screenshots and HUD readability | 1 session |
| E | Character Roster Portraits | 34 | High consistency requirements → **decision gate** | 3–4 sessions |
| F | Marketing Collateral (key art, store capsules, itch banner) | ~6 | Non-packaged assets, zero bundle size impact | ½ session |

**Sequence: A → B → C → D → (Phase E Decision) → F.**

---

## 5. Development Phases

Each milestone represents a **single atomic commit**; subsequent phases do not commence until acceptance criteria pass.
Rollback procedure: Removing an asset entry from `assets/manifest.json` automatically causes the renderer to fall back to procedural Canvas graphics (§7.1).

### Phase A — Toolchain + Scrapyard Prototype ✅ (November 14, 2026, Complete)

1. `tools/art.js` (Node, zero dependencies):
   - `node tools/art.js gen --zone scrapyard --layer far --n 6` → Calls `ai image` on ai3090 (fixed seed family + `STYLE_CARD`), saving raw candidates to `art/build/scrapyard/far/`.
   - `node tools/art.js prep --zone scrapyard --layer far` → Invokes `tools/art-prep.py` (quantize + WebP + register in manifest).
   - `node tools/art.js check` → Executes `tools/art-gate.js`.
2. `tools/art-prep.py` (Python + Pillow, dev-only dependency outside production package): Handles dimensions, palette quantization, saturation ceilings, WebP quality, sharpening, and `assets/manifest.json` updates.
3. `tools/art-gate.js` (Node, zero dependencies): Enforces manifest-to-disk consistency, per-asset and aggregate bundle budgets, PNG/WebP header dimensions, and packaging inclusion.
4. `assets/styles/card.md` + initial `assets/manifest.json` definitions.
5. **Scrapyard** (`scrapyard`) end-to-end prototype: `far` + `mid` layers, 1920×1080 master downsampled to 960×540 WebP.

Acceptance:
- `node tools/art-gate.js` passes.
- `index.html` opened via `file://` renders procedural graphics prior to asset load, seamlessly swapping in raster layers upon completion (§7.1).
- `node tests/run.js` passes.
- Palette compliance: Backdrops remain strictly within the zone's 5-color palette limit.

### Phase B — 9 Zone Environments

Zones (`maps.js` `BIOMES`): `scrapyard, assembly, warehouse, cooling, paint, loading, waste, sandblast, foundry` (9 total).

Two layers per zone:
- `far` — Distant silhouette, **opaque**, renders over sky gradients (`drawSky` gradient remains; silhouette comes from raster).
- `mid` — Midground industrial machinery, **with alpha channel** (extracted via BiRefNet/chroma), tucked below ground haze bands.

Integration: `maps.js > _buildBackdrop()` replaces procedural `_hillLayer`/`_ridgeLayer` calls with `drawImage`; missing images fall back to legacy procedural routines. `drawMapPreview()` uses downscaled instances of the same layers.

Acceptance: All 9 zones have `far` + `mid` assets; menu previews match in-game matches; `node tests/run.js` and `node tools/build.js --dry` pass; aggregate backdrop size ≤ 1.5 MB.

### Phase C — Surface Textures

10 **tileable** textures (512² master → 512² WebP): painted metal, rust, frost, ash, sand, oily water, concrete, steel grate, hazard stripes, weld seams.
Prompt suffix: `..., seamless tileable texture, top-down flat lighting, no vignette, even edges`. Validated using a **2×2 tiling boundary check** in `tools/art-gate.js` (edge pixel variance < threshold).

Integration: `terrain.js:331` `paintSurfaceBand()` + body fills; sand/ash bands in `maps.js` bind textures using `createPattern`. Textures rasterize into the offscreen terrain canvas and deform naturally during explosions.

Acceptance: Textures tile seamlessly in 2×2 grids; aggregate size ≤ 1.2 MB; `node tests/run.js` passes.

### Phase D — UI Kit

9 assets: 9-slice panel frames, horizontal hazard tape, rivet badges, screw caps, and 5 HUD/menu icons (audio, language, fullscreen, market, settings) in dark/light variants.
Integration: `css/style.css` (`border-image` / `background-image`) following `docs/ui-theme-plan.md`. **Typography is never baked into images**; text renders via DOM/Canvas fonts.

Acceptance: 9-slice panels scale across 3 test aspect ratios without distortion; visual audit via `ai shot`; total size ≤ 400 KB.

### Phase E — Character Roster Portraits (Decision Gate)

Target: 34 characters × 3–4 candidates.
Workflow: Generate 1 master robot silhouette → adapt individual characters via `ai edit` using consistent character prompts → BiRefNet alpha cutout → 256×256 WebP with palette normalization.
Gate criteria: Silhouettes remain distinguishable downsampled to 24 px; total bundle footprint ≤ 1 MB (otherwise portraits are excluded from core bundle and loaded lazily).

### Phase F — Marketing Assets

Key art (1920×1080), itch banner (630×500), Steam capsules (616×353 / 1920×620).
Excluded from runtime bundle. AI disclosure documented in `docs/steam-release-plan.md` §3.

---

## 6. Asset File Specification

```
assets/
  styles/card.md                  # STYLE_CARD + seed baselines
  manifest.json                   # Single source of truth
  bg/<zone>-far.webp              # 960×540, opaque
  bg/<zone>-mid.webp              # 960×540, alpha
  tex/<name>.webp                 # 512×512, tileable
  ui/<name>.webp                  # 9-slice frames and icons
  portraits/<charId>.webp         # 256×256, alpha
  gameplay/<scene>-background.png # selected high-fidelity key art, lossless
art/build/                        # Source masters and candidate pools (.gitignore)
```

`manifest.json` schema:

```json
{
  "id": "bg/scrapyard-far",
  "file": "assets/bg/scrapyard-far.webp",
  "w": 960,
  "h": 540,
  "alpha": false,
  "kb": 74,
  "seed": 140017,
  "size": "1920x1080",
  "steps": 8,
  "prompt": "...",
  "palette": ["#...", "#..."],
  "phase": "B",
  "gate": "ok"
}
```

Rules:
- WebP is the default raster output. Selected high-fidelity key art may use PNG via `node tools/art.js pick --format png`.
- Raster filenames must match `manifest.id` plus `.webp` or `.png`; missing, mismatched, or unindexed files fail `art-gate`.
- `prompt`, `seed`, and `size` must be preserved for **deterministic reproducibility**.
- `art/build/` is excluded from git tracking via `.gitignore`.

---

## 7. `file://` Protocol Integration Rules

### 7.1 Asset Loading and Procedural Fallback Pattern

`fetch()` is prohibited under `file://`: Use `new Image()` with relative paths. Every renderer follows this strict fallback contract:

```js
// Procedural fallback renders BEFORE asset load; raster renders once complete.
const img = assetImage("bg/scrapyard-far"); // returns null | HTMLImageElement
const ready = img && img.complete && img.naturalWidth > 0;
if (ready) {
  ctx.drawImage(img, 0, 0, W, H);
} else {
  drawProceduralBackdrop(ctx, W, H, theme);
}
```

`assetImage()` resides in `js/assets.js`: handles lazy `new Image()` instantiation and returns `null` on error without flooding the console with retry attempts. Preloading triggers during initial boot in `js/main.js`.

### 7.2 Canvas Tainting

Loading external files onto a Canvas over `file://` flags the canvas as tainted. Because the game engine never calls `getImageData`, `toDataURL`, or `toBlob` during gameplay, tainting is completely harmless. If pixel-readback is ever required, the affected asset must be bundled as an inline data URI in `js/assets-*.js` (see `docs/ai-visual-production-plan.md` §7.2).

### 7.3 Determinism and RNG Isolation

`robots.js` contains zero `Math.random` or `Date.now` invocations. Image rendering consumes zero RNG cycles; image load timing cannot alter game logic or desynchronize matches.

### 7.4 Packaging and Test Suite Files

- `tools/build.js`: Append `"assets"` to `PACKAGE_DIRS`; `tests/release.js` packaging test inspects this list.
- File-based WebP assets are ignored by headless Node tests (which do not load DOM images), keeping test runs fast and deterministic.

### 7.5 Asset Size Budget

| Asset Group | Target Budget | Upper Bound |
| --- | --- | --- |
| Backdrops (9 zones × 2 layers) | 1.0 MB | 1.5 MB |
| Textures (10 surface sets) | 0.8 MB | 1.2 MB |
| UI Kit (9 components) | 0.25 MB | 0.4 MB |
| Character Portraits (34 units) | 0.7 MB | 1.0 MB |
| **Total Production Bundle** | **~2.8 MB** | **~4.1 MB** |

The local dry-package ceiling is 500 MiB; `tools/art-gate.js` asserts it continuously. Distribution portals may enforce lower upload limits, which remain a separate release check.

---

## 8. Generation and Build Commands

```bash
# Generation on ai3090 target node
ai image "<STYLE_CARD>, factory scrapyard, distant silhouette layer" \
  --size 1920x1080 --steps 8 --seed 140017 --n 6 --on ai3090

# Post-processing and refinement
ai edit art/build/scrapyard/far/cand-03.png \
  "flatten shading, remove small details, thicker outline, keep silhouette" --steps 4

# Alpha extraction (BiRefNet), palette quantization, and gate checks
node tools/art.js prep --zone scrapyard --layer mid
node tools/art-gate.js
node tools/build.js --dry

# Verification test suites
node tests/run.js
node tests/release.js
node tests/i18n.js
```

---

## 9. Risk Matrix and Mitigations

| Risk | Indicator | Mitigation |
| --- | --- | --- |
| Style drift | Backdrops look more painterly than characters | Palette normalization; strict ΔE gate |
| Z-Image muddy greys | Washed out, low-contrast silhouettes | Specify explicit colors in prompt (`oxide red, bruised teal`); quantize palette |
| Missing negative prompt | Unintended text, signatures, or human faces | Generate 6 candidates; curate and clean via `ai edit` |
| Character portrait divergence | 34 robots lack shared visual lineage | Master robot template + `ai edit` variations |
| Bundle size inflation | Exceeding local 500 MiB ceiling or a platform's lower upload cap | Enforce `art-gate` budgets; check platform-specific caps before publishing; clamp general WebP quality at q82 |
| Packaging omission | Visuals missing from release ZIP | Register `assets` in `PACKAGE_DIRS` in `build.js` + assert in `release.js` |
| `file://` cold start flicker | Blank sky or white boxes on first frame | Procedural Canvas fallback rendering until assets load |
| Desynchronization | AI bots make divergent decisions | Visual render routines forbidden from consuming gameplay RNG |
| Candidate over-generation | Stalling in creative review | Cap candidate generation at 6–12 images per asset |

---

## 10. Engineering Effort

| Phase | Sessions | Output |
| --- | --- | --- |
| A | 1 | Toolchain + Zone 1 prototype |
| B | 2 | 18 backdrop layers across 9 zones |
| C | 1 | 10 terrain surface textures |
| D | 1 | Complete UI kit |
| E | 3–4 | 34 character roster portraits |
| F | ½ | Marketing and capsule assets |

Phases A–D require **5 sessions**, establishing the complete visual environment of the game.

---

## 11. Licensing Compliance

| Tool / Model | License | Status |
| --- | --- | --- |
| Z-Image-Turbo | Apache 2.0 | ✅ Commercial use permitted |
| Qwen-Image-Edit-2511 | Apache 2.0 | ✅ Commercial use permitted |
| BiRefNet | MIT | ✅ Commercial use permitted |
| TRELLIS.2 | Pending check | ⚠️ Omitted from runtime production |
| LTX-Video 0.9.8 | Lightricks Open Weights | ⚠️ Used only for marketing teasers; no runtime video assets |

Steam releases containing AI-generated visual content must include an **AI Content Disclosure** in the store questionnaire (`docs/ai-visual-production-plan.md` §8). Disclosure copy is integrated into `docs/steam-release-plan.md` §3.

---

## 12. Phase A Implementation Log — Artifacts and Root Cause Fixes (November 14, 2026)

### 12.1 Deployed Modules

| File | Purpose |
| --- | --- |
| `assets/styles/card.md` | `STYLE_CARD` + layer tails + zone palettes + seed baselines |
| `assets/manifest.json` | Asset registry: prompts, seeds, resolutions, palettes, measurements |
| `js/assets-manifest.js` | Compiled runtime index (`ASSET_INDEX`) for direct access without `fetch()` |
| `js/assets.js` | `assetImage`, `assetPreload`, `drawBackdropAsset`, `drawPreviewAsset` |
| `js/maps.js` | Raster backdrop branches in `drawBackdrop` and `drawMapPreview` with Canvas fallback |
| `js/main.js` | Boots asset preloading via `assetPreload()` during game start |
| `tools/art.js` | Orchestrates candidate generation, selection, indexing, and gate checks |
| `tools/art-prep.py` | Crop, downsample, sharpen, normalize saturation, quantize, matte alpha, export WebP |
| `tools/art-gate.js` | Validates schema, file presence, size limits, indexing, and tileability |
| `_art_probe.html` | Visual probe rendering environment backdrops without terrain |
| `tests/release.js` | Release gate validating manifest ↔ disk ↔ ZIP package consistency |
| `tools/build.js` | Packages `assets/` while excluding development styles and raw manifests |

Generated assets: `assets/bg/scrapyard-far.webp` (27.5 KB) and `assets/bg/scrapyard-mid.webp` (7.2 KB).
Production package size: **1080.8 KB across 41 files** (well below the 50 MB Poki limit; this is the historical measurement recorded for the earlier package).

### 12.2 Resolved Pipeline Issues

| # | Symptom | Root Cause | Solution |
| --- | --- | --- | --- |
| 1 | `ai image` output path unresolved; file copy failed | Target path contained spaces (`Command Center`); regex `\S+` truncated path | Use newline/pipe boundary pattern `/[^\n|]*?\.png/` |
| 2 | Chroma key background failed to isolate | Z-Image output sage green rather than `#00ff00`, failing static threshold | Auto-detect chroma key from edge median (`--chroma auto`) |
| 3 | Faint rectangular border remained around cutout | Background had subtle gradient; distance cutoff failed near corners | Flood-fill from outer edges + clamp corner pixels to zero alpha |
| 4 | Midground asset centered vertically, blocking combat plane | Aspect ratio scaling centered elements in the middle of 960×540 canvas | `--band 0.42`: Crop bounding box, scale to band height, align to bottom |
| 5 | Midground storage tanks appeared hollowed out | 5-color palette mapping shifted intermediate metal tones to sky color | Assign dedicated `silhouettePalette` (3 warm earth tones) + `--value 0.9` |

Documenting these issues prevented identical errors across the remaining 8 zones in Phase B.

### 12.3 Deferred Items (Handed off to Phase B)

- **Cloud rendering divergence:** Procedural `drawClouds` rendered white shapes that clashed with the raster backdrop. Deferred to Phase B to either toggle off per zone or replace with raster cloud layers.
- Generate remaining 8 zones × 2 layers (§5 Phase B).
- `bg/scrapyard-mid` palette deviation reached 39 (warning threshold 20): Add explicit color keywords to prompt ("oxide brown, slate grey").

### 12.4 Verification Status

```
node tools/art-gate.js   27/27 passed
node tests/run.js        1315/1315 passed
node tests/release.js    49/49 passed
node tests/net-game.js   123/123 passed
node tools/build.js --dry → 1080.8 KB / 41 files
```

### 12.5 Art Direction Tuning — "Clean Skylines Over Muddy Rubble"

Initial test render: `probe-battle3.png`. User critique: **cranes and heavy machinery approved**, **cluttered rubble heaps rejected** (muddy visual noise). The production recipe was adjusted to prioritize clarity:

| Parameter | Original | Revised |
| --- | --- | --- |
| Far layer content | "Rubble piles + cranes" | **Clean industrial skyline**: Cranes, exhaust stacks, geometric masses — NO rubble |
| Rubble and scrap detail | Baked into backdrop image | Procedural foreground props (`maps.js > paintProps`) |
| Layer tint | Source image natural colors | `--haze 0.2` (atmospheric perspective blending with sky) |
| Horizon baseline | Image natural horizon (~0.72 H) | `--base-at 0.62` (aligned to upper terrain contour) |

Four defects resolved during this tuning pass:

1. **Lost color direction:** Minimal silhouette prompts lacked color terms, producing beige skies and black silhouettes that quantized into dull greys. → Explicit color tokens added ("slate teal sky, oxidized brown") paired with `--haze` and `--floor` color locking.
2. **Ground noise speckled into artifacts:** Horizon row was calculated from the lowest dark pixel row, causing textured ground to register as the bottom edge and skipping floor painting. → `detect_ground_row()`: Identifies horizon via horizontal pixel variance (flatness).
3. **Horizontal banding artifacts:** Vertical gradients applied to the floor separated into harsh lines in the 5-color palette. → Replaced with a single solid flat color.
4. **Silhouettes obstructed the combat plane:** Raising the floor line pushed silhouette towers directly behind robot heads. → Receded elements via `--haze` and 0.62 baseline anchoring.

Tooling expanded in `tools/art.js pick`: `--simplify` (median filtering on master), `--haze`, `--floor` + `--base-at`, `--band` (bottom-anchoring for mid layers), `--value`, `--palette`, `--sat`.

**Remaining Visual Item:** Procedural cloud blobs (`maps.js > drawClouds`) appear simplistic against flat raster silhouettes; to be resolved in Phase B by disabling in factory biomes or migrating to raster cloud sprites.
