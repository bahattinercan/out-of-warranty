# Menu UI Theme & Typography Plan

> Historical record: The industrial panel styling and dual-font specifications defined in this document served as the baseline for the comprehensive UI overhaul tracked in [`design-redesign-plan.md`](./design-redesign-plan.md).

Date: September 24, 2026  
Status: **Phases 1 + 2 Implemented** (font subsystem + panel framework pilot; 644/644 tests passed).  
Implementation roadmap for all surfaces: [`ui-theme-phases.md`](./ui-theme-phases.md).

## 1. Locked Decisions

| ID | Decision Area | Specification |
|---|---|---|
| K1 | Font Pairing | **Dual-font strategy**: Headers/buttons = **Russo One**, Body/descriptions/HUD = **Chakra Petch** |
| K2 | Font Distribution | **Local offline files**: `fonts/*.woff2` + `@font-face`; zero Google Fonts CDN requests (`file://` offline rule) |
| K3 | Visual Theme | **Industrial factory panel**: Chamfered steel plates, corner rivets, yellow/black hazard stripes |
| K4 | Scope | All Canvas menu surfaces + DOM overlays (HUD, victory card, weapon drawer) + in-game combat text |
| K5 | Implementation | Centralized Canvas font helper functions (`uiTitleFont`, `uiTextFont`) inside `game.js` |
| K6 | Character Set | Full **latin-ext** coverage supporting Turkish diacritics (ç, ğ, ı, ö, ş, ü, İ) verified via font metrics |

## 2. Typography Subsystem

### 2.1 Font File Catalog (`fonts/`)

| File Name | Family | Weight | Role |
|---|---|---|---|
| `RussoOne-regular-latin.woff2` / `-latin-ext.woff2` | Russo One | 400 | Headers, button titles, major card labels |
| `ChakraPetch-semibold-latin.woff2` / `-latin-ext.woff2` | Chakra Petch | 600 | Body text, descriptions, dialogs, default HUD |
| `ChakraPetch-bold-latin.woff2` / `-latin-ext.woff2` | Chakra Petch | 700 | Badges, buttons, stat bars, floating damage numbers |
| `ChakraPetch-regular-latin.woff2` / `-latin-ext.woff2` | Chakra Petch | 400 | Fallback reference |

### 2.2 `@font-face` Declarations (`css/style.css`)

```css
/* Local fonts: functional via file:// with zero CDN fetches */
@font-face {
  font-family: "Russo One";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("../fonts/RussoOne-regular-latin-ext.woff2") format("woff2");
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF;
}

:root {
  --font-title: "Russo One", "Segoe UI", sans-serif;
  --font-text: "Chakra Petch", "Segoe UI", sans-serif;
}
```

`"Segoe UI"` remains declared as a safe system fallback across all surfaces.

### 2.3 Canvas Typography Helpers (`js/game.js`)

```js
function uiTitleFont(px) {
  return `${px}px "Russo One", "Segoe UI", sans-serif`;
}
function uiTextFont(px, weight) {
  return `${weight || 600} ${px}px "Chakra Petch", "Segoe UI", sans-serif`;
}
```

- Typography scales cleanly: `bold ≥14px` maps to `uiTitleFont` (Russo One), `≤13px` tags map to `uiTextFont(px, 700)`.
- Replaces hardcoded `ctx.font` strings across `game.js` and `skills.js`.

### 2.4 Preloading Routine (`js/main.js`)

To prevent visual layout flashing on initial frame execution:
```js
if (document.fonts && document.fonts.load) {
  document.fonts.load('16px "Russo One"');
  document.fonts.load('16px "Chakra Petch"');
  document.fonts.load('bold 16px "Chakra Petch"');
}
```

## 3. Industrial Panel Framework

### 3.1 Color & Surface Palette

| Visual Role | Color Value | Description |
|---|---|---|
| Panel Background | `#0f1720` → `#1a2430` | Vertical brushed steel gradient |
| Panel Border | `#3b526b` (standard) / `#ffe45e` (hover) | Metallic structural frame |
| Warning Accent | `#ffe45e` | Hazard striping, active selection |
| Corner Rivets | `#54627a` base + `#9fb6c9` specular dot | Structural fasteners at chamfers |
| Hazard Stripes | `#ffe45e` + `#11161c` | 45-degree angled safety hatching |

### 3.2 Procedural Rendering Primitives (`js/game.js`)

- `_csPanel(ctx, x, y, w, h, opts)`: Primary panel primitive. Renders 8px chamfered corners, vertical metallic gradients, 1.5px structural borders, corner rivets, and optional hazard banners.
- `_csHazardStrip(ctx, x, y, w, h)`: Renders 45-degree yellow/black hazard hatching utilizing a cached `CanvasPattern`.
- `_csGlow(ctx, color, blur)`: Applies soft luminous hover glow.
- `_panelPath(ctx, x, y, w, h, c)`: Path helper generating chamfered polygons.

Hover states lift cards upward by 2px with `#ffe45e` border highlights while keeping click hitboxes invariant.

## 4. Phased Implementation Roadmap

1. **Phase 1 — Typography Core:** Local WOFF2 fonts integrated, CSS variables declared, centralized Canvas font helpers wired.
2. **Phase 2 — Panel Primitives & Pilot:** Built `_csPanel` and piloted across primary mode selection, difficulty selection, and player count screens.
3. **Phase 3 — Extended Menus:** Scaled panel language across character selection, arena selection, and the workshop workbench.
4. **Phase 4 — DOM & CSS Theming:** Applied chamfered clip-paths and industrial tokens to the weapon drawer, HUD header, and match results card.
5. **Phase 5 — Polish & Verification:** Micro-font sizing adjustments and automated test suite verification.
