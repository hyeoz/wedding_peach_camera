#!/usr/bin/env python3
"""
웨피캠 App Store 스크린샷 합성.

실기기/시뮬레이터에서 찍은 원본 캡처 위에 캡션을 얹고, App Store 가 요구하는
정확한 픽셀 규격으로 맞춰 내보낸다.

  원본 캡처 → 캡션 띠 + 기기 화면 축소 배치 → 규격 캔버스로 출력

지원 규격 (웨피캠은 supportsTablet: true 라 둘 다 필수)
  iphone  1320 x 2868   App Store Connect 슬롯: APP_IPHONE_67
  ipad    2064 x 2752   App Store Connect 슬롯: APP_IPAD_PRO_3GEN_129

사용법
  # 원본을 넣어두고
  #   store/screenshots/raw/iphone/01-home.png ...
  #   store/screenshots/raw/ipad/01-home.png ...
  python3 scripts/compose-store-screenshots.py --device iphone
  python3 scripts/compose-store-screenshots.py --device ipad
  python3 scripts/compose-store-screenshots.py            # 둘 다

  python3 scripts/compose-store-screenshots.py --list      # 캡션 목록만 출력
  python3 scripts/compose-store-screenshots.py --dry-run   # 처리 계획만 출력

옵션
  --device <iphone|ipad|both>  대상 규격 (기본: both)
  --in <dir>                   원본 폴더 (기본: store/screenshots/raw)
  --out <dir>                  출력 폴더 (기본: store/screenshots/composed)
  --captions <file>            캡션 JSON 경로 (기본: store/screenshot-captions.json)
  --no-shadow                  기기 화면 그림자 생략
  --list, --dry-run, -h

필요 패키지
  python3 -m pip install pillow

원본 크기가 규격과 달라도 비율을 유지한 채 맞춰 넣으므로, 실기기 캡처를
그대로 넣어도 된다(6.9인치 기기면 1320x2868 이 그대로 나온다).
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("Pillow 가 필요합니다:  python3 -m pip install pillow")

ROOT = Path(__file__).resolve().parent.parent

# ── 웨피캠 팔레트 (src/theme/palettes.ts) ──────────────────────────────
# 캔버스 색은 그 기기 캡처가 쓴 테마와 맞춰야 화면과 배경이 한 장처럼 보인다.
# iPhone 캡처는 purple 테마, iPad 캡처는 peach 테마로 찍혔다.
PALETTES = {
    "purple": dict(bg_top=(239, 227, 255), bg_bottom=(243, 224, 255),
                   text_main=(38, 22, 58), text_sub=(125, 111, 154),
                   shadow=(61, 26, 128, 70)),
    "peach": dict(bg_top=(255, 233, 214), bg_bottom=(255, 231, 220),
                  text_main=(58, 32, 24), text_sub=(154, 115, 101),
                  shadow=(143, 52, 23, 70)),
}


@dataclass(frozen=True)
class Spec:
    key: str
    width: int
    height: int
    asc_slot: str
    caption_size: int
    sub_size: int
    top_pad: int
    gap: int
    side_pad: int
    radius: int
    palette: str


SPECS = {
    "iphone": Spec("iphone", 1320, 2868, "APP_IPHONE_67",
                   caption_size=76, sub_size=44, top_pad=150, gap=64, side_pad=96,
                   radius=56, palette="purple"),
    # iPad 원본은 가로(landscape) 로 찍혔는데 규격 캔버스는 세로다. 좌우 여백을 줄여
    # 화면을 최대한 크게 넣고, 남는 세로 공간은 compose() 가 위아래로 나눠 준다.
    "ipad": Spec("ipad", 2064, 2752, "APP_IPAD_PRO_3GEN_129",
                 caption_size=104, sub_size=58, top_pad=200, gap=72, side_pad=48,
                 radius=40, palette="peach"),
}


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """한글이 나오는 시스템 폰트를 찾는다. 없으면 기본 폰트로 떨어진다."""
    candidates = [
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/Library/Fonts/AppleGothic.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size, index=(8 if bold and path.endswith(".ttc") else 0))
            except OSError:
                continue
    return ImageFont.load_default()


def gradient_background(spec: Spec) -> Image.Image:
    """세로 그라디언트 — 앱의 GradientBackground 와 같은 인상을 준다."""
    pal = PALETTES[spec.palette]
    bg = Image.new("RGB", (1, spec.height))
    px = bg.load()
    for y in range(spec.height):
        t = y / max(1, spec.height - 1)
        px[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(pal["bg_top"], pal["bg_bottom"]))
    return bg.resize((spec.width, spec.height), Image.BILINEAR)


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    """한국어는 공백이 적어 글자 단위로도 접을 수 있게 한다."""
    if not text:
        return []
    lines: list[str] = []
    for para in text.split("\n"):
        words = para.split(" ")
        cur = ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if draw.textlength(trial, font=font) <= max_width or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
    return lines


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def compose(src: Path, dest: Path, spec: Spec, caption: str, sub: str, shadow: bool) -> None:
    pal = PALETTES[spec.palette]
    canvas = gradient_background(spec).convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    title_font = load_font(spec.caption_size, bold=True)
    sub_font = load_font(spec.sub_size)
    text_width = spec.width - spec.side_pad * 2

    y = spec.top_pad
    for line in wrap(draw, caption, title_font, text_width):
        w = draw.textlength(line, font=title_font)
        draw.text(((spec.width - w) / 2, y), line, font=title_font, fill=pal["text_main"])
        y += int(spec.caption_size * 1.28)

    if sub:
        y += 8
        for line in wrap(draw, sub, sub_font, text_width):
            w = draw.textlength(line, font=sub_font)
            draw.text(((spec.width - w) / 2, y), line, font=sub_font, fill=pal["text_sub"])
            y += int(spec.sub_size * 1.35)

    # 기기 화면: 남은 영역에 비율 유지로 최대한 크게
    band_top = y + spec.gap
    bottom_pad = spec.side_pad // 2 if spec.side_pad > 96 else 48
    avail_w = spec.width - spec.side_pad * 2
    avail_h = spec.height - band_top - bottom_pad
    shot = Image.open(src).convert("RGB")
    scale = min(avail_w / shot.width, avail_h / shot.height)
    size = (max(1, round(shot.width * scale)), max(1, round(shot.height * scale)))
    shot = rounded(shot.resize(size, Image.LANCZOS), spec.radius)

    # 가로로 찍힌 원본(iPad)은 세로 규격 캔버스에서 높이가 남는다. 남는 만큼을
    # 위아래로 나눠 화면을 띠 한가운데 두어야 캡션 밑이 뜨거나 아래가 비지 않는다.
    x = (spec.width - size[0]) // 2
    top = band_top + max(0, (avail_h - size[1]) // 2)
    if shadow:
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle(
            [(x, top + 18), (x + size[0], top + size[1] + 18)], radius=spec.radius, fill=pal["shadow"]
        )
        canvas = Image.alpha_composite(canvas, layer.filter(ImageFilter.GaussianBlur(26)))

    canvas.paste(shot, (x, top), shot)

    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(dest, "PNG", optimize=True)

    out = Image.open(dest)
    assert out.size == (spec.width, spec.height), f"규격 불일치: {out.size}"
    print(f"  ✓ {dest.relative_to(ROOT)}  {out.size[0]}x{out.size[1]}")


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--device", default="both", choices=["iphone", "ipad", "both"])
    ap.add_argument("--in", dest="src", default="store/screenshots/raw")
    ap.add_argument("--out", dest="out", default="store/screenshots/composed")
    ap.add_argument("--captions", default="store/screenshot-captions.json")
    ap.add_argument("--no-shadow", action="store_true")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    captions = json.loads((ROOT / args.captions).read_text(encoding="utf-8"))["screens"]

    if args.list:
        print(f"캡션 {len(captions)}장")
        for i, c in enumerate(captions, 1):
            print(f"  {i}. [{c['slug']}] {c['caption']}")
            if c.get("sub"):
                print(f"       {c['sub']}")
        return 0

    targets = ["iphone", "ipad"] if args.device == "both" else [args.device]
    missing: list[str] = []

    for key in targets:
        spec = SPECS[key]
        print(f"\n▶ {key}  {spec.width}x{spec.height}  (ASC 슬롯: {spec.asc_slot})")
        for c in captions:
            src = ROOT / args.src / key / f"{c['slug']}.png"
            dest = ROOT / args.out / key / f"{c['slug']}.png"
            if not src.exists():
                missing.append(str(src.relative_to(ROOT)))
                print(f"  · {c['slug']}: 원본 없음 — 건너뜀")
                continue
            if args.dry_run:
                print(f"  [dry-run] {src.relative_to(ROOT)} → {dest.relative_to(ROOT)}")
                continue
            compose(src, dest, spec, c["caption"], c.get("sub", ""), not args.no_shadow)

    if missing:
        print("\n아직 없는 원본:")
        for m in missing:
            print("  -", m)
        print("\n실기기에서 캡처해 위 경로에 넣고 다시 실행하세요.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
