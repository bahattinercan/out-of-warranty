#!/usr/bin/env python3
"""Extract alpha-preserving track-family cutouts from hand-authored polygon masks.

Masks are source-pixel polygons in art/rigs/<id>/masks.json. This tool deliberately
does not infer pivots or anatomy: those must be recorded from reviewed source art.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def extract(robot: str) -> dict:
    rig_dir = ROOT / "art" / "rigs" / robot
    mask_path = rig_dir / "masks.json"
    source_path = ROOT / "assets" / "robots" / f"{robot}.webp"
    if not mask_path.is_file() or not source_path.is_file():
        raise ValueError(f"{robot}: source or reviewed masks.json is missing")
    data = json.loads(mask_path.read_text(encoding="utf-8"))
    source = Image.open(source_path).convert("RGBA")
    if data.get("sourceSize") != list(source.size):
        raise ValueError(f"{robot}: sourceSize does not match {source.size}")
    parts = data.get("parts", {})
    if not parts:
        raise ValueError(f"{robot}: masks.json has no parts")

    out_dir = rig_dir / "parts"
    out_dir.mkdir(parents=True, exist_ok=True)
    reconstruction = Image.new("RGBA", source.size, (0, 0, 0, 0))
    for name, spec in parts.items():
        polygon = spec.get("polygon")
        pivot = spec.get("pivot")
        if not isinstance(polygon, list) or len(polygon) < 3 or not isinstance(pivot, list) or len(pivot) != 2:
            raise ValueError(f"{robot}/{name}: reviewed polygon and pivot are required")
        mask = Image.new("L", source.size, 0)
        ImageDraw.Draw(mask).polygon([tuple(point) for point in polygon], fill=255)
        mask = Image.composite(mask, Image.new("L", source.size, 0), source.getchannel("A"))
        bounds = mask.getbbox()
        if not bounds:
            raise ValueError(f"{robot}/{name}: polygon selects no visible source pixels")
        part = source.crop(bounds)
        part.putalpha(mask.crop(bounds))
        part.save(out_dir / f"{name}.png")
        reconstruction.alpha_composite(part, (bounds[0], bounds[1]))
    src_a = source.getchannel("A")
    rec_a = reconstruction.getchannel("A")
    src_px, rec_px = src_a.load(), rec_a.load()
    differing = sum(src_px[x, y] != rec_px[x, y] for y in range(source.height) for x in range(source.width))
    alpha_pixels = sum(src_px[x, y] > 0 for y in range(source.height) for x in range(source.width))
    ratio = differing / max(1, alpha_pixels)
    debug = rig_dir / "debug"
    debug.mkdir(parents=True, exist_ok=True)
    reconstruction.save(debug / "reassembled.png")
    return {"robot": robot, "parts": len(parts), "differingAlphaPixels": differing,
            "sourceAlphaPixels": alpha_pixels, "diffRatio": ratio}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("robot", choices="ayi panda timsah suaygiri yeti armadillo ejderha oklukirpi".split())
    args = parser.parse_args()
    print(json.dumps(extract(args.robot), ensure_ascii=False))


if __name__ == "__main__":
    main()
