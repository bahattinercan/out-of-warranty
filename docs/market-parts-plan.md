# Market Tabs + Robot Parts (Attachable Equipment) — Implementation Plan

Status: **Locked — Approved, Complete** (D-01…D-08 approved 2026-09-25; Phases 1–4 + optional Turbo Tread complete)

Phase Deliverables:

**Phase 1 — Data Layer (2026-09-25)**
- `js/parts.js` (new, ~460 lines): 11-part catalog (v1; Turbo Tread Phase 3 option), sanitize/buyPart/equipPart/drawPartIcon + 11 icon shapes
- `profile.js` schema v5 (`parts` + `robots.loadout`, cross-validation + collision resolution, v4→v5 migration)
- `progression.js`: `resolveRobotBuild` part stat modifiers (additive sums + multiplicative stacking, clamping limits) + `partEffectText` + `PART_KNOCKBACK_MIN`
- `index.html`: parts.js script load order (profile → parts → market)
- Automated tests: run 808, market 246, progression 165, audio 21

**Phase 2 — Market Tabs (2026-09-25)**
- `game.js`: `marketTab`/`marketPartPage` states; `renderMarket` split into modular renderers (`_renderMarketTabs` + `_renderMarketAmmo` + `_renderMarketParts` + `_renderMarketNav` + `_renderMarketNotice` + `_marketEquippedMap`); `purchaseMarketPart`; `switchMarketTab`/`changeMarketPage`; `handleMarketClick` 3-tiered (tab → page → card); `1`/`2` keyboard shortcuts; scroll wheel pages active tab
- Grid geometry `gridY=84` PRESERVED (subtitle row converted to tab band) — existing ammo screen layout shifted by zero pixels
- Part card: icon + name + effect + slot badge + price/Owned status + "Equipped → robot" label
- `_market_probe.html`: `parts.js` + dual canvases (ammo + parts, all card states)
- Automated tests: run 826 (+18), market 246, progression 165, audio 21 — visual validation `screenshots/market_probe_faz2.png`

**Phase 3 — Workshop Equipment Panel (2026-09-25)**
- `game.js`: `workshopMode` (UPGRADES | PARTS), `workshopSlot`, `workshopSlotOpen`, `workshopPartCursor`, `workshopNotice`; `renderWorkshop` restructured into sub-modes (`_renderWorkshopModeTabs` + `_renderWorkshopParts`); `switchWorkshopMode`/`selectWorkshopSlot`/`workshopSlotParts`/`_workshopSlotRows`/`openWorkshopSlot`/`closeWorkshopSlot`/`_moveWorkshopPartCursor`/`applyWorkshopPart`; `handleWorkshopKey` mode-aware; `handleWorkshopClick` tab→slot→row; `goBack` closes open lists first
- Slot panel: 4 slots (equipped part + inventory count); list: owned parts (effect preview) + "Leave empty"; equipped row shows `✓ equipped`
- Character selection card equipped badge (4 dots, `_drawPartDots`); `_workshop_probe.html` four views (upgrades/slots/list/character selection), `screenshots/workshop_probe_faz3.png`
- Automated tests: run 852 (+26), market 246, progression 165, audio 21

**Phase 4 — Polish (2026-09-25)**
- `robots.js`: `_rbPartSpecs` + `_rbPartAccessories` — equipped parts render as visual attachments on robot silhouettes (chest plate, visor optic strip, backpack battery, sole pads). Absence of `options.parts` preserves legacy rendering **identically** (asserted via regression tests)
- `progression.js`: build carries `parts` (sanitized loadout) → feeds in-match attachment rendering via `entity.js` `partLoadout`
- `game.js`: passes `parts` to workshop cards, previews, and character selection renders
- `audio.js`: `SFX.partMount()` (metallic click + spring latch); part purchases and equipping trigger this sound
- `_parts_sheet.html` (11 icons + 6 accessory comparisons), `screenshots/parts_sheet_faz4.png`
- Documentation: README and CLAUDE.md updated with part schema and developer instructions
- Automated tests: run 862 (+6), market 246, progression 165, audio 21, maps 960

