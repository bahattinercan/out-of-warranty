# Local AI Visual Asset Production Plan (Dökümhane-9)

Date: October 9, 2026
Status: Research complete; implementation has not started.
Scope: **Local** (zero-subscription) AI visual asset generation for this game — model selection, toolchains, production pipelines, and integration constraints under a `file://` architecture.

Target hardware (user specified): **RTX 3090 24 GB + Ryzen 7 5700X + 32 GB RAM**.
(Note: The development machine in this repository is an RTX 3050 Ti 4 GB — asset generation is not performed there; it is used only for integration testing.)

> **Revision (November 14, 2026) — Implementation plan in separate document:**
> This file serves as the **research and architectural decision** record; concrete implementation steps and physical benchmarks reside in [`docs/plans/art/art-production-plan-ai3090.md`](./art-production-plan-ai3090.md), which takes precedence in any contradiction.
> Three key updates: (1) The ai3090 generation node **lacks SDXL**, adopting **Z-Image-Turbo** as the primary engine (Apache 2.0, measured 16–25 s/image: 1024² cold 24.2 s, 1280×720 warm 16.0 s); (2) The `ai image` graph operates at `cfg=1` + `ConditioningZeroOut`, making **negative prompts ineffective** — §4's negative prompt template serves as guidance only, with consistency enforced via prompt templates + seeds + palette quantization + Qwen-Image-Edit; (3) `controlnet/`, `upscale_models/`, and custom nodes are **unpopulated** — §3.1 represents architectural assumptions, not the active configuration on that date.

---

## 0. TL;DR — Decision Matrix

| Requirement | Selection | Rationale |
| --- | --- | --- |
| Primary production workhorse (characters, icons, sprites, cards) | **SDXL-based Illustrious/NoobAI derivative checkpoint** + Lightning 4-step LoRA | 1–2 s/image on 3090; 5000+ LoRAs and 5+ ControlNets; best matches `flat_colors / cel_shading / vector_art` tokens |
| Backdrops / key art (high fidelity) | **Qwen-Image 2.x** (Apache 2.0) or **FLUX.2 [klein] 4B** (Apache 2.0) | Commercially viable; native 2K/4MP; FLUX.2 multi-reference provides zone variants |
| Highest quality (non-commercial) | **FLUX.2 [dev] Q4_K_M GGUF** | Fits in 24 GB; multi-reference consistency; non-commercial license |
| Legible in-image text (signs, decals, UI mockups) | **Qwen-Image 2.x** | Best text rendering among open-weight models, Apache 2.0 |
| Transparent (alpha) assets | **Qwen-Image-Layered** (RGBA layer separation, Apache 2.0) or LayerDiffuse + **BiRefNet** cleanup | Isolated layers decouple characters from background; BiRefNet is MIT and native to ComfyUI |
| Aesthetic consistency | **Single "DÖKÜMHANE-9" style LoRA** + IPAdapter/Reference + ControlNet | Style LoRA unites entire roster under shared visual language; per-character LoRAs reserved for 3–5 hero units |
| LoRA training harness | **ai-toolkit** (MIT) for modern architectures; **kohya sd-scripts** for SDXL/FLUX.1 | ai-toolkit publishes validated 24 GB reference configs |
| Upscaling pipeline | **4x-UltraSharp / Real-ESRGAN** (batch) + **SeedVR2** (restoration) | Rule: *Generate high-res, downscale to target* |
| Generation interface | **ComfyUI** (+ SwarmUI or Krita AI Diffusion frontend) | Full support for ControlNet/IPAdapter/GGUF/LayerDiffuse chains |
| Animation (optional) | Code-driven **cut-out puppet** (recommended) · **Wan 2.2 Animate** (alternative) | Existing `robots.js` rig is already articulated; switching to raw sprite sheets is a regression |

**Critical for commercial release:** FLUX.1 [dev] and FLUX.2 [dev] are **non-commercial**. For paid Steam releases, use Apache 2.0 models (Qwen-Image, FLUX.2 klein 4B, FLUX.1 schnell, Z-Image) or verified commercial SDXL derivatives.

---

## 1. Hardware Realities: RTX 3090 Capabilities and Limits

### 1.1 Hardware Strengths

- **24 GB VRAM**, the optimal sweet spot: comfortably accommodates SDXL + ControlNet + IPAdapter + LoRA stacks; runs FLUX.2 [dev] Q4/Q5 GGUF.
- **~936 GB/s memory bandwidth** — Ampere's main advantage; because diffusion models are largely memory-bandwidth bound, the 3090 performs comparably to newer mid-tier GPUs.
- Broad community support: virtually all training and inference toolchains target Ampere as a first-class tier.

