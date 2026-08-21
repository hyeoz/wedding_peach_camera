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
    from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("Pillow 가 필요합니다:  python3 -m pip install pillow")

import io

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
    # 원본이 이미 규격 크기일 때 캡션을 얹을 y 좌표. None 이면 overlay 를 쓰지 않는다.
    overlay_caption_y: int | None = None


SPECS = {
    "iphone": Spec("iphone", 1320, 2868, "APP_IPHONE_67",
                   caption_size=76, sub_size=44, top_pad=150, gap=64, side_pad=96,
                   radius=56, palette="purple"),
    # iPad 캡처는 이미 2064x2752 (규격과 동일) 라 inset 으로 넣으면 76% 로 줄어
    # 앱 글씨가 읽히지 않는다. 대신 overlay 로 화면을 1:1 로 두고, 웨피캠 iPad
    # 레이아웃이 5장 모두 비워 두는 y 1900~2420 띠에 캡션을 얹는다.
    "ipad": Spec("ipad", 2064, 2752, "APP_IPAD_PRO_3GEN_129",
                 caption_size=104, sub_size=58, top_pad=200, gap=72, side_pad=48,
                 radius=40, palette="peach", overlay_caption_y=1930),
}


# 한글이 나오는 폰트. (경로, regular index, bold index) — .ttc 는 얼굴이 여럿이라
# 인덱스를 지정해야 한다. macOS 는 Apple SD Gothic Neo, 리눅스/CI 는 Noto Sans CJK KR.
# 어느 장비에서 합성해도 같은 결과가 나오도록 두 계열을 모두 둔다.
FONT_CANDIDATES = [
    ("/System/Library/Fonts/AppleSDGothicNeo.ttc", 0, 8),
    ("/System/Library/Fonts/Supplemental/AppleGothic.ttf", 0, 0),
    ("/Library/Fonts/AppleGothic.ttf", 0, 0),
    ("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", 1, 1),
    ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 1, 1),
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """한글이 나오는 시스템 폰트를 찾는다. 없으면 기본 폰트로 떨어진다."""
    # Bold 를 요청했으면 Bold 파일을 먼저, Regular 면 Regular 파일을 먼저 본다.
    ordered = sorted(
        FONT_CANDIDATES,
        key=lambda c: ("Bold" in c[0]) != bold,
    )
    for path, reg_idx, bold_idx in ordered:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size, index=(bold_idx if bold else reg_idx))
            except OSError:
                continue
    print("  ! 한글 폰트를 찾지 못해 기본 폰트로 떨어집니다 — 캡션이 깨질 수 있습니다.")
    return ImageFont.load_default()


SRGB = ImageCms.createProfile("sRGB")


def open_srgb(path: Path) -> Image.Image:
    """캡처를 sRGB RGB 로 연다.

    아이폰 실기기 캡처에는 Display P3 프로파일이 박혀 있다. 프로파일을 무시한 채
    그대로 쓰면 같은 숫자를 sRGB 로 읽어 색이 과포화된다(특히 분홍·주황 스티커).
    App Store 는 sRGB 를 기대하므로 여기서 한 번 변환해 둔다.
    """
    img = Image.open(path)
    icc = img.info.get("icc_profile")
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            desc = ImageCms.getProfileDescription(src).strip()
            if "sRGB" not in desc:
                img = ImageCms.profileToProfile(
                    img.convert("RGB"), src, SRGB, outputMode="RGB", renderingIntent=0
                )
                print(f"    · 색공간 변환: {desc} → sRGB")
        except (ImageCms.PyCMSError, OSError) as e:
            print(f"    ! ICC 변환 실패({e}) — 원본 그대로 사용합니다.")
    return img.convert("RGB")


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


def draw_caption_block(draw, spec: Spec, pal: dict, caption: str, sub: str, y: int) -> int:
    """캡션 + 서브를 가운데 정렬로 그리고, 블록이 끝난 y 를 돌려준다."""
    title_font = load_font(spec.caption_size, bold=True)
    sub_font = load_font(spec.sub_size)
    text_width = spec.width - spec.side_pad * 2

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
    return y


def region_is_flat(img: Image.Image, top: int, bottom: int, tol: int = 14) -> bool:
    """그 띠가 앱 배경만 있는 빈 영역인지 — 캡션을 얹어도 UI 를 가리지 않는지 본다."""
    band = img.crop((0, max(0, top), img.width, min(img.height, bottom)))
    return all(mx - mn <= tol for mn, mx in band.getextrema())


def compose_overlay(src: Path, dest: Path, spec: Spec, caption: str, sub: str) -> None:
    """원본이 이미 규격 크기일 때: 축소하지 않고 캡션만 빈 띠에 얹는다.

    inset 으로 넣으면 화면이 76% 로 줄어 앱 글씨가 읽히지 않는다. overlay 는 UI 를
    1:1 로 유지하므로 태블릿 스크린샷에서 훨씬 잘 읽힌다.
    """
    pal = PALETTES[spec.palette]
    canvas = open_srgb(src)
    draw = ImageDraw.Draw(canvas)

    y0 = spec.overlay_caption_y
    end = draw_caption_block(draw, spec, pal, caption, sub, y0)
    if not region_is_flat(Image.open(src).convert("RGB"), y0 - 24, end + 24):
        print(f"    ! y {y0}~{end} 가 빈 띠가 아닙니다 — 캡션이 UI 를 가릴 수 있습니다.")

    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)
    out = Image.open(dest)
    assert out.size == (spec.width, spec.height), f"규격 불일치: {out.size}"
    print(f"  ✓ {dest.relative_to(ROOT)}  {out.size[0]}x{out.size[1]}  (overlay, 화면 1:1)")


def compose(src: Path, dest: Path, spec: Spec, caption: str, sub: str, shadow: bool) -> None:
    pal = PALETTES[spec.palette]
    canvas = gradient_background(spec).convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    y = draw_caption_block(draw, spec, pal, caption, sub, spec.top_pad)

    # 기기 화면: 남은 영역에 비율 유지로 최대한 크게
    band_top = y + spec.gap
    bottom_pad = spec.side_pad // 2 if spec.side_pad > 96 else 48
    avail_w = spec.width - spec.side_pad * 2
    avail_h = spec.height - band_top - bottom_pad
    shot = open_srgb(src)
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
    ap.add_argument("--layout", default="auto", choices=["auto", "inset", "overlay"],
                    help="auto: 원본이 규격 크기면 overlay, 아니면 inset")
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
            # 원본이 이미 규격 크기면 축소 없이 캡션만 얹는다(overlay).
            use_overlay = (
                args.layout == "overlay"
                or (args.layout == "auto"
                    and spec.overlay_caption_y is not None
                    and Image.open(src).size == (spec.width, spec.height))
            )
            if args.dry_run:
                how = "overlay" if use_overlay else "inset"
                print(f"  [dry-run] {src.relative_to(ROOT)} → {dest.relative_to(ROOT)}  ({how})")
                continue
            if use_overlay:
                compose_overlay(src, dest, spec, c["caption"], c.get("sub", ""))
            else:
                compose(src, dest, spec, c["caption"], c.get("sub", ""), not args.no_shadow)

    if missing:
        print("\n아직 없는 원본:")
        for m in missing:
            print("  -", m)
        print("\n실기기에서 캡처해 위 경로에 넣고 다시 실행하세요.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