**Phase 3-ops / Turbo Tread (2026-09-25)**
- `parts.js`: `turbo_palet` (feet slot, 90 Scrap, `moveSpeedMult: 0.10`, `turboPad` icon) → catalog expanded to 12 parts (3 in feet slot)
- `progression.js`: `PART_EFFECT_KEYS` + `moveSpeedMult` sum; build `moveSpeedMult = 1 + clamp(total, 0, PART_MOVE_SPEED_MAX=0.20)`; `partEffectText` speed line
- `entity.js`: `WALK_SPEED` constant + `Entity.moveSpeedMult`; `walk()` step scales with multiplier — footstep phase remains locked to distance traveled, preventing foot sliding
- Automated tests: market 257 (speed multiplier + ceiling clamp + formatting), run 865 (stride expands 10% + **phase-to-distance ratio identical across robots** = zero sliding), `_walk_verify.js` **48/48 passed**
- `_parts_sheet.html` 12 icons + robots with Turbo Treads; README and CLAUDE.md updated

Codebase Baseline References (as of September 25, 2026):
- `js/market.js` (~197 lines) — pure ammo economy: `AMMO_PRICES`, `buyAmmo`, shared depot
- `js/game.js` — market/workshop loops, match build resolution
- `js/profile.js` (~289 lines) — schema v4, `normalizeProfile`, migrations, `getRobotProgress`
- `js/progression.js` (~334 lines) — `resolveRobotBuild`, tier/reward constants
- `js/entity.js` — consumes build stats: `maxHp`, `armor`, `weaponDamageMult`, `maxStamina`, `knockbackTakenMult`, `resolvedSkill`
- `tests/market.js` / `tests/run.js` — test harnesses and file manifests

---

## 1. Baseline Architecture

### 1.1 Market Screen (`MARKET` State)

| Component | Architecture | Location |
|---|---|---|
| Header | "AMMUNITION MARKET", `uiTitleFont(26)`, y=20 | `renderMarket` |
| Subtitle | Shared depot summary, y=48 | `renderMarket` |
| Scrap Balance | Top-right y=26, flashes on purchase (`marketFx`) | `renderMarket` |
| Grid | 3 columns × 5 rows, card height 62 px, `gridY=84`, `MK_MAX_GRID_W=912` | `game.js` L1101–1230 |
| Input | Card click → 1 unit; `Shift`+click → `AMMO_BULK_QTY` (5); pagination controls | `handleMarketClick` |
| Purchase Flow | `purchaseMarketAmmo` → `buyAmmo(profile, id, qty)` → deep copy + re-validation + `saveProfile` | `game.js` L1065–1087 |
| Notification | `marketNotice` (2.2 s) + card flash (`marketFx`, 0.6 s) | `game.js` |
| Constants | `MK_COLS=3, MK_ROWS=5, MK_CARD_H=62, MK_FX_DURATION=0.6, MK_NOTICE_DURATION=2.2` | `game.js` L45–50 |

### 1.2 Workshop Screen (`WORKSHOP` State)

| Component | Architecture | Location |
|---|---|---|
| Left Grid | Robot grid 4×3 (`WS_COLS=4, WS_ROWS=3`), card 88 px, paginated | `game.js` L527–603 |
| Right Panel | `rx=496, rw=440, gy=66, WS_PANEL_H=440` → panel base y=506 | `game.js` L602–607 |
| Right Panel Contents | Preview (cy=gy+62) → name/role (gy+100) → level (gy+124) → XP bar (gy+144) → Scrap → 3 branch panels (58 px + 6 gap, `py=barY+36/54`) → action button (42 px) → back | `game.js` L611–760 |
| Keyboard | Left/Right page, Up/Down branch, Enter purchase | `handleWorkshopKey` |
| **Panel Capacity** | 3 branches + action button fill the panel vertically; only ~70 px clearance remains → **4 equipment slots cannot fit simultaneously; internal mode toggle required** (see §9) | Audited dimension |

### 1.3 Persistent Progression Pipeline

