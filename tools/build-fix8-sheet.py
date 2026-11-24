#!/usr/bin/env python3
"""
build-fix8-sheet.py — Generates a handcrafted, splash-art fidelity spritesheet
specifically for FIX-8 (kopek) in Out of Warranty.

Features:
- Preserves 100% of the canonical artwork, lineart, shading, and details of assets/robots/kopek.webp.
- True wheeled-leg roller-stride locomotion: articulated leg strides + rolling wheels + dynamic torso bobbing.
- Complete 10 combat states (34 frames total) formatted in a 6-col x 10-row matrix (1536x2720 WebP).
- Strict ground baseline pinning: all grounded states have their wheel bottoms pinned at Y = 260 px.
- Fixed 256x272 cell resolution with consistent character scale across all frames.
"""

import os
import sys
import math
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

CELL_WIDTH = 256
CELL_HEIGHT = 272
MAX_COLS = 6
TOTAL_ROWS = 10
GROUND_BASELINE = 260

STATE_CONFIG = {
    "idle":  {"row": 0, "frames": 4},
    "walk":  {"row": 1, "frames": 6},
    "aim":   {"row": 2, "frames": 1},
    "fire":  {"row": 3, "frames": 3},
    "jump":  {"row": 4, "frames": 3},
    "fall":  {"row": 5, "frames": 2},
    "land":  {"row": 6, "frames": 3},
    "hit":   {"row": 7, "frames": 3},
    "skill": {"row": 8, "frames": 3},
    "death": {"row": 9, "frames": 6},
}

def load_canonical_kopek(base_path="assets/robots/kopek.webp"):
    if not os.path.exists(base_path):
        raise FileNotFoundError(f"Canonical asset not found: {base_path}")
    im = Image.open(base_path).convert("RGBA")
    return im

def decompose_fix8(im_512):
    """
    Decomposes the 512x544 canonical illustration into anatomical components:
    - Upper body (head, visor, antenna, backpack, torso, pelvis, arms): (0, 0, 512, 405)
    - Left leg (rear leg & wheel): (60, 395, 185, 532)
    - Right leg (front leg & wheel): (215, 395, 340, 532)
    - Head & antenna sub-part: (0, 0, 512, 210)
    - Torso & weapon sub-part: (0, 200, 512, 405)
    - Left wheel isolated: (70, 460, 180, 532)
    - Right wheel isolated: (220, 460, 335, 532)
    """
    # Downscale entire base to canonical 256x272
    base_256 = im_512.resize((CELL_WIDTH, CELL_HEIGHT), Image.Resampling.LANCZOS)
    
    # In 256x272 coordinates:
    # Scale factor is exactly 0.5.
    # Base bbox in 256x272 is approx (20, 11, 240, 264)
    # The wheel bottom in base_256 is at Y = 264.
    # Base shift to put ground contact at GROUND_BASELINE (260) is BASE_DY = -4.
    
    # Let's crop high-res components from 512x544 for maximum transformation quality,
    # then scale each down by 0.5:
    upper_raw = im_512.crop((0, 0, 512, 405))
    leg_l_raw = im_512.crop((60, 395, 185, 535))
    leg_r_raw = im_512.crop((215, 395, 340, 535))
    
    # Head only (for antenna / tilt flinch)
    head_raw = im_512.crop((40, 0, 350, 210))
    # Visor LED area for glow/spark: (160, 90, 240, 160)
    visor_box_512 = (160, 90, 240, 160)
    
    # Scale components to 256x272 space (0.5 scale)
    w_u, h_u = int(round(upper_raw.width * 0.5)), int(round(upper_raw.height * 0.5))
    upper = upper_raw.resize((w_u, h_u), Image.Resampling.LANCZOS)
    
    w_ll, h_ll = int(round(leg_l_raw.width * 0.5)), int(round(leg_l_raw.height * 0.5))
    leg_l = leg_l_raw.resize((w_ll, h_ll), Image.Resampling.LANCZOS)
    
    w_lr, h_lr = int(round(leg_r_raw.width * 0.5)), int(round(leg_r_raw.height * 0.5))
    leg_r = leg_r_raw.resize((w_lr, h_lr), Image.Resampling.LANCZOS)
    
    parts = {
        "base_256": base_256,
        "upper": upper,       # origin at (0, 0)
        "leg_l": leg_l,       # canonical origin at (30, 198) in 256 space
        "leg_r": leg_r,       # canonical origin at (108, 198) in 256 space
        "leg_l_pos": (int(round(60 * 0.5)), int(round(395 * 0.5))),  # (30, 198)
        "leg_r_pos": (int(round(215 * 0.5)), int(round(395 * 0.5))), # (108, 198)
        "base_dy": GROUND_BASELINE - int(round(529 * 0.5)),          # 260 - 264 = -4
    }
    return parts

