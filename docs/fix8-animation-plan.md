# FIX-8 (Köpek) Hero Spritesheet Animation Plan

See full design document and details in the conversation artifact or this project document.

## 1. Executive Summary & Objective

The objective of this plan is to establish **FIX-8** (`kopek`), the iconic maintenance robot of *Garanti Dışı* (*Out of Warranty*), as the gold-standard reference benchmark for full-body in-game spritesheet animation. 

Instead of generic deformations or placeholder static wobbles, FIX-8 will feature **handcrafted, splash-art fidelity animations** matching the exact lineart, volume, color palette, and mechanical anatomy of `assets/robots/kopek.webp`.

### Core Anatomical & Locomotion Contract
- **Identity**: FIX-8 (`kopek`), Maintenance Class (*Bakım*).
- **Upper Body**: Warm industrial yellow chassis (`#e8a020`), dual teal LED visor (`#63e6be`), top-mounted flexible radio antenna, rear repair battery / welder tank pack with conduit cable.
- **Limbs**: Segmented mechanical arms with dual-hinged elbows and 3-finger utility clamps.
- **Locomotion**: **Wheeled Legs (Roller-Skate Strides)**. FIX-8 has articulated robotic legs (hips, thighs, knees, shins) terminating in rubber roller wheels mounted on ankle brackets.
- **Walking Dynamics**: FIX-8 does *not* slide rigidly like a statue. It performs an **expressive roller-stride gait**: one leg strides forward while gliding on its wheel, the torso dips and leans forward into the momentum, the rear leg pushes backward, and the wheels spin smoothly along the ground surface.

---

## 2. Root-Cause Post-Mortem: Why Previous Sprites Floated and Froze

1. **Floating Above Ground (120px Empty Void)**:
   - In `tools/spritesheet-builder.py`, `canonical_cell.crop((0, split_y, w, h))` cropped the lower body (legs & wheels) from `split_y` (~155) to `h` (272).
   - When pasting onto the blank frame, the builder mistakenly executed `canvas.paste(lower, (0, base_dy), lower)` where `base_dy ≈ -6`.
   - **Result**: The lower body was pasted at the very top of the image overlapping the head/chest! The lower half of the 256×272 frame (from y=152 to y=272) was 100% transparent. In-game, `drawRobot` anchored y=260 to the ground, causing the character's feet to float 108 pixels in mid-air above the terrain shadow.
2. **Size Shrinking / Growing Across States**:
   - Because `idle`, `walk`, and `fire` cropped only upper/lower sections, their rendered height was only ~150px.
   - In contrast, `jump` and `hit` pasted the full `canonical_cell` directly (height ~262px).
   - **Result**: Whenever the character transitioned from walking to jumping or taking damage, it abruptly scaled up by nearly 200%, creating violent jarring size shifts.
3. **Apparent Animation Freeze in Live Match**:
   - In `js/entity.js`, `options.aim` was passed unconditionally as a number. In `resolveRobotAnimation`, any finite `o.aim` was prioritized over `idle`, forcing the robot permanently into the single-frame `aim` state during gameplay instead of playing the 4-frame breathing idle loop.

---

## 3. FIX-8 Anatomical Rigging & Decomposition

Layers derived directly from the canonical splash art `assets/robots/kopek.webp`:
1. **Rear Welder Pack**: Stays mounted behind the back plate; vibrates slightly under high engine revs and during skill activation.
2. **Torso & Head Unit**: Maintains the canonical 512×544 high-res aesthetic. Antenna responds to inertia with realistic elastic follow-through.
3. **Leg Assemblies (Left & Right)**:
   - Upper thigh segment pivoting at hip socket.
   - Knee joint flexing between 15° and 65° during stride and landing.
   - Ankle suspension strut absorbing impact.
4. **Roller Wheels**:
   - Elliptical rubber tires with hubcaps.
   - Realistic rotation angle synchronized with horizontal movement speed.
   - Wheels strictly contact the ground baseline at $Y = 260\text{ px}$.

---

## 4. Complete 10-State Frame-by-Frame Specification (34 Frames)

Formatted as a **6-column × 10-row matrix** (1536×2720 WebP), with each cell exactly **256×272 pixels**.