- `resolveRobotBuild(charDef, robotProgress, opts)` (`progression.js`): Consolidates progression tiers into a single derived build (enforcing the single-multiplier rule: bonuses add into a single coefficient).
- Invocation site: `game.js` — invoked when `upgradesOn && ctrl !== "bot"` with `{ upgradesEnabled: true }`. `upgradesOn = isSinglePlayerProgressionMode(mode)`. Bots and hot-seat matches utilize baseline robot specs → equipment parts attach to the exact same gate.
- Progression Constants: `ARMOR_CAP=0.40`, `CHASSIS_HP_BONUS {t1:0.05, t3:0.10}`, `CHASSIS_ARMOR_BONUS=0.02`, `CHASSIS_KNOCKBACK_REDUCTION=0.10`, `MODULE_POWER_BONUS {t1:0.06, t3:0.15}`, `MODULE_COOLDOWN_REDUCTION=1`, `MODULE_MIN_COOLDOWN=2`, `CORE_STAMINA {base:70, t1:78, t3:85}`, `CORE_WEAPON_BONUS {t2:0.04, t3:0.07}`.
- Match Economy: `REWARD_BASE win=60 Scrap` × difficulty multiplier (0.75…1.5) × (1 + 20% · (opponents − 1)), capped at 150. Normal 1v1 victory = 60 Scrap; 3 opponents on normal = 84 Scrap; 4 opponents on expert = 144 Scrap.

### 1.4 Robot Anatomy (Equipment Slot Mappings)

| Slot | Anatomical Counterpart | Rendering Reference (`robots.js`) |
|---|---|---|
| `helmet` | `face` visor layout + helmet dome | `_rbHeadAntenna`, visor rendering |
| `body` | `body` silhouette chassis | Body panel rendering |
| `tool` | `attachment` (hand tool, back cannon, halo) | `drawCharExtras` |
| `feet` | `locomotion` (boots, treads, wheels, springs, rotors) | Foot rendering |

---

## 2. Architectural Decisions

| # | Topic | Alternatives | Adopted Decision & Rationale |
|---|---|---|---|
| **D-01** | Tab Architecture | (a) Separate game states (`MARKET_PARTS`) (b) Single state + `marketTab` | **(b)**. Dedicated states bloat input handling and Esc/HUD switches across `game.js`. A `marketTab` field preserves existing state flow |
| **D-02** | Inventory Quantity Model | (a) Consumable stacks (b) Unique single-ownership items | **(b)**. Parts represent permanent equipment investments rather than consumables; unique single-item ownership keeps the economy transparent |
| **D-03** | Slot Count | 3, 4, or 6 slots | **4 slots**: `helmet, body, tool, feet`. Matches robot anatomy; 3 parts per slot yielded a balanced 12-part initial catalog |
| **D-04** | Equip Location | (a) Inside Market "Parts" tab (b) Inside Workshop screen | **(b)**. Workshop is the per-robot configuration hub; equipment selection does not fit cleanly on market cards. Market serves strictly as the catalog |
| **D-05** | Modifier Scope (v1) | (a) Existing build stat properties (b) New physics dimensions (speed, projectile range) | **(a)**. Keeps balance tightly constrained without altering projectile simulation. "Move speed +10%" (Turbo Tread) evaluated as an isolated Phase 3 extension |
| **D-06** | Progression Gating | — | Equipment parts share the exact same gate as workshop upgrades: `resolveRobotBuild` requires `upgradesEnabled: true` ("active only in single-player vs AI") |
| **D-07** | Pricing Tiers | — | **40–130 Scrap** one-time purchase. Catalog total ≈ 755 Scrap (13 normal 1v1 wins), providing long-term goals without devaluing ammo purchases |
| **D-08** | Resale / Scrapping | (a) None (b) 50% resale (c) Dismantling | **(a) None in v1**. Avoids UI clutter and balance exploits; swapping parts between robots is free |
| **D-09** | Reassigning Equipped Parts | (a) Manual unequip required (b) Auto-transfer | **(b) Auto-transfer**. Equipping an item unbinds it from its previous owner automatically |
| **D-10** | Part Icon Rendering | (a) Shared shape dictionary (b) Custom renderers | **(b) Clean shape dictionary**: `PART_ICON_SHAPES` + unified `drawPartIcon` (40 px flat fills). Zero gradients or shadowBlur, zero RNG calls |
| **D-11** | Workshop UI Layout | (a) Compress into right panel (b) Internal sub-mode toggle | **(b) Sub-mode toggle (Upgrades / Parts)**. Right panel lacks vertical clearance; tabbed sub-modes match market UI conventions |
| **D-12** | Match Mode Scope | (a) Enabled wherever upgrades are active (b) Free-play only | **(a)**. Governed by `upgradesOn` |