### 1.2 Limitations and Architectural Trade-offs

| Factor | Status | Impact |
| --- | --- | --- |
| FP8 Tensor Cores | **Absent** (introduced in Ada/Hopper) | FP8 checkpoints run without native acceleration. **Prefer GGUF Q8/Q6 or fp16/bf16.** NVFP4 is unsupported. |
| 32 GB System RAM | Near ceiling for FLUX.2 [dev] | Community recommends 64 GB; however, FLUX.2 [dev] Q8_0 + Mistral Q8 runs on 32 GB (RAM at 65–77%, VRAM 22–23 GB). Model swapping takes minutes; keep background processes minimal. |
| Memory Bandwidth | Close to RTX 4090 (936 vs 1008 GB/s ≈ 93%) | Performance delta stems from **compute** and lack of FP8: 4090 offers ~2.3× fp16 tensor and ~4.6× fp8 throughput. Expect 1.2–1.8× longer inference times. |
| SageAttention | **10–15%** gain on 3000 series (up to 40% on 4000/5000) | Worth enabling, but yields modest speedups. |
| Triton / `torch.compile` | Difficult setup on Windows; high speedup on Ampere | Optional long-term enhancement; unnecessary for initial rollout. |

### 1.3 Expected Generation Throughput (Rough Baseline, 1024²)

> ⚠️ **These figures represent community estimates.** Values for FLUX.2 [dev] and Qwen-Image 2.x are unverified on local hardware. Benchmark on the target machine and update with empirical measurements.

| Task | Estimated Wall-Clock Time |
| --- | --- |
| SDXL + Lightning (4–8 steps) | **1–2 s** |
| SDXL standard (25–30 steps) | 4–7 s |
| SDXL + ControlNet + IPAdapter | 3–6 s |
| FLUX.1 [dev] fp16/Q8 | 15–30 s |
| Qwen-Image 2.x (Lightning/4–8 steps) | 4–10 s |
| FLUX.2 [dev] Q4 GGUF, 1–2 MP | 40–120 s (longer with model swapping/offloading) |
| Wan 2.2 Animate 14B, 33 frames 480p | 5–20 min |

### 1.4 Storage and OS Environment

- Model repository requires **300–500 GB** for multi-family checkpoints and GGUFs. NVMe SSD storage is mandatory; SATA SSDs introduce severe model-loading latency.
- **ComfyUI Portable (Windows)** is sufficient; WSL2 yields minor speed improvements but adds maintenance overhead. Recommendation: Start with Portable.
- Display drivers: Current Studio or Game Ready drivers (CUDA 12.x+).

---

## 2. Model Landscape (October 2026) and Selection Criteria

### 2.1 Model Family Comparison

| Model | Parameters | Min VRAM (Quantized) | Commercial License | Target Role in Game |
| --- | --- | --- | --- | --- |
| **SDXL** + Illustrious/NoobAI derivative | 3.5 B | 6–8 GB / 12 GB comfortable | OpenRAIL++ (SDXL); derivatives: Fair AI Public License → **verify card** | **Primary engine.** Speed, LoRA/ControlNet ecosystem, flat/cel-shaded style. |
| **FLUX.1 [schnell]** | 12 B | ~7 GB GGUF | Apache 2.0 ✅ | Commercially safe, rapid prototyping |
| **FLUX.1 [dev]** | 12 B | 12–16 GB fp8 | **Non-commercial** | Concept art only |
| **FLUX.2 [dev]** | 32 B | Q4_K_M 20.1 GB (24 GB VRAM limit with text encoder offload) | **Non-commercial** | Maximum fidelity + multi-reference; concept art/key art. Sits at the 24 GB hardware limit. |
| **FLUX.2 [klein] 4B** | 4 B | ~13 GB | **Apache 2.0 ✅** | Commercially safe, ~0.5 s in 4 steps; environment/variant generation |
| **Qwen-Image 2.x** | 7 B (vision) | ~8–16 GB fp8/GGUF | **Apache 2.0 ✅** | Native 2K, **accurate text rendering**, robust inpainting — balanced commercial choice |
| **Qwen-Image-Layered** | Qwen-based | Qwen class | **Apache 2.0 ✅** | **RGBA layer decomposition** — ideal for 2D game assets |
| **Z-Image Turbo** | 6 B | <16 GB | **Apache 2.0 ✅** | Fast drafting and iterative exploration |
| **Krea 2 Turbo** | 12 B | ~12 GB fp8 | Community (annual revenue < $1M) | Photorealism; secondary utility for stylized art |
| **Ideogram 4.0** | 9.3 B | ~24 GB nf4 | **Non-commercial** | Typography prototyping only |
| **HunyuanImage 3.0** | 80 B MoE | ~80 GB | Community | Exceeds 3090 VRAM; excluded |
| **HiDream / ERNIE-Image / Chroma** | 8–17 B | 16 GB+ | MIT / proprietary / Apache (verify) | Secondary alternatives |

