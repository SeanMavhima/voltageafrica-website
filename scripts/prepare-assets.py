"""
Prepare web-optimised copies of VoltageAfrica's original media.

Originals in /Images and /VoltageAfrica_Prototype and Evidence and media are
never modified. Outputs are written to /public/images.

Usage:  python scripts/prepare-assets.py
Needs:  Pillow. HEIC sources additionally need `pillow-heif`
        (pip install pillow-heif) — they are skipped if it is missing.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "Images"
EVD = ROOT / "VoltageAfrica_Prototype and Evidence and media"
OUT = ROOT / "public" / "images"

# (source, destination relative to OUT, max long edge, optional crop box as fractions l,t,r,b)
JOBS: list[tuple[Path, str, int, tuple[float, float, float, float] | None]] = [
    # Founder
    (IMG / "pitching.jpg", "founder/sean-pitching.jpg", 1600, None),
    (IMG / "pitching (2).jpg", "founder/sean-pitching-close.jpg", 1600, None),
    (IMG / "IMAGE-191.jpg", "founder/sean-field.jpg", 2200, None),
    # Milestones & recognition
    (IMG / "BRICS+ Award.JPG", "milestones/brics-summit-pretoria.jpg", 2000, None),
    (IMG / "BRICS + Second Prize Winner.jpeg", "milestones/brics-trophy.jpg", 1080, None),
    (IMG / "Russiacert.jpg", "milestones/hackatom-certificate.jpg", 1600, None),
    (IMG / "pitching in Russia.heic", "milestones/hackatom-stage.jpg", 2000, None),
    (IMG / "Angle_Award.jpg", "milestones/green-award-nairobi.jpg", 2200, None),
    (IMG / "IMAGE-189.jpg", "milestones/green-generation-planting.jpg", 2200, None),
    (IMG / "IMAGE-188.jpg", "milestones/green-generation-team.jpg", 2400, None),
    (IMG / "hackathon.jpg", "milestones/icp-hackathon-rwanda.jpg", 2000, None),
    # Prototype
    (EVD / "Prototype Images" / "20250425_095945.jpg", "prototype/tracker-array.jpg", 2000, None),
    (EVD / "Prototype Images" / "20250425_090236.jpg", "prototype/tracker-sensor.jpg", 2000, None),
    (EVD / "Prototype Images" / "20250425_090524.jpg", "prototype/modules-side.jpg", 2000, None),
    (EVD / "Prototype Images" / "20250425_090725.jpg", "prototype/module-label.jpg", 1600, (0.05, 0.25, 0.95, 1.0)),
    # Platform exploration
    (EVD / "Blockchain Energy Trading Design Mocks" / "IMG1.png", "platform/trading-mock-hero.jpg", 1400, None),
    (EVD / "Blockchain Energy Trading Design Mocks" / "Screenshot 2025-07-16 174951.png", "platform/trading-mock-network.jpg", 1600, None),
    # Community education outreach (Kigali)
    (EVD / "Education Outreach Program" / "IMG6.jpeg", "outreach/kigali-lesson.jpg", 2000, None),
    (EVD / "Education Outreach Program" / "IMG18.jpeg", "outreach/kigali-school-group.jpg", 2000, None),
    (EVD / "Education Outreach Program" / "IMG3.jpeg", "outreach/kigali-classroom.jpg", 2000, None),
    (EVD / "Education Outreach Program" / "IMG4.jpeg", "outreach/kigali-lesson-group.jpg", 2400, None),
    (EVD / "Education Outreach Program" / "IMG19.jpeg", "outreach/kigali-courtyard.jpg", 2400, None),
    # Fellowship
    (EVD / "Certifications_Jim Leech Mastercard Foundation Fellowship" / "I have been selected for Launch.png", "fellowship/jlmcf-launch.jpg", 1600, None),
    # Press
    (EVD / "Media Publications-Herald Zimbawe_.jpg", "press/herald-2025-pressreader.jpg", 1920, None),
]


def open_any(path: Path) -> Image.Image | None:
    if path.suffix.lower() == ".heic":
        try:
            import pillow_heif  # type: ignore
        except ImportError:
            print(f"  skip (pillow-heif not installed): {path.name}")
            return None
        h = pillow_heif.open_heif(str(path))
        return Image.frombytes(h.mode, h.size, bytes(h.data), "raw", h.mode, h.stride)
    return ImageOps.exif_transpose(Image.open(path))


def main() -> int:
    for src, dest, max_edge, crop in JOBS:
        if not src.exists():
            print(f"  missing: {src}")
            continue
        out = OUT / dest
        out.parent.mkdir(parents=True, exist_ok=True)
        im = open_any(src)
        if im is None:
            continue
        im = im.convert("RGB")
        if crop:
            w, h = im.size
            im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
        im.thumbnail((max_edge, max_edge), Image.LANCZOS)
        im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
        print(f"  {dest}  {im.size[0]}x{im.size[1]}  {os.path.getsize(out)//1024}KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