---

## 3. Data Model — Profile Schema v5

### 3.1 Schema Definition

```js
profile = {
  version: 5,                  // Incremented from 4 to 5
  scrap,                       // Unchanged
  ammo,                        // Shared ammo depot (unchanged)
  parts: ["lehim_yamasi", ...],// NEW: Array of owned part IDs (purchase order, deduplicated, validated IDs)
  robots: {
    <charDef.id>: {
      xp, upgrades, stats,     // Unchanged
      loadout: {               // NEW: slot -> partId | null
        helmet: null, body: "lehim_yamasi", tool: null, feet: null
      },
    }
  },
  claimedMatches, updatedAt,   // Unchanged
}
```

### 3.2 Sanitization and Contracts (`js/parts.js`)

```js
const PART_SLOTS = ["helmet", "body", "tool", "feet"];
const SLOT_LABELS = { helmet: "Helmet", body: "Body", tool: "Tool", feet: "Feet" };
const PARTS = [ /* 12 part specs */ ];

// id -> spec; returns null for unmapped IDs
function partById(partId) {}

// Sanitizes raw input into deduplicated array of valid part IDs, preserving purchase order
function sanitizeParts(raw) → ["id", ...]

// Validates loadout shape: strips unrecognized slot keys; invalid part IDs fallback to null
function sanitizeLoadoutShape(raw) → { helmet, body, tool, feet }

// Read queries
function getOwnedParts(profile) → ["id", ...]
function isPartOwned(profile, partId) → bool

// Equips part to target robot slot; partId === null unequips the slot
function equipPart(profile, robotId, slot, partId, storage) → result
// Success: { ok: true, profile, previousOwner?, persisted }
// Failure: { ok: false, reason: "INVALID_PART" | "SLOT_MISMATCH" | "NOT_OWNED" | "INVALID_SLOT" | "INVALID_ROBOT" }
```

**Ownership Validation:**
- If `partId` is not present in `profile.parts` → rejects with `NOT_OWNED`.
- If the part is currently equipped on another robot → automatically unbinds from the former owner (D-09) and reports `previousOwner`.
- Re-equipping the identical part on the same robot is an idempotent no-op.

### 3.3 Cross-Validation and Conflict Resolution (`js/profile.js > normalizeProfile`)

Migration and normalization run in a single pass:
1. `parts = sanitizeParts(src.parts)`.
2. All robot `loadout` dictionaries pass through `sanitizeLoadoutShape`.
3. **Ownership sweep**: Any equipped part missing from `profile.parts` resets to `null`.
4. **Collision resolution**: If a unique part is equipped on multiple robots simultaneously, the **first robot** in the `CHARACTERS` array retains it, while conflicting slots reset to `null`.

### 3.4 Migration from v4 to v5

```js
if (version < 5) {
  // v4 -> v5: Add part collections; legacy scrap/ammo/robot stats remain untouched.
  // Empty parts array and null loadouts are initialized in normalizeProfile.
  data.version = 5;
}
```

- `PROFILE_SCHEMA_VERSION = 5` in `profile.js`.
- `defaultProfile()` initializes `parts: []`; `defaultRobotProgress()` initializes `loadout: sanitizeLoadoutShape(null)`.
- Backwards compatibility: Existing v4 saves preserve all progress, initializing clean part loadouts.

### 3.5 Economy Transaction API (`js/parts.js`)

```js
const PART_PRICES = { lehim_yamasi: 40, ... };

// Atomic transaction: deep clone + validation + persistence
function buyPart(profile, partId, storage) →
  { ok: true, profile, cost, ownedCount, persisted } |
  { ok: false, reason: "INVALID_PART" | "ALREADY_OWNED" | "SCRAP_REQUIRED" | "VERIFY_FAILED" }
```