### 2.2 Rationale for SDXL as Primary Workhorse

1. **Throughput**: 4 steps with Lightning/Turbo LoRA yields 1–2 s per image, allowing generation and triage of 300–500 variants daily. The pipeline bottleneck is creative curation, not inference time.
2. **Precision Control**: `controlnet-union-sdxl` provides canny, depth, pose, and lineart in a single unified model. Silhouettes must be locked tightly to match data-driven collision boxes.
3. **Ecosystem**: Over 5,000 community LoRAs provide off-the-shelf bases for "lineless cel shading", "vector art", and "industrial" aesthetics.
4. **Licensing**: SDXL OpenRAIL++ permits commercial usage, subject to individual derivative model card terms.

### 2.3 Tiered Model Architecture

- **Velocity Tier (SDXL)**: 100 variants in 30 minutes for composition and silhouette exploration.
- **Fidelity Tier (Qwen-Image 2.x / FLUX.2 klein)**: Upscale and refine selected variants to 2K resolution.
- **Alpha Layer Tier (Qwen-Image-Layered / LayerDiffuse + BiRefNet)**: Extract clean transparency channels.
- **Mastering Tier (4x-UltraSharp / SeedVR2)**: Produce final store capsules, banners, and key art.

---

## 3. Toolchain Configuration

### 3.1 Core Setup

1. **ComfyUI Portable (Windows)** — Deploy with `ComfyUI-Manager`.
2. **SageAttention + Triton** (AI-windows-whl pre-built wheels or community install scripts) → launch with `--use-sage-attention`.
3. Essential custom node packages:
   - `ComfyUI-Manager`
   - `ComfyUI-GGUF` (city96) — For quantized Q4/Q5/Q8 large checkpoints
   - `ComfyUI-Impact-Pack` (detailers, masking, segmentation)
   - `comfyui_controlnet_aux` (preprocessors for pose, depth, canny, lineart)
   - `ComfyUI_IPAdapter_plus`
   - `ComfyUI-layerdiffuse` or `ComfyUI-LayerDiffusePlus`
   - `rgthree-comfy`, `was-node-suite-comfyui` (workflow utilities)
   - `ComfyUI-SeedVR2_VideoUpscaler`, SUPIR/CCSR (upscaling)
   - Native BiRefNet (background removal)
4. Model layout: Organize inside `ComfyUI/models/{checkpoints,loras,controlnet,ipadapter,unet,clip_vision,vae}`.
5. Storage routing: `models/unet` for GGUF weights; `models/text_encoders` for standalone text encoders (e.g., Mistral for FLUX.2).

### 3.2 Alternative Frontends

| Tool | Recommended Use Case |
| --- | --- |
| **SwarmUI** | Clean UI layer over ComfyUI backend; simplifies batch variant management |
| **Krita AI Diffusion** | Inpainting directly onto existing illustrations via digital painting |
| **InvokeAI** | Canvas-based spatial composition and layered editing |
| **Forge / A1111** | Streamlined SDXL prototyping |
| **Fooocus** | Zero-configuration initial environment validation |

> **Version workflow graphs as JSON in git.** Preserving execution graphs ensures reproducibility across the team.

---

## 4. Visual Art Direction and Prompt Scaffolding

Target direction from `docs/robot-theme/01_WORLD_AND_ART_DIRECTION.md`: **Industrial yet charming, muted low-contrast environments, bold dark outlines + flat cel shading, minimal material palette, legibility over clutter**.

Because modern diffusion models bias toward photorealistic, high-frequency surface detail, prompt scaffolding and negative constraints are mandatory:

**Positive Prompt Template (SDXL/Illustrious):**
```
vector_art, clean_lines, flat_colors, cel_shading, thick dark outline,
limited palette, painted sheet metal, rivets, hazard stripes,
industrial factory interior, muted desaturated background, simple background,
game asset, centered, side view, 2d
```
**Negative Prompt Template:**
```
photorealistic, 3d render, octane, gritty, dark, low contrast, text, watermark,
signature, human face, animal ears, tail, paws, busy detail, cluttered, depth of field
```

