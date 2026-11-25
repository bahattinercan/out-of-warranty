# Out of Warranty — Mobile Port & Deployment Plan

This document outlines the engineering architecture, touch interaction paradigms, and container packaging required to port **Out of Warranty (Garanti Dışı)** from desktop browsers to mobile platforms (Android, iOS, and Mobile Web / PWA).

---

## 1. Executive Summary & Core Targets

- **Current Architecture:** Pure vanilla JavaScript (zero ES module imports, classic scripts), HTML5 Canvas (`960×540`), Web Audio API, and serverless WebRTC. Zero external runtime/build dependencies.
- **Target Platforms:**
  1. **Android:** Google Play Store (AAB) and standalone test APKs.
  2. **iOS:** Apple App Store (IPA) via Capacitor iOS container.
  3. **Mobile Web / PWA:** Direct zero-install browser gameplay on mobile browsers.
- **Performance Targets:** Solid 60 FPS on low-to-mid tier hardware, < 30 MB distribution package size, and ultra-low touch input latency (< 16ms input response).

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Out of Warranty                      │
│            (Pure Vanilla JS + HTML5 Canvas)            │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌──────────────┐                       ┌──────────────┐
│  Mobile Web  │                       │  Capacitor   │
│ (Safari/     │                       │  (Native     │
│  Chrome PWA) │                       │   Container) │
└──────────────┘                       └───────┬──────┘
                                               │
                               ┌───────────────┴───────────────┐
                               ▼                               ▼
                       ┌───────────────┐               ┌───────────────┐
                       │ Android (.aab)│               │   iOS (.ipa)  │
                       │ Google Play   │               │   App Store   │
                       └───────────────┘               └───────────────┘
```

---

## 3. Phase 1: Touch Interaction Engine

### 3.1. Virtual D-Pad & Jump (Bottom-Left Cluster)
Tactical artillery demands sub-millimeter positioning. Rather than floating analog thumbsticks that cause drift, a high-precision **virtual D-Pad cluster** is specified:
- **Placement:** Bottom-left corner, semi-transparent overlay (`rgba(20, 24, 30, 0.65)`) adhering to industrial terminal styling.
- **Controls:**
  - `[ ◄ ]` Move Left: Sets `input.left = true` while held.
  - `[ ► ]` Move Right: Sets `input.right = true` while held.
  - `[ ▲ ]` Jump: Sets `input.jump = true` on tap.
- **Multi-Touch Concurrency:** Left thumb maintains movement holds while the right hand independently aims or fires (`e.changedTouches` identifier tracking).
- **Minimum Hit Box:** Each button maintains a minimum `52×52px` bounding target to avoid mis-taps.

### 3.2. Slingshot Drag-to-Aim Mechanics
Desktop mouse aiming and click-to-charge mechanics obscure targets on small touchscreens. A **Slingshot (Drag-to-Aim)** interaction pattern is adopted:

1. **Touchdown (`touchstart`):**
   * Touching the right half of the screen (or the active unit) captures origin anchor coordinates (`originX, originY`).
2. **Drag & Trajectory (`touchmove`):**
   * Barrel aim angle is derived inversely from the drag vector:
     $$\theta = \text{atan2}(originY - touchY, originX - touchX)$$
   * Pixel distance $D = \sqrt{\Delta x^2 + \Delta y^2}$ maps directly to shot power:
     $$\text{Power} = \min\left(100\%, \frac{D}{D_{\max}} \times 100\%\right) \quad (D_{\max} \approx 130\text{px})$$
   * Renders an elastic guide chord and directional aim arrow.
3. **Release (`touchend`):**
   * Lifting the finger discharges ordnance at calculated power and angle (`this.fire()`).
4. **Safe Cancellation:**
   * Retracting the touch point back to origin ($D < 15\text{px}$) or dragging into a top-right **[ Cancel ]** zone safely cancels the shot and discharges zero ammo.

### 3.3. Action & HUD Hotkeys
- **Tactical Module (`Q`):** Tapping the module card on the bottom HUD triggers ability activation.
- **Weapon Selection:** Tapping the primary weapon slot opens a compact weapon selector grid.
- **Utilities (Teleport & Grappling Hook):** Directly accessible via HUD quick-slots.

---

## 4. Phase 2: Viewport & Safe-Area Adaptation

### 4.1. Resolution & Aspect Ratio
- The logical internal coordinate space remains fixed at **960×540 (16:9)**.
- Modern devices feature 19.5:9 or 20:9 displays.
- The canvas expands vertically to fill display bounds, centering horizontally with extended backdrop scenery or clean letterboxing.

### 4.2. Viewport & CSS Safe Area
- `index.html` viewport meta tag includes `viewport-fit=cover`:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  ```
- Safe-area offsets prevent notch clipping (Dynamic Island, camera punch-holes):
  ```css
  padding-left: max(12px, env(safe-area-inset-left));
  padding-right: max(12px, env(safe-area-inset-right));
  ```
- **Orientation Lock:** Landscape mode is enforced. Portrait orientation prompts a "Please rotate your device to landscape" overlay.

---

## 5. Phase 3: Audio, Haptics & Lifecycle

### 5.1. Web Audio Mobile Unlock
Mobile browsers suspend Web Audio contexts until the first user interaction.
- The initial screen interaction (`touchstart` or menu tap) triggers a one-time `audioCtx.resume()` promise.

### 5.2. Haptic Feedback
Utilizes standard `navigator.vibrate` APIs:
- Heavy Detonations: `navigator.vibrate(35)` (firm, punchy haptic pulse).
- Firing Recoil: `navigator.vibrate(15)` (subtle tactile kick).
- Silently no-ops on unsupported or muted devices.

### 5.3. Lifecycle & Background Pausing
Incoming phone calls or app switching triggers `visibilitychange` listeners, pausing the render loop and suspending audio generation.

---

## 6. Phase 4: Container Packaging with Capacitor

The existing codebase embeds cleanly inside an unbundled Capacitor container:

```bash
# 1. Install Capacitor CLI & platforms
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# 2. Initialize Capacitor
npx cap init "Out of Warranty" "com.bahattinercan.outofwarranty" --web-dir "."

# 3. Add Android platform
npx cap add android

# 4. Sync assets and launch Android Studio
npx cap copy
npx cap open android
```

### Capacitor Settings (`capacitor.config.json`)
- Immersive fullscreen mode enabled.
- Screen orientation locked to `landscape`.
- Hardware back button mapped to in-game `Esc` (Cancel / Menu).

---

## 7. Phase 5: Monetization & Store Publication

1. **Rewarded Ads Integration:**
   * The existing `js/portal.js` facade binds to the official Capacitor AdMob plugin (`@capacitor-community/admob`).
   * The match results "2× Scrap" button triggers rewarded video ads in native builds.
2. **Store Assets:**
   * High-resolution visual assets in `art/marketing/` (store icons, banners, screenshots) populate Google Play and App Store product pages.