`VERIFY_FAILED`: If post-transaction checks reveal negative scrap or duplicate inventory entries, the transaction aborts and rolls back.

---

## 4. Initial Part Catalog (v1: 12 Parts, 3 per Slot)

Part Specification Schema:
```js
{
  id, label, slot, desc, price,
  effects: {
    maxHpFlat?, armorFlat?, staminaFlat?, weaponDamagePct?,
    powerPct?, knockbackRedPct?, cooldownFlat?
  },
  icon: { shape, tint, accent }
}
```

| Slot | ID | Name | Effect | Price | Icon Shape | Palette (Tint / Accent) |
|---|---|---|---|---|---|---|
| helmet | `nisan_mercegi` | Targeting Lens | Weapon damage +5% | 60 | `lens` | #62d9ff / #cdefff |
| helmet | `termal_vizor` | Thermal Visor | Module power +6% | 70 | `visor` | #ff9b6b / #ffe0d0 |
| helmet | `denge_sensoru` | Balance Sensor | Knockback taken −10% | 50 | `gyro` | #b9f1ff / #eafaff |
| body | `lehim_yamasi` | Solder Patch | Max HP +15 | 40 | `weldPatch` | #63e6be / #d7ffef |
| body | `kompozit_plaka` | Composite Plate | Armor +6 pts | 75 | `plate` | #9fb6c9 / #eef5ff |
| body | `sogutucu_radyator` | Cooling Radiator | Stamina +10 | 55 | `radiator` | #7ac8ff / #e8f8ff |
| tool | `yedek_yukleyici` | Backup Loader | Module cooldown −1 turn | 95 | `loader` | #ffce7a / #fff0d0 |
| tool | `takviye_bobini` | Booster Coil | Module power +8% | 70 | `coil` | #d99aff / #f4e0ff |
| tool | `hassas_ayar_civtasi` | Precision Bolt | Weapon damage +4% | 45 | `bolt` | #d8d8d8 / #ffffff |
| feet | `denge_jiroskobu` | Gyro Stabilizer | Knockback taken −12% | 55 | `damping` | #91e36a / #d8ffc0 |
| feet | `yay_takozlari` | Spring Blocks | Stamina +8 | 50 | `springPad` | #8ee7ff / #e8f8ff |
| feet | `turbo_palet` * | Turbo Tread | Movement speed +10% | 90 | `turboPad` | #ffcc66 / #fff0c0 |

\* Turbo Tread implemented as Phase 3 extension (D-05): introduces `moveSpeedMult` into `Entity.walk`.

---

## 5. Economic Balance Modeling

| Parameter | Value |
|---|---|
| Initial Starting Scrap | 200 Scrap (affords 2–3 entry-level parts or 1 high-tier upgrade) |
| Match Earnings | Normal 1v1 = 60 Scrap; 3 opponents = 84 Scrap; expert 4 opponents = 144 Scrap (cap 150) |
| Full Catalog Cost | 755 Scrap (11 parts baseline) |
| Acquisition Pacing | ~13 normal 1v1 wins or ~8 multi-opponent skirmishes to acquire catalog |
| Ammo Relationship | Ammo requires recurring investment per match; parts are permanent single-purchase upgrades |
| Power Budget | Max 4 parts per robot; peak primary stat boost +8% per item (cumulative ~15–20% chassis buff) |

---

## 6. Build Integration (`progression.js`)

### 6.1 Invocation Signature

```js
resolveRobotBuild(charDef, robotProgress, options)
// robotProgress carries loadout; method resolves equipped part modifiers internally.
// Calling signature remains unchanged (zero modifications required in game.js:182).
```

### 6.2 Stacking Formulae

```
hpMult     = tierMultiplier (t3 -> +0.10, t1 -> +0.05)
maxHp      = round(baseHp * hpMult) + sum(parts.maxHpFlat)
armor      = clamp(baseArmor + tierArmor + sum(parts.armorFlat), 0, ARMOR_CAP)
weaponDmgM = 1 + tierWeaponBonus + sum(parts.weaponDamagePct)
maxStamina = baseStamina + tierStamina + sum(parts.staminaFlat)
cooldown   = min(baseCd, max(MODULE_MIN_COOLDOWN, baseCd - tierCdReduction - sum(parts.cooldownFlat)))
powerMult  = (1 + tierPowerBonus) * (1 + sum(parts.powerPct))
knockbackT = (1 - tierKnockbackRed) * (1 - sum(parts.knockbackRedPct)), lower clamp 0.5
```