**Prompt Engineering Rules:**
- Restrict materials to a maximum of 3 explicit surfaces (e.g., "painted steel, dark rubber, brass").
- Team colors: Prevent primary colors from flooding the chassis; designate as "accent light only".
- Environments: Enforce "desaturated, low saturation" on backdrops; use "high saturation accent" for robots.
- Determinism: Lock seeds and sampler/CFG pairings during iteration; vary prompts only.

---

## 5. Scope Boundaries: Where AI Fits and Where It Does Not

### 5.1 High ROI / Low Risk ✅

| Asset Category | Volume | Rationale |
| --- | --- | --- |
| Factory zone backdrops + sky/parallax planes | 9 zones × 2–3 layers | Zero animation dependencies; highest visual upgrade per asset |
| Surface textures (sheet metal, rust, frost, ash, oil, sand) | ~10 tileable sets | Textures represent diffusion models' most reliable output |
| UI frames, panels, hazard tape, rivet badges | ~10 assets | Aligns with `ui-theme-plan.md` Milestone K3 industrial aesthetic |
| Equipment icons (24), module icons (34), projectiles (27) | ~85 icons | Compact, isolated assets; can serve as design blueprints for procedural icons |
| Marketing capsules, key art, Steam banner dressing | ~15 assets | Free of engine runtime constraints; maximum marketing impact |
| Concept art sheets + style guides | ~50 sheets | Core strength of generative models; guides manual asset implementation |

### 5.2 Proceed with Caution ⚠️

- **Character Roster Portraits (34 robots)**: High consistency overhead. Pipeline: Train master style LoRA → build individual LoRAs for 5 hero units → use IPAdapter with fixed seeds for remaining 29.
- **Character Selection Cards**: Shares the consistency constraints of roster portraits.

### 5.3 Strictly Prohibited ❌

- **Converting in-game robot rigs into raw sprite sheets.** `robots.js` features a 1,516-line data-driven skeletal rig driving locomotion, tread rotation, and barrel aim dynamically. Replacing this with static sprites requires generating 34 robots × 5 frames while breaking procedural barrel alignment and bloating file size. **This constitutes a technical regression.**
- **Replacing skill FX (`skill-fx.js`) or projectile shapes** with AI bitmaps: These require deterministic, zero-allocation, high-visibility vector primitives verified by regression tests.
- **Baking textual copy into AI bitmaps**: AI text generation is unreliable with Turkish typography and diacritics. All text must render via Canvas/DOM using project fonts (Russo One + Chakra Petch).

### 5.4 Hybrid Alternative: Cut-Out Puppet Rigging ⭐

To enhance fidelity without sacrificing dynamic skeletal movement:

1. Generate **front, side, and 3/4 views** for each hero robot (using Qwen-Image-Layered or LayerDiffuse + BiRefNet for clean alpha).
2. Segment the render into discrete anatomical components: head, torso, upper arm, forearm, hand, leg, foot, and chassis attachments (via SAM or manual masking).
3. Pack components as high-res PNGs; retain existing skeletal joints in `robots.js`, substituting `_rbLimb`/`_rbRoundRect` with `drawImage` + `rotate`.

Outcome: Maintains existing physics, aim geometry, and unit tests while achieving an illustrated aesthetic. Asset overhead drops from 34 robots × 5 frames to **34 static component sets**.

---

## 6. Phased Asset Pipeline

### Phase 0 — Style Lock (1–2 Days)

1. Collect 30–60 reference images: screenshots of existing procedural robots paired with target industrial reference art.
2. Filter for cohesive aesthetics; extract a **standardized color palette**.
3. Train `DOKUMHANE9-style` **style LoRA**:
   - Tooling: ai-toolkit or kohya; SDXL configuration: rank 16–32, learning rate 1e-4, 1500–3000 steps, batch size 1, 1024² resolution.
   - Training time on RTX 3090: ~20–60 minutes.
4. Verification: Test identical seed across 10 distinct prompts to verify visual cohesion. **Do not advance to Phase 1 until verified.**

### Phase 1 — Environment Backdrops (Highest ROI)

1. Generate 9 zones × (sky, distant skyline, midground silhouette) at 1536–2048 px; downsample to **960×540**.
2. Batch palette and saturation normalization: Apply uniform saturation ceilings and subtle unsharp masking via PIL/ImageMagick.
3. Extract alpha channels where required via BiRefNet.
4. Storage routing: **File path** → `assets/bg/*.webp` via relative `<img>`; **Base64** → data URI in `js/assets-bg.js` (per §7.1 decision matrix).
5. Bind to `maps.js > drawSky` and layer renderers; update preview pipelines (`_previewProp`). **Implement procedural Canvas fallback** (`image.complete` check) to prevent blank skies on cold `file://` loads.