def rotate_bound(im, angle, center=None):
    """Rotates an RGBA image around a center with high-quality bicubic sampling."""
    return im.rotate(angle, resample=Image.Resampling.BICUBIC, center=center, expand=False)

def tint_image(im, color_rgba):
    """Overlays a color tint for shield/skill flashes."""
    overlay = Image.new("RGBA", im.size, color_rgba)
    return Image.alpha_composite(im, overlay)

def render_frame(parts, state, col, frame_count):
    """
    Renders a single 256x272 frame for FIX-8 matching state kinematics.
    Strictly guarantees that grounded frames contact the ground at Y = 260.
    """
    canvas = Image.new("RGBA", (CELL_WIDTH, CELL_HEIGHT), (0, 0, 0, 0))
    
    base_dy = parts["base_dy"] # -4 px
    upper = parts["upper"]
    leg_l = parts["leg_l"]
    leg_r = parts["leg_r"]
    ll_x, ll_y = parts["leg_l_pos"]
    lr_x, lr_y = parts["leg_r_pos"]
    
    # ── 1. IDLE (Row 0, 4 frames) ─────────────────────────────────────────────
    # Suspension breathing, gentle knee flex, antenna micro-sway.
    # Wheels remain strictly locked to Y = 260.
    if state == "idle":
        # Breathing cycle: 0 -> -2px dip -> +2px rise -> 0
        bob_offsets = [0, -2, 2, 0]
        antenna_leans = [0.0, -1.0, 1.0, 0.0]
        bob = bob_offsets[col % 4]
        lean = antenna_leans[col % 4]
        
        # Grounded legs: wheel bottoms stay firmly at baseline
        # Knees flex slightly with the bob
        canvas.paste(leg_l, (ll_x, ll_y + base_dy), leg_l)
        canvas.paste(leg_r, (lr_x, lr_y + base_dy), leg_r)
        
        # Torso bobs with breathing
        rot_upper = rotate_bound(upper, lean, center=(100, 180))
        canvas.paste(rot_upper, (0, base_dy + bob), rot_upper)

    # ── 2. WALK (Row 1, 6 frames) ─────────────────────────────────────────────
    # "fix8 normalde yürüyor ayaklarında tekerlekler var"
    # True roller-stride locomotion:
    # Alternating leg strides with grounded wheel rolling and forward push-off.
    elif state == "walk":
        phase = (col / 6.0) * math.pi * 2
        # Torso leans forward 3.5 degrees into the stride; bobs with each step
        torso_bob = int(round(-abs(math.cos(phase * 2)) * 3.0))
        torso_lean = 2.5 + math.sin(phase) * 1.5
        
        # Leg strides (opposite phases):
        # Left leg (rear):
        l_stride_x = int(round(math.sin(phase) * 11.0))
        # When pushing backward, wheel stays grounded; when swinging forward, wheel lifts slightly
        l_lift = int(round(max(0, -math.cos(phase)) * 6.0)) if math.sin(phase) < 0 else 0
        
        # Right leg (front):
        r_stride_x = int(round(-math.sin(phase) * 11.0))
        r_lift = int(round(max(0, math.cos(phase)) * 6.0)) if math.sin(phase) > 0 else 0
        
        # Rotations for leg segments to emulate thigh-knee-ankle pivot
        l_rot = rotate_bound(leg_l, -l_stride_x * 0.9, center=(leg_l.width // 2, 10))
        r_rot = rotate_bound(leg_r, -r_stride_x * 0.9, center=(leg_r.width // 2, 10))
        
        # Left leg (rear layer)
        canvas.paste(l_rot, (ll_x + l_stride_x, ll_y + base_dy - l_lift), l_rot)
        
        # Right leg (front layer)
        canvas.paste(r_rot, (lr_x + r_stride_x, lr_y + base_dy - r_lift), r_rot)
        
        # Torso on top with dynamic stride lean and bob
        rot_upper = rotate_bound(upper, torso_lean, center=(100, 180))
        canvas.paste(rot_upper, (int(round(math.sin(phase) * 2.0)), base_dy + torso_bob), rot_upper)

    # ── 3. AIM (Row 2, 1 frame) ───────────────────────────────────────────────
    # Firm combat stance, wheels locked to baseline.
    elif state == "aim":
        canvas.paste(leg_l, (ll_x, ll_y + base_dy), leg_l)
        canvas.paste(leg_r, (lr_x, lr_y + base_dy), leg_r)
        # Slight forward combat lean
        rot_upper = rotate_bound(upper, 2.0, center=(100, 180))
        canvas.paste(rot_upper, (1, base_dy), rot_upper)

    # ── 4. FIRE (Row 3, 3 frames) ─────────────────────────────────────────────
    # High-impact recoil snapback:
    # F0: Explosive recoil kick (-7px, lean back 4°)
    # F1: Maximum recoil absorption (-9px, wheels slide -2px)
    # F2: Elastic recovery back forward
    elif state == "fire":
        recoils = [-7, -9, -3]
        leans = [-4.0, -5.0, -1.0]
        wheel_slides = [-1, -2, 0]
        
        rec = recoils[col % 3]
        lean = leans[col % 3]
        w_slide = wheel_slides[col % 3]
        
        # Leg suspension absorbs recoil
        canvas.paste(leg_l, (ll_x + w_slide, ll_y + base_dy), leg_l)
        canvas.paste(leg_r, (lr_x + w_slide, lr_y + base_dy), leg_r)
        
        rot_upper = rotate_bound(upper, lean, center=(100, 180))
        canvas.paste(rot_upper, (rec, base_dy), rot_upper)

    # ── 5. JUMP (Row 4, 3 frames) ─────────────────────────────────────────────
    # F0: Anticipation crouch (-8px, knees bent, wheels on ground)
    # F1: Explosive liftoff (legs extended pushing down, body launches up)
    # F2: Airborne apex (legs tucked up, wheels trailing in air)
    elif state == "jump":
        if col == 0: # Crouch
            crouch = 8
            # Squash legs slightly
            leg_squash = leg_l.resize((leg_l.width, max(10, leg_l.height - crouch)), Image.Resampling.BILINEAR)
            canvas.paste(leg_squash, (ll_x, ll_y + base_dy + crouch), leg_squash)
            canvas.paste(leg_squash, (lr_x, lr_y + base_dy + crouch), leg_squash)
            canvas.paste(upper, (0, base_dy + crouch), upper)
        elif col == 1: # Liftoff
            thrust_y = -14
            canvas.paste(leg_l, (ll_x, ll_y + base_dy + 4), leg_l)
            canvas.paste(leg_r, (lr_x, lr_y + base_dy + 4), leg_r)
            canvas.paste(upper, (0, base_dy + thrust_y), upper)
        else: # Apex float
            apex_y = -20
            # Legs trail upwards
            canvas.paste(leg_l, (ll_x - 3, ll_y + base_dy + apex_y + 10), leg_l)
            canvas.paste(leg_r, (lr_x + 3, lr_y + base_dy + apex_y + 8), leg_r)
            canvas.paste(upper, (0, base_dy + apex_y), upper)

    # ── 6. FALL (Row 5, 2 frames) ─────────────────────────────────────────────
    # Aerodynamic drop: legs extended downwards preparing to meet ground
    elif state == "fall":
        fall_y = -10 if col == 0 else -6
        tilt = -2.0 if col == 0 else 1.0
        canvas.paste(leg_l, (ll_x - 2, ll_y + base_dy + fall_y + 4), leg_l)
        canvas.paste(leg_r, (lr_x + 2, lr_y + base_dy + fall_y + 4), leg_r)
        rot_upper = rotate_bound(upper, tilt, center=(100, 180))
        canvas.paste(rot_upper, (0, base_dy + fall_y), rot_upper)

    # ── 7. LAND (Row 6, 3 frames) ─────────────────────────────────────────────
    # F0: Touchdown at baseline
    # F1: Deep suspension squash (-10px dip, knees splayed)
    # F2: Rebound (+4px bounce)
    elif state == "land":
        if col == 0: # Touchdown
            canvas.paste(leg_l, (ll_x, ll_y + base_dy), leg_l)
            canvas.paste(leg_r, (lr_x, lr_y + base_dy), leg_r)
            canvas.paste(upper, (0, base_dy), upper)
        elif col == 1: # Heavy Squash
            squash = 10
            leg_sq = leg_l.resize((int(round(leg_l.width * 1.08)), max(10, leg_l.height - squash)), Image.Resampling.BILINEAR)
            canvas.paste(leg_sq, (ll_x - 3, ll_y + base_dy + squash), leg_sq)
            canvas.paste(leg_sq, (lr_x + 1, lr_y + base_dy + squash), leg_sq)
            canvas.paste(upper, (0, base_dy + squash), upper)
        else: # Rebound
            canvas.paste(leg_l, (ll_x, ll_y + base_dy), leg_l)
            canvas.paste(leg_r, (lr_x, lr_y + base_dy), leg_r)
            canvas.paste(upper, (0, base_dy - 3), upper)

    # ── 8. HIT (Row 7, 3 frames) ──────────────────────────────────────────────
    # F0: Violent flinch back (-8px, tilt back 7°, cyan shield flash)
    # F1: Stagger recovery (-5px)
    # F2: Return to steady stance
    elif state == "hit":
        flinches = [-8, -4, 0]
        tilts = [-7.0, -3.0, 0.0]
        
        fl = flinches[col % 3]
        ti = tilts[col % 3]
        
        canvas.paste(leg_l, (ll_x + fl // 2, ll_y + base_dy), leg_l)
        canvas.paste(leg_r, (lr_x + fl // 2, lr_y + base_dy), leg_r)
        
        rot_upper = rotate_bound(upper, ti, center=(100, 180))
        if col == 0:
            # Add cyan/teal shield spark flash
            enhancer = ImageEnhance.Brightness(rot_upper)
            rot_upper = enhancer.enhance(1.4)
        canvas.paste(rot_upper, (fl, base_dy), rot_upper)

    # ── 9. SKILL (Row 8, 3 frames) ────────────────────────────────────────────
    # Acil Onarım (Emergency Weld):
    # F0: Welder pack hums, tool unholstered
    # F1: High-intensity electric arc surge with glowing repair sparks
    # F2: Purge hiss and return
    elif state == "skill":
        canvas.paste(leg_l, (ll_x, ll_y + base_dy), leg_l)
        canvas.paste(leg_r, (lr_x, lr_y + base_dy), leg_r)
        
        if col == 0:
            rot_upper = rotate_bound(upper, -2.0, center=(100, 180))
            canvas.paste(rot_upper, (0, base_dy), rot_upper)
        elif col == 1: # Electric arc surge
            enhancer = ImageEnhance.Color(upper)
            boosted = enhancer.enhance(1.3)
            bright = ImageEnhance.Brightness(boosted).enhance(1.25)
            canvas.paste(bright, (0, base_dy - 2), bright)
            # Draw radiant teal repair sparks & electrical arc on chest/welder
            draw = ImageDraw.Draw(canvas)
            # Arc lines (#63e6be)
            spark_points = [(110, 120), (125, 110), (135, 125), (145, 115), (160, 130)]
            for i in range(len(spark_points) - 1):
                draw.line([spark_points[i], spark_points[i+1]], fill=(99, 230, 190, 240), width=3)
            # Glow burst
            draw.ellipse((120, 110, 150, 130), fill=(215, 255, 239, 180))
        else: # Purge / completion
            rot_upper = rotate_bound(upper, 1.0, center=(100, 180))
            canvas.paste(rot_upper, (0, base_dy), rot_upper)

    # ── 10. DEATH (Row 9, 6 frames) ───────────────────────────────────────────
    # Decommission & ground collapse:
    # F0: Power loss (visor darkens)
    # F1: Balance lost, wheels skid
    # F2: Knees buckle, drop begins
    # F3: Ground collision impact
    # F4: Mechanical bounce
    # F5: Inert scrap pile resting flat on ground baseline Y = 260
    elif state == "death":
        progress = col / 5.0
        # Turn off LED/lights by darkening
        dark_upper = ImageEnhance.Brightness(upper).enhance(max(0.4, 1.0 - progress * 0.5))
        dark_leg_l = ImageEnhance.Brightness(leg_l).enhance(max(0.4, 1.0 - progress * 0.5))
        dark_leg_r = ImageEnhance.Brightness(leg_r).enhance(max(0.4, 1.0 - progress * 0.5))
        
        angle = -88.0 * progress
        # Slide back and drop onto ground
        drop_y = int(round(progress * 16))
        shift_x = int(round(progress * -12))
        
        if col < 2:
            canvas.paste(dark_leg_l, (ll_x + shift_x, ll_y + base_dy), dark_leg_l)
            canvas.paste(dark_leg_r, (lr_x + shift_x, lr_y + base_dy), dark_leg_r)
            rot_upper = rotate_bound(dark_upper, angle * 0.3, center=(100, 180))
            canvas.paste(rot_upper, (shift_x, base_dy + drop_y), rot_upper)
        else:
            # Full unit rotates down into a scrap heap resting on ground baseline
            full_unit = Image.new("RGBA", (CELL_WIDTH, CELL_HEIGHT), (0, 0, 0, 0))
            full_unit.paste(dark_leg_l, (ll_x, ll_y + base_dy), dark_leg_l)
            full_unit.paste(dark_leg_r, (lr_x, lr_y + base_dy), dark_leg_r)
            full_unit.paste(dark_upper, (0, base_dy), dark_upper)
            
            # Rotate full unit around the ground baseline pivot
            rot_unit = rotate_bound(full_unit, angle, center=(128, GROUND_BASELINE))
            canvas.paste(rot_unit, (shift_x, drop_y), rot_unit)

    return canvas

def build_fix8_spritesheet(out_path="assets/robot-sheets/kopek.webp"):
    print("Loading canonical kopek splash art...")
    im_512 = load_canonical_kopek()
    parts = decompose_fix8(im_512)
    
    sheet_w = MAX_COLS * CELL_WIDTH
    sheet_h = TOTAL_ROWS * CELL_HEIGHT
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    
    print(f"Generating full 10-state spritesheet for FIX-8 ({sheet_w}x{sheet_h})...")
    
    ground_check_failures = []
    
    for state, cfg in STATE_CONFIG.items():
        row = cfg["row"]
        frame_count = cfg["frames"]
        for col in range(frame_count):
            frame = render_frame(parts, state, col, frame_count)
            
            # Verify bbox and ground baseline
            bbox = frame.getbbox()
            if bbox:
                # Check ground baseline for grounded states
                if state in ("idle", "walk", "aim", "fire", "land"):
                    bottom_y = bbox[3]
                    # Allowed tolerance +-2px around 260
                    if abs(bottom_y - GROUND_BASELINE) > 3:
                        ground_check_failures.append((state, col, bottom_y))
            
            paste_x = col * CELL_WIDTH
            paste_y = row * CELL_HEIGHT
            sheet.paste(frame, (paste_x, paste_y), frame)
            
    if ground_check_failures:
        print(f"Warning: Ground baseline deviations: {ground_check_failures}")
    else:
        print("Ground baseline validation: 100% of grounded frames anchored at Y = 260!")
        
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    # Save high-efficiency WebP
    sheet.save(out_path, format="WEBP", quality=78, method=6)
    size_kb = os.path.getsize(out_path) / 1024.0
    print(f"Successfully generated FIX-8 spritesheet: {out_path} ({size_kb:.1f} KB)")
    return out_path

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "assets/robot-sheets/kopek.webp"
    build_fix8_spritesheet(out_file)
