#!/usr/bin/env python3
"""Extract and audit Sirtlan's first source-specific rig kit."""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/robots/sirtlan.webp"
RIG = ROOT / "art/rigs/sirtlan"

# Hand-traced from the 512x544 source. Regions deliberately overlap at joints;
# the nearer piece owns overlap pixels in the bind reconstruction.
PARTS = {
    "head": ([(147, 92), (172, 76), (242, 82), (287, 104), (296, 160), (281, 218), (249, 236), (186, 228), (147, 204)], (222, 202)),
    "antenna_L": ([(162, 58), (173, 45), (183, 69), (183, 101), (171, 106)], (175, 98)),
    "antenna_R": ([(235, 60), (247, 48), (263, 65), (267, 100), (250, 105)], (252, 98)),
    "dish": ([(306, 10), (374, 4), (426, 32), (462, 81), (479, 157), (459, 218), (422, 251), (350, 257), (321, 229), (306, 179)], (360, 151)),
    "dish_arm": ([(309, 101), (338, 105), (387, 133), (397, 156), (382, 177), (350, 166), (317, 144)], (330, 122)),
    "neck": ([(184, 216), (249, 217), (267, 257), (247, 276), (190, 268), (175, 244)], (215, 240)),
    "torso": ([(153, 235), (187, 222), (255, 230), (286, 247), (303, 305), (295, 368), (278, 394), (205, 402), (161, 379), (145, 320)], (219, 317)),
    "arm_B_upper": ([(151, 244), (180, 255), (167, 293), (133, 325), (113, 315), (116, 292)], (153, 275)),
    "arm_B_fore": ([(117, 298), (143, 314), (129, 349), (112, 369), (85, 360), (77, 337)], (111, 335)),
    "hand_B": ([(54, 274), (81, 270), (100, 288), (96, 324), (77, 346), (53, 334), (42, 309)], (72, 307)),
    "tool_B": ([(39, 183), (91, 177), (120, 193), (126, 221), (112, 245), (76, 251), (47, 234)], (80, 217)),
    "arm_F_upper": ([(278, 250), (311, 256), (333, 285), (317, 316), (291, 315), (274, 288)], (299, 278)),
    "arm_F_fore": ([(310, 291), (340, 294), (378, 318), (373, 345), (342, 363), (316, 343)], (333, 324)),
    "hand_F": ([(368, 310), (400, 302), (430, 318), (437, 350), (419, 373), (390, 366), (371, 347)], (399, 332)),
    "tablet": ([(389, 271), (447, 267), (465, 285), (459, 353), (439, 369), (404, 356), (397, 326)], (414, 301)),
    "pelvis": ([(167, 375), (204, 383), (258, 379), (289, 392), (296, 429), (267, 448), (182, 444), (151, 426)], (222, 407)),
    "leg_B": ([(128, 401), (178, 395), (198, 427), (187, 458), (157, 476), (125, 460), (107, 429)], (157, 423)),
    "leg_F": ([(257, 397), (302, 391), (330, 416), (335, 448), (305, 468), (269, 459), (250, 432)], (292, 423)),
    "wheel_B": ([(106, 432), (131, 418), (167, 425), (190, 448), (199, 493), (183, 522), (144, 536), (112, 513), (100, 479)], (150, 482)),
    "wheel_M": ([(228, 430), (257, 416), (291, 424), (316, 446), (327, 487), (310, 517), (274, 531), (239, 512), (222, 478)], (274, 478)),
    "wheel_F": ([(326, 421), (352, 410), (383, 422), (405, 448), (410, 486), (390, 515), (357, 523), (328, 502), (316, 465)], (364, 470)),
}