### Phase 2 — Textures and UI

1. Generate seamless tileable texture atlas (sheet metal, rust, frost, ash, sand, oily water).
2. Map to `paintSurfaceBand` ground layers; paint textures into the **offscreen terrain canvas** (`paintProps`/`paintSurfaceBand`, §7.2) so they erode naturally with explosions.
3. Generate UI frames, hazard strips, and rivet panels in parallel with `ui-theme-plan.md` milestones.

### Phase 3 — Icons and Roster Art

1. Generate 24 parts + 34 modules + 27 projectile icons using style LoRA, fixed seeds, and "centered, isolated, simple background" framing.
2. Character roster cards: Train 5 hero LoRAs; generate remaining 29 via IPAdapter reference matching.
3. Acceptance criterion: Silhouettes must remain readable downsampled to 24 px.

### Phase 4 — Marketing Collateral

1. Generate key art (FLUX.2 [dev] or Qwen-Image 2.x) and Steam capsule formats (616×353, 1920×620, etc.).
2. Do not fabricate gameplay screenshots; composite authentic gameplay HUD over AI backdrops.
3. Formulate the required **AI Content Disclosure** for the Steam store page (§8).

### Phase 5 — Optional Animation

- **Recommended:** §5.4 cut-out puppet rig.
- **Alternative:** Pose transfer via Wan 2.2 Animate, transferring live-action video movements to robot models. 14B model runs on 24 GB with offloading, taking 5–20 minutes per clip. Prototype on a single character before considering full roster adoption.

---

## 7. Integration with the `file://` Runtime Architecture

Per `CLAUDE.md`, the game must launch via double-click on `index.html` over `file://` without build steps or web servers. This imposes three runtime constraints:

### 7.1 Constraint A — `fetch()` is Blocked; Assets Require `<img>` or Base64

**Measured browser behavior (headless Chrome, `file://`, zero flags — see §12):**

| Asset Loading Mechanism | Loads via `file://`? | Causes Canvas Tainting? |
| --- | --- | --- |
| `<img src="assets/x.png">` (relative path) | ✅ Yes (`naturalWidth > 0`) | ⚠️ Yes |
| `<img src="./assets/x.png">` | ✅ Yes | ⚠️ Yes |
| `<img src="data:image/webp;base64,...">` | ✅ Yes | ✅ **No** |
| `fetch("assets/x.png")` | ❌ **TypeError** (blocked) | — |

**Base64 is not strictly mandatory.** Two viable paths exist:

- **Path 1 — File-based `<img>`:** Store WebP/PNG assets in `assets/` and load via relative paths. Benefits: Avoids base64's 33% payload expansion, leverages browser disk caching, supports lazy loading. Risk: Canvas becomes tainted (harmless today per §7.2, but blocks future pixel-readback APIs).
- **Path 2 — Base64 Embedding:** Encode images into base64 and load as classic scripts in `js/assets-*.js`:
  ```js
  // js/assets-bg.js — Base64 embedded backdrop layers (file:// compatible)
  const ASSET_BG_SCRAPYARD_SKY = "data:image/webp;base64,UklGRi...";
  ```
  Benefits: Zero canvas tainting (future-proof), single-file distribution, synchronous initialization. Drawbacks: 33% size inflation and JS parsing overhead.

General Rules for Both Paths:
- Include scripts in `index.html` in correct dependency order (assets must precede `maps.js`).
- `tests/run.js` inspects a **static file array** (`const FILES = [...]`, line 18) — new asset scripts must be registered there.
- Size budget: 960×540 WebP q80 is ≈ 80–150 KB (base64 ≈ 110–200 KB). 9 zones × 2 layers totals ≈ 1.5–3 MB.

### 7.2 Constraint B — Canvas Tainting Analysis

> **Correction from historical drafts:** Early drafts stated that "`terrain.js` uses `getImageData`, which will crash when reading external images." **This was incorrect.** An audit of the codebase confirms:
> - `getImageData`, `toDataURL`, `toBlob`, `OffscreenCanvas`, and `createImageBitmap` are **not invoked anywhere in gameplay code** (the only usage is in a dev diagnostic probe `_walk_battle_probe.html`).
> - `Terrain` manages collision geometry via a `Uint8Array` bitmask (`js/terrain.js:24`); solid terrain is manipulated via `fillMaskRect` (line 166) and `carve` (line 372). The offscreen canvas is used strictly for rasterization; line 408 blits to the main canvas via `drawImage` without pixel readbacks.
> - Canvas tainting causes zero runtime exceptions because `SecurityError` is only thrown when calling readback methods (`getImageData`/`toDataURL`).

