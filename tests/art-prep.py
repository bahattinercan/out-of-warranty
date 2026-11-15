"""Robot aktarımında geniş ve uzun siluetlerin tamamı korunmalı."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


class RobotFitTest(unittest.TestCase):
    def test_roster_has_no_clipped_edges(self):
        sprites = sorted((ROOT / "assets/robots").glob("*.webp"))
        self.assertEqual(len(sprites), 34)
        for sprite in sprites:
            with self.subTest(robot=sprite.stem), Image.open(sprite) as image:
                bounds = image.getchannel("A").getbbox()
                self.assertIsNotNone(bounds)
                self.assertGreaterEqual(bounds[0], 8)
                self.assertGreaterEqual(bounds[1], 8)
                self.assertLessEqual(bounds[2], image.width - 8)
                self.assertLessEqual(bounds[3], image.height - 8)
                source = ROOT / "art/build/robots" / sprite.stem / ("codex-" + sprite.stem + ".png")
                with Image.open(source) as original:
                    left, top, right, bottom = original.getchannel("A").point(lambda value: 255 if value >= 128 else 0).getbbox()
                    ratio = (right - left) / (bottom - top)
                # Çok düşük alfa gölgeleri küçültmede kaybolur; görünür silueti karşılaştır.
                left, top, right, bottom = image.getchannel("A").point(lambda value: 255 if value >= 128 else 0).getbbox()
                actual_ratio = (right - left) / (bottom - top)
                self.assertAlmostEqual(actual_ratio, ratio, delta=0.02)

    def test_whole_silhouette_survives(self):
        for size in [(300, 100), (100, 300)]:
            with self.subTest(size=size), tempfile.TemporaryDirectory() as tmp:
                source = Path(tmp) / "source.png"
                output = Path(tmp) / "robot.webp"
                image = Image.new("RGBA", size)
                ImageDraw.Draw(image).rectangle((0, 0, size[0] - 1, size[1] - 1), fill="red")
                image.save(source)
                result = subprocess.run([
                    sys.executable, str(ROOT / "tools/art-prep.py"),
                    "--in", str(source), "--out", str(output),
                    "--size", "120x120", "--alpha", "source", "--fit", "contain",
                ], capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                with Image.open(output) as actual:
                    self.assertEqual(actual.size, (120, 120))
                    bounds = actual.getchannel("A").getbbox()
                    self.assertIsNotNone(bounds)
                    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
                    self.assertAlmostEqual(width / height, size[0] / size[1], delta=0.1)
                    self.assertGreater(bounds[0], 0)
                    self.assertGreater(bounds[1], 0)
                    self.assertLess(bounds[2], 120)
                    self.assertLess(bounds[3], 120)


if __name__ == "__main__":
    unittest.main()