| State | Row | Frames | Duration | Loop | Core Action & Keyframe Breakdown |
|---|---|---|---|---|---|
| **idle** | 0 | 4 | 800 ms (200ms/f) | Yes | **Suspension Breathing & Ready Stance**.<br>• *F0*: Neutral balanced stance, wheels flat on ground baseline ($Y=260$).<br>• *F1*: Slight torso dip (-2px) as suspension compresses; antenna flexes back.<br>• *F2*: Inhale peak (+3px rise), visor LEDs brighten slightly.<br>• *F3*: Gentle settle back toward neutral. |
| **walk** | 1 | 6 | 600 ms (100ms/f) | Yes | **Articulated Roller-Stride Locomotion**.<br>• *F0 (Contact)*: Left leg forward with wheel grounded; right leg trailing back.<br>• *F1 (Drive/Roll)*: Left wheel rolls backward under body; torso leans forward 4°.<br>• *F2 (Push-Off)*: Right leg lifts off ground and swings forward; hips bob down.<br>• *F3 (Cross Contact)*: Right leg planted forward; left leg drives rearward.<br>• *F4 (Drive/Roll)*: Right wheel rolls under body; torso rises smoothly.<br>• *F5 (Recovery)*: Left leg swings through, returning to F0. |
| **aim** | 2 | 1 | Hold | Single | **Locked Stance**.<br>• *F0*: Stable combat posture, knees slightly bent (absorbing aim recoil), torso turned 10° toward crosshair, wheels locked to baseline. |
| **fire** | 3 | 3 | 180 ms (60ms/f) | Single | **High-Impact Recoil Snapback**.<br>• *F0*: Explosive snapback! Torso kicks back -6px, knees flex, antenna whips forward.<br>• *F1*: Peak recoil absorption, wheels slide back -2px with tiny tire smoke puff.<br>• *F2*: Elastic spring return back to aiming stance. |
| **jump** | 4 | 3 | Dynamic (Vy < 0) | Sequence | **Three-Phase Launch**.<br>• *F0 (Crouch)*: Anticipation squash, knees deeply bent (-8px), wheels flat on ground.<br>• *F1 (Liftoff)*: Explosive upward thrust, legs fully extended downward pushing off baseline.<br>• *F2 (Apex)*: Airborne float, legs tucked comfortably up, wheels trailing in air. |
| **fall** | 5 | 2 | Dynamic (Vy > 0) | Loop | **Gravitational Descent**.<br>• *F0*: Wind resistance tilt; arms flared outward for balance, wheels hanging.<br>• *F1*: Legs reaching down in anticipation of terrain touchdown. |
| **land** | 6 | 3 | 180 ms (60ms/f) | Single | **Heavy Suspension Impact & Damping**.<br>• *F0 (Impact)*: Wheels touch ground baseline at $Y=260$.<br>• *F1 (Squash)*: Deep suspension compression (-10px torso dip, knees splayed outward).<br>• *F2 (Rebound)*: Elastic rebound upward (+4px) settling back into idle. |
| **hit** | 7 | 3 | 240 ms (80ms/f) | Single | **Kinetic Flinch & Recovery**.<br>• *F0*: Violent flinch! Head snaps backward, torso pushed back -7px, shield flash.<br>• *F1*: Stagger recovery, arms flailing to regain balance on wheels.<br>• *F2*: Resolute stance recovery, visor LED recalibrates. |
| **skill** | 8 | 3 | 450 ms (150ms/f) | Single | **Acil Onarım (Emergency Arc Weld)**.<br>• *F0 (Draw)*: FIX-8 unholsters maintenance welder torch with right gripper.<br>• *F1 (Surge)*: High-intensity teal welding arc flash (`#63e6be`) emitting repair sparks; visor shines bright.<br>• *F2 (Seal)*: Steam purge from welder nozzle, smooth return to combat stance. |
| **death** | 9 | 6 | 720 ms (120ms/f) | Single (Hold) | **Decommissioning & Ground Collapse**.<br>• *F0*: Visor LED flickers and dies; spark burst from battery pack.<br>• *F1*: Loss of balance; wheels skid outward as knees give way.<br>• *F2*: Torso drops toward terrain ($Y=260$).<br>• *F3*: Chassis strikes ground with mechanical bounce.<br>• *F4*: Welder pack detaches slightly; loose bolts scatter.<br>• *F5 (Inert)*: Final scrap pile resting completely flat on terrain baseline. |

---

## 5. Ground Pinning & Baseline Geometry Standards

1. **Strict Baseline Pinning**:
   $$\text{GROUND\_BASELINE} = 260\text{ px (out of 272)}$$
   In all grounded states, the bottom of the wheels sits exactly at $Y=260\text{ px}$.
2. **In-Game Rendering (`drawRobot`)**:
   $$\text{drawW} = r \times 2.32$$
   $$\text{drawH} = \text{drawW} \times (272 / 256)$$
   $$\text{drawX} = -\text{drawW} / 2$$
   $$\text{drawY} = r - \text{drawH} \times (260 / 272)$$
   This guarantees 100% mathematical contact between the wheels and the terrain shadow.
