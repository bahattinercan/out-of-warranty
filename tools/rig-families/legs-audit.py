#!/usr/bin/env python3
"""Source review and reassembly audit utilities for the legged robot family."""
from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops

ROOT = Path(__file__).resolve().parents[2]
ROBOTS = ("tilki", "kaplan", "ordek", "aslan", "kurtadam", "dino", "bukalemun", "zurafa")


def source_board(robot: str) -> tuple[int, int, int, int]:
    path = ROOT / "assets" / "robots" / f"{robot}.webp"
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    count = sum(1 for value in alpha.get_flattened_data() if value)
    rig_dir = ROOT / "art" / "rigs" / robot
    debug = rig_dir / "debug"
    debug.mkdir(parents=True, exist_ok=True)
    board = Image.new("RGBA", (width * 2, height * 2 + 36), (55, 59, 66, 255))
    image = image.resize((width * 2, height * 2), Image.Resampling.NEAREST)
    board.alpha_composite(image, (0, 0))
    ImageDraw.Draw(board).text((8, height * 2 + 10), f"{robot}  {width}x{height}  alpha={count}  bbox={bbox}",
                               fill=(255, 255, 255, 255), font=ImageFont.load_default())
    board.save(debug / "source-2x.png")
    return width, height, count, count if bbox else 0


def reassembly_diff(robot: str) -> tuple[int, int, float]:
    source = Image.open(ROOT / "assets" / "robots" / f"{robot}.webp").convert("RGBA")
    rebuilt_path = ROOT / "art" / "rigs" / robot / "debug" / "reassembled.png"
    if not rebuilt_path.exists():
        raise FileNotFoundError(f"missing reassembly: {rebuilt_path.relative_to(ROOT)}")
    rebuilt = Image.open(rebuilt_path).convert("RGBA")
    if rebuilt.size != source.size:
        raise ValueError(f"{robot}: source/reassembly dimensions differ: {source.size} vs {rebuilt.size}")
    src_a, out_a = source.getchannel("A"), rebuilt.getchannel("A")
    diff = ImageChops.difference(src_a, out_a).point(lambda value: 255 if value else 0)
    pixels = sum(1 for value in diff.get_flattened_data() if value)
    total = sum(1 for value in src_a.get_flattened_data() if value)
    return pixels, total, 100 * pixels / max(1, total)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--robot", choices=ROBOTS, action="append", help="robot to audit; defaults to all eight")
    parser.add_argument("--diff", action="store_true", help="also compare debug/reassembled.png alpha against source")
    args = parser.parse_args()
    for robot in args.robot or ROBOTS:
        width, height, alpha, _ = source_board(robot)
        message = f"{robot}: source {width}x{height}, {alpha} nontransparent pixels; source-2x board written"
        if args.diff:
            changed, total, percent = reassembly_diff(robot)
            message += f"; alpha diff {changed}/{total} ({percent:.3f}%)"
        print(message)


if __name__ == "__main__":
    main()