def main() -> None:
    src = Image.open(SOURCE).convert("RGBA")
    w, h = src.size
    RIG.joinpath("parts").mkdir(parents=True, exist_ok=True)
    (RIG / "debug").mkdir(exist_ok=True)
    alpha = src.getchannel("A")
    pixels = src.load()
    names = list(PARTS)
    guide_masks = {}
    for name, (polygon, _pivot) in PARTS.items():
        guide = Image.new("1", src.size, 0)
        ImageDraw.Draw(guide).polygon(polygon, fill=1)
        guide_masks[name] = guide.load()
    labels = [-1] * (w * h)
    visible = []
    # Black ink separates many armor plates. Flood only the brighter paint and
    # metal interiors, then bind each connected island to its nearest authored pivot.
    for y in range(h):
        for x in range(w):
            if pixels[x, y][3]:
                visible.append(y * w + x)
    for seed in visible:
        if labels[seed] >= 0:
            continue
        sx, sy = seed % w, seed // w
        rgba = pixels[sx, sy]
        if (rgba[0] + rgba[1] + rgba[2]) // 3 < 62:
            continue
        queue = [seed]
        labels[seed] = -2
        component = []
        while queue:
            index = queue.pop()
            component.append(index)
            x, y = index % w, index // w
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if not (0 <= nx < w and 0 <= ny < h):
                    continue
                ni = ny * w + nx
                if labels[ni] >= 0 or labels[ni] == -2 or not pixels[nx, ny][3]:
                    continue
                color = pixels[nx, ny]
                if (color[0] + color[1] + color[2]) // 3 >= 62:
                    labels[ni] = -2
                    queue.append(ni)
        cx = sum(i % w for i in component) / len(component)
        cy = sum(i // w for i in component) / len(component)
        containing = [i for i, name in enumerate(names) if guide_masks[name][round(cx), round(cy)]]
        candidates = containing or list(range(len(names)))
        owner = min(candidates, key=lambda i: (cx - PARTS[names[i]][1][0]) ** 2 + (cy - PARTS[names[i]][1][1]) ** 2)
        for index in component:
            labels[index] = owner

    # Assign dark ink to the nearest segmented color island, preserving the
    # outlines without letting them create detached polygon scraps.
    queue = deque()
    for index in visible:
        if labels[index] == -1:
            continue
        x, y = index % w, index // w
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                ni = ny * w + nx
                if labels[ni] == -1 and pixels[nx, ny][3]:
                    labels[ni] = labels[index]
                    queue.append(ni)
    while queue:
        index = queue.popleft()
        x, y = index % w, index // w
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                ni = ny * w + nx
                if labels[ni] == -1 and pixels[nx, ny][3]:
                    labels[ni] = labels[index]
                    queue.append(ni)
    for index in visible:
        if labels[index] < 0:
            x, y = index % w, index // w
            labels[index] = min(range(len(names)), key=lambda i: (x - PARTS[names[i]][1][0]) ** 2 + (y - PARTS[names[i]][1][1]) ** 2)

    masks: dict[str, Image.Image] = {}
    for i, name in enumerate(names):
        mask = Image.new("L", src.size, 0)
        values = bytearray(w * h)
        for index in visible:
            if labels[index] == i:
                values[index] = 255
        mask.frombytes(bytes(values))
        masks[name] = mask

    bounds = {}
    for name, mask in masks.items():
        piece = src.copy()
        piece.putalpha(ImageChops.multiply(alpha, mask))
        box = piece.getchannel("A").getbbox()
        if not box:
            continue
        bounds[name] = list(box)
        piece.crop(box).save(RIG / "parts" / f"{name}.png")

    rebuilt = Image.new("RGBA", src.size, (0, 0, 0, 0))
    for name, _ in PARTS.items():
        piece = src.copy()
        piece.putalpha(ImageChops.multiply(alpha, masks[name]))
        rebuilt.alpha_composite(piece)
    rebuilt.save(RIG / "debug/reassembled.png")

    overlay = src.copy()
    draw = ImageDraw.Draw(overlay)
    for name, (poly, pivot) in PARTS.items():
        draw.line(poly + [poly[0]], fill=(65, 255, 105, 240), width=2)
        x, y = pivot
        draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 40, 40, 255))
        draw.text((x + 3, y), name, fill="white", stroke_width=1, stroke_fill="black")
    overlay.resize((w * 2, h * 2), Image.Resampling.NEAREST).save(RIG / "debug/masks-2x.png")

    cols, cell_w, cell_h = 4, 256, 190
    rows = (len(bounds) + cols - 1) // cols
    board = Image.new("RGBA", (cols * cell_w, rows * cell_h), (55, 59, 66, 255))
    d = ImageDraw.Draw(board)
    for i, name in enumerate(bounds):
        x, y = (i % cols) * cell_w, (i // cols) * cell_h
        d.text((x + 8, y + 5), name, fill="white", font=ImageFont.load_default())
        part = Image.open(RIG / "parts" / f"{name}.png").convert("RGBA")
        part.thumbnail((232, 150), Image.Resampling.NEAREST)
        board.alpha_composite(part, (x + (cell_w - part.width) // 2, y + 27))
    board.save(RIG / "debug/parts-2x.png")

    metadata = {name: {"polygon": poly, "pivot": pivot, "bounds": bounds.get(name)} for name, (poly, pivot) in PARTS.items()}
    (RIG / "masks.json").write_text(json.dumps({"source": "assets/robots/sirtlan.webp", "size": [w, h], "parts": metadata}, indent=2), encoding="utf-8")
    count = sum(1 for value in alpha.get_flattened_data() if value)
    diff = sum(1 for a, b in zip(alpha.get_flattened_data(), rebuilt.getchannel("A").get_flattened_data()) if a != b)
    print(f"sirtlan: source {w}x{h}; alpha reassembly {diff}/{count} ({100*diff/max(1,count):.3f}%); {len(bounds)} parts")


if __name__ == "__main__":
    main()