Current Architecture:
- Canvas tainting represents a **latent architectural risk**: harmless today, but will throw errors if future features introduce pixel readbacks (e.g., custom screenshot exporters, pixel-level test assertions, watermarks, `toBlob()` saves).
- `paintProps` (terrain.js:327) blits scenery props into the offscreen terrain canvas; AI surface textures blitted via `drawImage` erode naturally alongside terrain craters without errors.
- `paintRobotPreview` (game.js:3912–3967) uses offscreen canvases purely for rendering and blitting without pixel readbacks.

**Decision Matrix:**
- If the engine performs **zero pixel readbacks** → File-based `<img>` assets are sufficient; base64 is unnecessary.
- If pixel readbacks are **planned or anticipated** → Use base64 data URIs, which prevent canvas tainting entirely.
- Recommended safe default: **Base64 embedding**, trading modest 33% size overhead for guaranteed forward compatibility.
- Headless test suites (`node tests/run.js`) do not validate DOM image tainting; verify manually in a browser.

### 7.3 Constraint C — Determinism and Test Regressions

- `robots.js` intentionally avoids `Math.random()` and `Date.now()`; visual rendering must never consume gameplay RNG or desynchronize bot logic.
- Asset loading is asynchronous: Preload images before match start or render behind an `image.complete` gate; `drawImage` calls must not affect simulation state.
- Procedural `drawRobot` contracts must remain pure; status effects and hit flashes remain decoupled in the Entity layer.

### 7.4 Display Resolution and Downsampling

- Internal canvas rendering resolution is locked at **960×540** (scaled via `devicePixelRatio` on HiDPI displays). Generating assets at **1920×1080 (2×)** and downsampling provides optimal clarity.
- Downsampling pipeline: 2× Lanczos filter + subtle unsharp mask. Downsampling eliminates minor diffusion noise, yielding far cleaner results than upscaling low-res generations.

---

## 8. Licensing and Commercial Distribution (Steam)

| Asset Source / Model | Commercial Usage Permitted? | License Notes |
| --- | --- | --- |
| SDXL (CreativeML OpenRAIL++-M) | ✅ Yes | Standard OpenRAIL use restrictions apply. |
| Illustrious / NoobAI / Pony (Fair AI Public License 1.0-SD) | ✅ Yes (Outputs) | FAIPL text verified: *Output* clause states generated outputs are unencumbered by the license; standard restrictions on harmful usage apply. Note: Fine-tuned style LoRAs qualify as derivative models, requiring FAIPL attribution if the LoRA weights themselves are distributed (commercial game sales remain unaffected). |
| Qwen-Image / Qwen-Image-2.x / Qwen-Image-Layered | ✅ Yes | Apache 2.0 license. Cleanest commercial option. |
| FLUX.1 [schnell] / FLUX.2 [klein] 4B | ✅ Yes | Apache 2.0. Klein **9B** is non-commercial. |
| FLUX.1 [dev] / FLUX.2 [dev] | ❌ No | Requires commercial licensing from Black Forest Labs. |
| Krea 2 | ⚠️ Conditional | Free only for businesses with annual gross revenue < $1M. |
| Ideogram 4.0 | ❌ No | Non-commercial research only. |
| BiRefNet | ✅ Yes | MIT License. |
| LayerDiffuse Weights | ✅ Yes | Apache 2.0 License. |
| Wan 2.2 / Wan 2.2 Animate | ✅ Yes | Apache 2.0 License; grants full ownership of generated outputs. |
| Z-Image / Z-Image-Turbo | ✅ Yes | Apache 2.0 License. |
| SUPIR / SeedVR2 / Real-ESRGAN | ✅ Yes | Permissive open-source licenses (Apache/BSD). Upscaler outputs are unencumbered. |

**Steam AI Disclosure (Updated January 2026):** Valve enforces a mandatory store questionnaire. While background developer efficiency tooling is exempt, all **player-facing generative content** (visuals, audio, text) must be disclosed. Shipping with AI backdrops or icons requires completing the **"AI Generated Content"** disclosure in Steamworks. Copy is tracked in `docs/plans/platforms/steam-release-plan.md` §3.

---

## 9. Risk Matrix and Mitigations