- Part effects apply **strictly** when `upgradesEnabled` is true (D-06).
- Unrecognized part IDs in `robotProgress.loadout` are safely ignored.
- Derived build schema exposes zero new properties; values feed directly into existing `Entity`, `BotController`, and `ai.js` attributes.

### 6.3 Stat Calculations

Example: FIX-8 (HP 110, Armor 0.15), Body Tier I (HP +5%, Armor +0.02) + Solder Patch (+15 HP) + Composite Plate (+6 armor pts):
```
maxHp = round(110 * 1.05) + 15 = 116 + 15 = 131
armor = 0.15 + 0.02 + 0.06 = 0.23 (23% damage reduction)
```

Clamping limits: ZIP (Cooldown 3) + Backup Loader (−1) + Tool Tier II (−1) = 3 − 2 = 1, clamped to `MODULE_MIN_COOLDOWN = 2`.

---

## 7. Market User Interface (`game.js`)

### 7.1 State Variables

```js
this.marketTab     = "ammo" | "parts";   // Preserved across openMarket() calls
this.marketFx      = { partId | weaponId, t };
this.marketNotice  = { text, color, t };
```

### 7.2 Viewport Layout (960×540; `gridY=84` Preserved)

| Element | Legacy | Updated Layout |
|---|---|---|
| Header | y=20, 26 px font | y=14, `uiTitleFont(22)` — "MARKET" |
| Tab Bar | None | y=48, h=26: Dual centered tabs (width 150 px each); active tab highlighted in yellow |
| Depot Info | y=48 centered | Relocated to right of tab bar ("Inventory: 5/12 parts") |
| Scrap Balance | Top-right y=26 | Unchanged |
| Inventory Grid | gridY=84 | Unchanged |

Keyboard: `1` selects Ammunition, `2` selects Equipment Parts.

### 7.3 Part Card Anatomy (Height 62 px)

| Area | Rendered Content | Data Source |
|---|---|---|
| Left 40 px | Part icon — `drawPartIcon(ctx, part, 40)` | `parts.js` |
| Title (y+7) | Part label (13 px, 700 weight) | `spec.label` |
| Top-Right (y+8) | Price (yellow) or "Owned" (gray) | `PART_PRICES` / `isPartOwned` |
| Row 2 (y+26) | Effect description ("Weapon damage +5%", green `#8fd9c4`) | `spec.desc` |
| Row 3 (y+43) | Status text: `HELMET slot` / `Equipped on FIX-8` | Active loadouts |
| Right Badge (y+28) | Slot label (`HELMET`, 9 px right-aligned) | `SLOT_LABELS` |

---

## 8. Workshop Equipment Management (`game.js`)

### 8.1 Sub-Mode Toggling (D-11)

Dual sub-mode tabs (`UPGRADES` / `PARTS`, 118×24 px each) sit at `gy+8` atop the right panel:
```js
this.workshopMode  = "upgrades" | "parts";
this.workshopSlot  = null | "helmet" | "body" | "tool" | "feet";
this.workshopFx    = { ... };
```
- Left robot roster grid remains identical across both sub-modes.
- `upgrades` mode renders the standard upgrade branches.
- `parts` mode renders the 4-slot equipment panel.

### 8.2 Equipment Slot Panel (`parts` Mode)

Right panel dimensions (`rx=496, rw=440`):
- Top stats block (Level, XP, Scrap) remains consistent with upgrades view.
- 4 equipment slots stack vertically starting at `py = barY + 40` (each slot `rw × 46 px`, 6 px gap).
- Slot contents: Upper-left displays slot name ("HELMET") with equipped part name or "Empty"; right side displays inventory counts ("1/3 parts").

### 8.3 Equipment Selection Overlay

