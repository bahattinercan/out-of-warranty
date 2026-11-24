#!/usr/bin/env python3
"""
frame-extractor.py — Extracts individual animation frames from raw AI strips/grids,
removes pure/near-white background, and saves RGBA PNG frames.
"""

import os
import sys
import numpy as np
from PIL import Image

def remove_white_bg(img, threshold=245):
    """Converts white/near-white pixels to transparent RGBA."""
    rgba = img.convert("RGBA")
    data = np.array(rgba)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    # Mask where pixel is very bright/white
    white_mask = (r >= threshold) & (g >= threshold) & (b >= threshold)
    data[:, :, 3][white_mask] = 0
    return Image.fromarray(data)

def extract_horizontal_strip(strip_path, num_frames, out_dir, prefix):
    os.makedirs(out_dir, exist_ok=True)
    raw = Image.open(strip_path)
    w, h = raw.size
    frame_w = w // num_frames

    saved_paths = []
    for i in range(num_frames):
        box = (i * frame_w, 0, (i + 1) * frame_w, h)
        cropped = raw.crop(box)
        alpha_img = remove_white_bg(cropped)

        # Get bounding box of non-zero alpha
        bbox = alpha_img.getbbox()
        if bbox:
            subject = alpha_img.crop(bbox)
        else:
            subject = alpha_img

        out_name = f"{prefix}_{i}.png"
        out_path = os.path.join(out_dir, out_name)
        subject.save(out_path)
        saved_paths.append(out_path)
        print(f"Extracted {out_name}: bbox {subject.size}")

    return saved_paths

def extract_grid(grid_path, cols, rows, out_dir, prefix):
    os.makedirs(out_dir, exist_ok=True)
    raw = Image.open(grid_path)
    w, h = raw.size
    cell_w = w // cols
    cell_h = h // rows

    saved_paths = []
    idx = 0
    for r in range(rows):
        for c in range(cols):
            box = (c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h)
            cropped = raw.crop(box)
            alpha_img = remove_white_bg(cropped)
            bbox = alpha_img.getbbox()
            if bbox:
                subject = alpha_img.crop(bbox)
            else:
                subject = alpha_img

            out_name = f"{prefix}_{idx}.png"
            out_path = os.path.join(out_dir, out_name)
            subject.save(out_path)
            saved_paths.append(out_path)
            print(f"Extracted {out_name}: bbox {subject.size}")
            idx += 1

    return saved_paths

def main():
    if len(sys.argv) < 2:
        print("Usage: python frame-extractor.py [idle_strip] [walk_grid]")
        sys.exit(1)

if __name__ == "__main__":
    main()