| Risk | Indicator | Mitigation |
| --- | --- | --- |
| Aesthetic divergence | 34 robots look visually unrelated | Train shared style LoRA first; use IPAdapter for consistency; limit custom LoRAs to hero robots |
| Style drift | Backdrops look more rendered/painterly than units | Apply batch saturation ceilings and outline thickness controls; enforce acceptance tests |
| Bundle bloating | Excessive repository size; slow `file://` loads | WebP q80 compression, 960×540 target resolution, per-zone assets with lazy preloading |
| **Canvas tainting** (latent) | `SecurityError` thrown on future pixel readbacks | Zero readbacks in active codebase; switch to base64 data URIs if readbacks are ever introduced |
| Test suite failure | `node tests/run.js` throws `ASSET_... is undefined` | Register new asset scripts in `tests/run.js` file list |
| RNG desynchronization | AI bots diverge between headless and browser runs | Strictly forbid `Math.random` in visual renderers; preload assets prior to simulation |
| Storage saturation | 300–500 GB checkpoints overwhelm disk | Store on dedicated NVMe; install 2–3 active model families at a time |
| Licensing violations | Shipping commercial release with FLUX dev outputs | Enforce model-to-asset mapping table aligned with permissive licenses |
| Production stall | Stalling in creative review ("AI can do anything") | Establish strict acceptance criteria and timebox candidate curation |

---

## 10. Estimated Engineering Effort

| Milestone | Duration (Including Onboarding) |
| --- | --- |
| ComfyUI + dual-model environment setup, baseline outputs | 1 day |
| Style LoRA training and acceptance testing | 1–2 days |
| 9 zone backdrops (generate + curate + normalize + integrate) | 4–8 days |
| Texture and UI asset suite | 2–3 days |
| ~85 icons (weapons, modules, items) | 3–5 days |
| 5 hero cut-out puppet component sets | 1–2 weeks |
| Remaining 29 character roster cards | 1–2 weeks |
| Marketing collateral and store key art | 2–3 days |

**Total Estimated Timeline: 6–10 weeks part-time.** Backdrops, UI, and marketing assets (Phases 1, 2, and 4) deliver the highest visual leap within the **first 2 weeks**; roster art should only begin once the style lock is fully stabilized.

**Hybrid Strategy:** Retain data-driven procedural character rigs, deploying AI exclusively for backdrops, surface textures, marketing assets, and concept art. Roster cards can be produced via AI with heavy manual touchups or commissioned from an illustrator. This reduces production time to ~3 weeks while eliminating consistency risks across the 34 robots.

---

## 11. Initial 7-Day Implementation Checklist

- [ ] Install ComfyUI Portable; deploy Manager, GGUF, ControlNet Aux, IPAdapter, LayerDiffuse, and Impact Pack.
- [ ] Download SDXL Illustrious/NoobAI checkpoint + 4-step Lightning LoRA; generate test output at 1024².
- [ ] Train `DOKUMHANE9-style` SDXL LoRA on 30–60 curated reference images (ai-toolkit or kohya).
- [ ] Evaluate style consistency across 10 prompts using fixed seeds; verify shared visual language.
- [ ] Generate 1 zone backdrop at 2× → downscale to 960×540 → export WebP q80 → integrate via `assets/bg/` or base64 in `js/assets-bg.js` (§7.1). Register base64 files in `index.html` and `tests/run.js`.
- [ ] Launch via `file://`: Verify backdrop renders cleanly with **procedural Canvas fallback** active prior to asset load.
- [ ] Update §1.3 with local hardware generation benchmarks.

---

## 12. Verification Records (October 9, 2026)

This section records empirical verifications supporting architectural claims. Update this log whenever claims are revised.

### 12.1 Empirical Verifications (Measured in Repository)

**Static Codebase Audit**
- `getImageData` / `toDataURL` / `toBlob` / `OffscreenCanvas` / `createImageBitmap` / `new Image(` → **Absent** from production codebase (isolated to dev probe `_walk_battle_probe.html:128`).
- `js/terrain.js`: Collision bitmask is `Uint8Array solid` (line 24); manipulated via `fillMaskRect` (166) and `carve` (372); offscreen canvas handles rasterization only, blitting to main canvas via `drawImage` (408).
- `js/game.js`: `drawImage` performs canvas-to-canvas blits only (lines 3912–3967); zero pixel readbacks.
- `tests/run.js:18`: Static file list `const FILES = [...]` defines 16 files including `skill-fx.js`.
- `index.html:97–113`: Script order verified (`maps.js` → ... → `game.js` → `main.js`).

**Headless Chrome Browser Telemetry** (`file://`, zero flags, `--headless=new --dump-dom`):
```
document.origin        = undefined
location.protocol      = file:
file-img.naturalWidth  = 8            → file:// relative images LOAD SUCCESSFULLY
data-img.naturalWidth  = 8            → data URIs LOAD SUCCESSFULLY
file-img.getImageData  = THREW SecurityError   → Canvas tainting OCCURS
data-img.getImageData  = OK rgba=220,60,40,255 → Canvas tainting ABSENT
fetch(probe-src.png)   = THREW TypeError       → file:// fetch is BLOCKED
--- subdirectory tests ---
subdir-img (assets/x.png)   = loaded 8px  / readback THREW SecurityError
subdir-dotslash (./assets/x) = loaded 8px  / readback THREW SecurityError
datauri-img                 = loaded 1px  / readback OK 255
```