Clicking an equipment slot opens the part selection list:
- Rows 0..n: Owned parts matching that slot (displaying name, icon, and stat difference: "HP 110 → 125"). Equipped item flagged with `✓`.
- Final rows: "Leave empty" (unequips item) and "‹ Back".
- Equipping an item unbinds it from its former owner automatically (D-09).

---

## 9. Visual Polish (Phase 4)

### 9.1 Equipment Part Icons (`parts.js`)

- `PART_ICON_SHAPES`: 11 vector rendering routines in `drawPartIcon(ctx, part, size)`.
- Pure functions: flat fills, zero shadowBlur, zero runtime allocations.

### 9.2 Chassis Attachment Rendering (`robots.js`)

Parts render as subtle physical attachments on robot sprites via `options.parts`:
- `helmet`: Slim optic strip across visor brow.
- `body`: Reinforced chest plating with rivet accents.
- `tool`: Back-mounted battery cell / capacitor coil.
- `feet`: Tread stabilizers and sole pads.

---

## 10. File Responsibilities and Script Dependencies

| File | Modifications | Dependency Order |
|---|---|---|
| `js/parts.js` (NEW) | Catalog, validation, `buyPart`/`equipPart`, `drawPartIcon` | Loaded in `index.html` **after `profile.js`, before `market.js`**; registered in `tests/run.js` and `tests/market.js` |
| `js/profile.js` | Schema v5, loadout sanitization, cross-validation, v4→v5 migration | Increments `PROFILE_SCHEMA_VERSION = 5` |
| `js/progression.js` | `resolveRobotBuild` parses loadouts; adds `partEffectText` | Consumes `parts.js` |
| `js/game.js` | Market tabs, parts grid, workshop equipment UI | Consumes all part systems |
| `index.html` | Script tag registration | Follows script hierarchy |
| `tests/market.js` | Unit test suites for catalog, purchasing, and equipping | Exercises data contracts |
| `tests/run.js` | Headless rendering and regression suites | Exercises visual rendering |

---

## 11. Test and Verification Matrix

### 11.1 `tests/market.js` Unit Test Groups

1. **Catalog Integrity**: Asserts 12 valid parts, unique IDs, positive prices, valid slot bindings, and non-empty descriptions.
2. **`sanitizeParts`**: Strips duplicates and unrecognized IDs; preserves purchase order.
3. **`sanitizeLoadoutShape`**: Clamps slot dictionaries to valid 4-slot structure.
4. **`normalizeProfile` Cross-Validation**: Unowned parts cleared from loadouts; duplicate equipment assignments resolved in favor of the first robot.
5. **v4→v5 Migration**: Preserves legacy stats while adding empty part arrays.
6. **`buyPart` Transactions**: Validates scrap deduction, inventory addition, and error states (`SCRAP_REQUIRED`, `ALREADY_OWNED`).
7. **`equipPart` Operations**: Validates slot matching, unbinding from former owners, and error handling.
8. **Stat Stacking**: Validates additive and multiplicative stacking formulae in `resolveRobotBuild`.

---

## 12. Phased Rollout Plan

| Phase | Milestone | Deliverable | Verification |
|---|---|---|---|
| **Phase 0** | Design Lock | Approved design decisions D-01 through D-12 | Architecture approval |
| **Phase 1** | Data Core | `parts.js`, profile v5, `progression.js` loadouts | `node tests/market.js` and `node tests/run.js` passing |
| **Phase 2** | Market Tabs | Market tabs, parts catalog grid, `purchaseMarketPart` | Headless browser probe validation |
| **Phase 3** | Workshop UI | Workshop equipment mode, slot list, equipping pipeline | Headless workshop probe validation |
| **Phase 4** | Visual Attachments | Part icons, visual chassis attachments, SFX | Clean rendering regressions |
| **Phase 3-ops** | Turbo Tread | Movement speed multiplier and stride synchronization | `_walk_verify.js` passing 48/48 checks |

---

## 13. UI Layout Defect Resolution (2026-09-25)

