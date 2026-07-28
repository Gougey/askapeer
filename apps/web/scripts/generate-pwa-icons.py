#!/usr/bin/env python3
"""
Generates the PWA icon set from the brand mark.

The *mark* (the two overlapping speech bubbles) is the source, not the wordmark: at 192px
a wordmark is an illegible smear, and the mark is already what `apple-icon.png` uses, so
the home-screen icon stays continuous with the favicon.

Two purposes, which Android treats very differently:

  - `any`      — drawn as-is. Navy mark on the light brand tint, with room to breathe.
  - `maskable` — the launcher crops it to whatever shape the device uses (circle, squircle,
                 rounded square). Only the inner 80%-diameter circle is guaranteed to
                 survive, so the mark is drawn smaller inside a full-bleed navy field. Get
                 this wrong and Android pillarboxes the icon inside a white square.

iOS does not read these — it uses the `apple-icon.png` that Next serves from src/app.

The output is committed, so this only needs re-running when the brand assets change:

    pip install Pillow && python3 apps/web/scripts/generate-pwa-icons.py
"""

from pathlib import Path

from PIL import Image

WEB_ROOT = Path(__file__).resolve().parent.parent
BRAND = WEB_ROOT / "public" / "brand"
OUT = WEB_ROOT / "public" / "icons"

# From packages/design-tokens (--color-navy, --color-navy-tint-2). Duplicated here rather
# than imported because this is a one-off asset build, not app code — but if the brand
# navy ever changes, it changes there first and this follows.
NAVY = (0, 31, 82, 255)
TINT = (242, 245, 249, 255)

# Fraction of the icon's width the mark spans. `any` can be generous; `maskable` must stay
# inside the safe circle, so it is deliberately much smaller.
ANY_SCALE = 0.74
MASKABLE_SCALE = 0.58


def render(source: Path, size: int, bg: tuple[int, int, int, int], scale: float) -> Image.Image:
    """Centre `source` on a `size` square of `bg`, occupying `scale` of the width."""
    mark = Image.open(source).convert("RGBA")
    target_w = round(size * scale)
    target_h = round(mark.height * (target_w / mark.width))
    mark = mark.resize((target_w, target_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (size, size), bg)
    canvas.alpha_composite(mark, ((size - target_w) // 2, (size - target_h) // 2))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    light_mark = BRAND / "askapeer-mark.png"   # navy artwork, for light grounds
    dark_mark = BRAND / "askapeer-mark-dark.png"  # light artwork, for dark grounds

    jobs = [
        ("icon-192.png", light_mark, 192, TINT, ANY_SCALE),
        ("icon-512.png", light_mark, 512, TINT, ANY_SCALE),
        # Full-bleed navy: the launcher's mask crops the edges, so the field must reach them.
        ("icon-maskable-512.png", dark_mark, 512, NAVY, MASKABLE_SCALE),
    ]

    for name, source, size, bg, scale in jobs:
        render(source, size, bg, scale).save(OUT / name, "PNG", optimize=True)
        print(f"  wrote {name}  ({size}x{size})")

    print(f"✓ PWA icons written to {OUT.relative_to(WEB_ROOT.parent.parent)}")


if __name__ == "__main__":
    main()