**Conclusions:** `fetch` restrictions confirmed; "base64 is mandatory" **disproven**; "tainting breaks terrain" **disproven** (due to zero readbacks).

### 12.2 Primary Source License Verifications

| Assertion | Primary Source | Outcome |
| --- | --- | --- |
| FLUX.2 [klein] 4B Apache 2.0, ~13 GB, RTX 3090 supported | BFL `FLUX.2-klein-4B` model card | ✅ Verified |
| FLUX.2 [klein] 9B non-commercial | BFL model card, Responsible AI section | ✅ Verified |
| Z-Image-Turbo Apache 2.0, 6B, 8 steps | `Tongyi-MAI/Z-Image-Turbo` YAML: `license: apache-2.0` | ✅ Verified |
| LayerDiffuse license | `layerdiffusion/LayerDiffuse` → `LICENSE` (Apache 2.0 full text) | ✅ Apache 2.0 verified |
| Wan 2.2 Animate Apache 2.0 | `Wan-AI/Wan2.2-Animate-14B` model card | ✅ Verified |
| BiRefNet MIT | ComfyUI documentation | ✅ Verified |
| FAIPL excludes generated outputs | `freedevproject.org/faipl-1.0-sd/` *Output* clause | ✅ Verified; commercial output permitted |
| Two-tiered Steam AI Disclosure (January 2026) | Steamworks documentation | ✅ Verified |

### 12.3 Unverified Items (Flagged for Review)

- Benchmark speed table in §1.3 (specifically FLUX.2 [dev] and Qwen-Image 2.x).
- Project timeline estimations in §10.
- Wan 2.2 Animate 14B VRAM execution thresholds on 24 GB hardware.
- Quantized memory usage curves for Qwen-Image 2.x.
- Supplementary licensing terms on derivative community checkpoints (Illustrious/NoobAI/Pony).

### 12.4 Historical Revisions

- Corrected §1.2: RTX 3090 memory bandwidth is ~93% of RTX 4090 (936 vs 1008 GB/s); performance differences stem from compute and lack of FP8.
- Revised §1.2/§2.1: 32 GB system RAM represents a tight operational margin for FLUX.2 [dev], rather than an absolute blocker.
- Updated §2.1: FLUX.2 [dev] marked as requiring 24 GB VRAM ceiling.
- **Architectural Requirement Added:** Asynchronous image loading requires an `image.complete` gate with **procedural Canvas fallback** in `maps.js`. This guarantees the game renders gracefully without blank screens on cold `file://` boots.
- **Repository Correction:** `CLAUDE.md` omitted `skill-fx.js` from its documentation test list; verified present in `tests/run.js:FILES`.

---

## Technical References

- Local generative model benchmarks: `earngenix.com/blog/best-local-image-generation-models-2026`, `botmonster.com/ai/best-local-image-generation-models-2026/`
- FLUX.2 VRAM optimization: `vramready.com/models/flux-2-dev/`, `runaihome.com/blog/flux-2-self-hosting-vram-gguf-guide-2026/`
- 2D sprite generation pipelines: `apatero.com/blog/generate-clean-spritesheets-comfyui-guide-2025`, `ignax.dev/case-studies/ai-game-assets-pipeline`
- Consistency workflows: `playgama.com` (ControlNet/IPAdapter/LoRA guides), ComfyUI documentation
- Alpha transparency extraction: `docs.comfy.org/tutorials/utility/remove-background-birefnet` (BiRefNet, MIT), `docs.comfy.org/tutorials/image/qwen/qwen-image-layered`
- LoRA training harnesses: `localaimaster.com/blog/ai-toolkit-lora-training-guide`, `sanj.dev/post/onetrainer-vs-kohya-ss-vs-ai-toolkit/`
- Super-resolution upscaling: `botmonster.com/ai/local-ai-image-upscaling-real-esrgan-topaz-supir/`
- Windows inference acceleration: `smartart.live` SageAttention 2.2 documentation, AI-windows-whl repository
- Steam AI Policy: Steamworks "AI Content on Steam" documentation (January 2026 revision)
- License frameworks: Fair AI Public License 1.0-SD specifications, Apache 2.0, BFL Non-Commercial terms