1. **Tab bar overlapped "‹ Main Menu" button:** Resolved by shifting tab bar to `MK_TAB_X=132`, `MK_TAB_Y=19`, aligning alongside the back button without shifting grid coordinates (`gridY=84`).
2. **Scrap text conflicted with DOM audio controls:** Moved market info text down to `MK_INFO_Y=57` starting from the left flank, clearing the top-right DOM audio control zone (`AUDIO_SAFE` box).

---

## 14. Catalog Expansion: 24 Parts, Dedicated Tabs, and Shared Equipment

- Catalog expanded from 12 to **24 parts (6 per slot)**; introduced `maxHpPct` (+15% cap) and `jumpPowerMult` (+20% cap).
- Equipment unbinding restrictions lifted: A single purchased part can be equipped across **multiple robots simultaneously**, eliminating unbinding friction.
- Market tabs expanded to **5 dedicated tabs: AMMUNITION · HELMET · BODY · TOOL · FEET** (`MARKET_TABS`).
- Workshop part list updated to support pagination across 6 parts per slot.

### 14.1 Dynamic Procedural Equipment Visuals

Equipment attachments scale dynamically based on `icon.shape`:
- Shape families: Helmets (`lens`/`visor`/`gyro`/`armorHelm`), Body (`weldPatch`/`plate`/`radiator`), Backpack (`coil`/`loader`/`bolt`/`chip`), Feet (`damping`/`springPad`/`turboPad`/`jumpPad`).
- Rendering sequence (back to front): Feet attachments → Backpack modules → Chest plates → Visor attachments.

### 14.2 Animated Runtime Effects

Deterministic, zero-allocation micro-animations tied to `timeMs`:
- `visor`: Scanning beam sweep across visor slit.
- `gyro`: Rotating three-axis stabilizer arms.
- `lens`: Breathing iris with rotating lens glint.
- `radiator`: Shifting thermal dissipation pulse.
- `coil`: Upward-traveling electrical arc coils.
- `turboPad`: Exhaust flicker that intensifies dynamically during walking locomotion.
- Static armor plates remain solid and un-animated.

---

## 15. Dual-Slot Expansion (Schema v6: 8 Parts per Robot)

Chassis capacity expanded to **two parts per slot** (4 slots × 2 = **8 parts total**).

| Component | Architecture |
|---|---|
| Schema v6 | `loadout[slot]` transitions from a single ID to a 2-element array `[id|null, id|null]`. v5→v6 migration maps legacy single IDs to `[id, null]`, preserving slot positioning |
| `parts.js` | `PARTS_PER_SLOT = 2`; `equipPart` accepts `opts.index` (0 or 1); auto-targets first available sub-slot if omitted |
| Workshop UI | Each slot row renders dual sub-slot cells; left/right toggles sub-slot, Enter opens paginated selection list |
| Secondary Attachments | Secondary attachments scale down and offset dynamically around the slot's anatomical anchor point (§16) |

---

## 16. Secondary Attachment Anatomical Anchor Calibration

**Issue:** Attaching equipment to secondary sub-slots caused attachments to float off-chassis (helmets rendering on shoulders, chest plates hovering over arms).  
**Root Cause:** The renderer was scaling secondary items around the robot's global center point (`translate(r*x, r*y) -> scale(s)`). Because parts define local coordinates relative to specific body features, scaling around the robot's center detached them from their target limbs.  
**Resolution:** Re-anchored transforms around the **slot's anatomical anchor point**: `translate(anchor + delta) -> scale(s * mirror) -> translate(-anchor)`. This clamps attachments firmly to the correct limb while mirroring asymmetrical items:

| Slot | Anchor (r) | Mirror | Delta (r) | Scale | Visual Outcome |
|---|---|---|---|---|---|
| helmet | (0, −1.02) Head | −1 | (−0.30, 0.04) | 0.58 | Secondary helmet item rests on opposite temple |
| body | (0, −0.18) Torso | −1 | (0.34, 0.04) | 0.52 | Secondary plate rests on opposite side of chest |
| tool | (−0.53, −0.60) Backpack | −1 | (1.06, 0) | 0.78 | Module mirrors seamlessly to opposite shoulder |
| feet | (0, 0.93) Undercarriage | 1 | (0, −0.30) | 0.50 | Secondary pad stacks onto upper ankle collar |
