#!/usr/bin/env python3
"""
스토어 스크린샷용 데모 상태를 시뮬레이터에 심는다. (개발 전용)

시뮬레이터에서 스크린샷을 찍으려면 프레임·스티커가 등록돼 있고 프로필도 채워진
상태여야 하는데, 탭을 주입할 수 없는 환경에서는 앱 안에서 그 상태를 만들 수 없다.
그래서 앱이 읽는 곳(문서 디렉터리 + AsyncStorage)에 직접 넣어 준다.

  - dev-demo/photo.jpg          꾸밀 사진
  - user-library/*.png          등록 프레임·스티커 (앱이 쓰는 경로 그대로)
  - AsyncStorage manifest.json  프로필 / 즐겨찾기 / 라이브러리 레코드

데모 이미지는 여기서 그려서 만든다. 앱 번들이나 레포에는 들어가지 않는다.

사용법
  python3 scripts/seed-demo-simulator.py                    # 부팅된 시뮬레이터
  python3 scripts/seed-demo-simulator.py --device <UDID>
  python3 scripts/seed-demo-simulator.py --bundle com.hyeoz.wepicam

필요 패키지:  python3 -m pip install pillow
"""

from __future__ import annotations

import argparse
import json
import math
import random
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    sys.exit("Pillow 가 필요합니다:  python3 -m pip install pillow")

BUNDLE_ID = "com.hyeoz.wepicam"
LIBRARY_KEY = "@wpc/user-library/v1"
PROFILE_KEY = "@wpc/profile/v1"
FAVORITES_KEY = "@wpc/favorites/v3"

FRAME_ID = "frame-demo-1"
STICKER_IDS = ["sticker-demo-1", "sticker-demo-2", "sticker-demo-3"]

PHOTO_SIZE = (3024, 4032)  # DemoLauncher 의 DEMO_PHOTO 와 같아야 한다


# ── 데모 이미지 생성 ────────────────────────────────────────────────────

def make_photo(path: Path) -> None:
    """부드러운 노을빛 배경에 보케를 얹은 세로 사진."""
    width, height = PHOTO_SIZE
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)

    top = (255, 214, 224)
    mid = (255, 178, 190)
    bottom = (126, 92, 158)
    for y in range(height):
        t = y / height
        if t < 0.55:
            k = t / 0.55
            color = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
        else:
            k = (t - 0.55) / 0.45
            color = tuple(int(mid[i] + (bottom[i] - mid[i]) * k) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)

    # 보케
    rng = random.Random(20260518)
    bokeh = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bokeh)
    for _ in range(90):
        r = rng.randint(40, 190)
        x = rng.randint(-r, width + r)
        y = rng.randint(int(height * 0.05), int(height * 0.75))
        alpha = rng.randint(28, 92)
        bdraw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, alpha))
    bokeh = bokeh.filter(ImageFilter.GaussianBlur(26))
    image = Image.alpha_composite(image.convert("RGBA"), bokeh).convert("RGB")

    # 아래쪽 실루엣 — 사진처럼 보이도록 초점 대상 하나
    silhouette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(silhouette)
    cx, base = width // 2, int(height * 0.92)
    sdraw.ellipse([cx - 300, base - 1180, cx + 300, base - 560], fill=(74, 44, 92, 200))
    sdraw.polygon(
        [(cx - 470, base), (cx + 470, base), (cx + 300, base - 760), (cx - 300, base - 760)],
        fill=(74, 44, 92, 200),
    )
    silhouette = silhouette.filter(ImageFilter.GaussianBlur(3))
    image = Image.alpha_composite(image.convert("RGBA"), silhouette).convert("RGB")

    image.save(path, "JPEG", quality=92)


def make_frame(path: Path) -> None:
    """투명 배경 레이스 테두리 프레임 (사진과 같은 3:4)."""
    width, height = 1200, 1600
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    pink = (255, 138, 178, 255)
    cream = (255, 246, 249, 255)

    inset = 46
    draw.rounded_rectangle([inset, inset, width - inset, height - inset],
                           radius=60, outline=cream, width=26)
    draw.rounded_rectangle([inset + 20, inset + 20, width - inset - 20, height - inset - 20],
                           radius=44, outline=pink, width=8)

    # 테두리를 따라 도는 작은 원 — 레이스 느낌
    step = 46
    for x in range(inset + 34, width - inset - 20, step):
        for y in (inset + 6, height - inset - 6):
            draw.ellipse([x - 13, y - 13, x + 13, y + 13], fill=cream)
    for y in range(inset + 34, height - inset - 20, step):
        for x in (inset + 6, width - inset - 6):
            draw.ellipse([x - 13, y - 13, x + 13, y + 13], fill=cream)

    # 네 모서리 하트
    for corner in [(inset + 70, inset + 70), (width - inset - 70, inset + 70),
                   (inset + 70, height - inset - 70), (width - inset - 70, height - inset - 70)]:
        _heart(draw, corner, 34, pink)

    image.save(path, "PNG")


def _heart(draw: ImageDraw.ImageDraw, center: tuple[int, int], size: int, color) -> None:
    cx, cy = center
    points = []
    for i in range(220):
        t = (i / 220) * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        points.append((cx + x * size / 16, cy - y * size / 16))
    draw.polygon(points, fill=color)


def make_stickers(paths: list[Path]) -> None:
    """투명 배경 스티커 3종 — 하트 / 별 / 리본."""
    size = 512

    # 1) 하트
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    _heart(d, (size // 2, size // 2 + 20), 200, (255, 96, 152, 255))
    _heart(d, (size // 2 - 46, size // 2 - 34), 62, (255, 214, 230, 235))
    img.save(paths[0], "PNG")

    # 2) 별
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = []
    for i in range(10):
        angle = -math.pi / 2 + i * math.pi / 5
        r = 215 if i % 2 == 0 else 90
        pts.append((size / 2 + r * math.cos(angle), size / 2 + r * math.sin(angle)))
    d.polygon(pts, fill=(255, 205, 74, 255))
    d.ellipse([size / 2 - 46, size / 2 - 62, size / 2 + 10, size / 2 - 6], fill=(255, 240, 190, 220))
    img.save(paths[1], "PNG")

    # 3) 리본
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    purple = (176, 132, 255, 255)
    d.polygon([(60, 150), (230, 250), (60, 360)], fill=purple)
    d.polygon([(452, 150), (282, 250), (452, 360)], fill=purple)
    d.ellipse([214, 208, 298, 292], fill=(146, 100, 232, 255))
    d.polygon([(238, 292), (200, 452), (262, 420)], fill=purple)
    d.polygon([(274, 292), (312, 452), (250, 420)], fill=purple)
    img.save(paths[2], "PNG")


# ── 시뮬레이터 ─────────────────────────────────────────────────────────

def sh(args: list[str]) -> str:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"명령 실패: {' '.join(args)}\n{result.stderr.strip()}")
    return result.stdout.strip()


def app_container(device: str, bundle: str) -> Path:
    return Path(sh(["xcrun", "simctl", "get_app_container", device, bundle, "data"]))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--device", default="booted", help="시뮬레이터 UDID (기본: booted)")
    parser.add_argument("--bundle", default=BUNDLE_ID)
    args = parser.parse_args()

    container = app_container(args.device, args.bundle)
    print(f"앱 컨테이너: {container}")

    demo_dir = container / "Documents" / "dev-demo"
    library_dir = container / "Documents" / "user-library"
    storage_dir = container / "Library" / "Application Support" / args.bundle / "RCTAsyncLocalStorage_V1"
    for d in (demo_dir, library_dir, storage_dir):
        d.mkdir(parents=True, exist_ok=True)

    print("데모 이미지 생성…")
    make_photo(demo_dir / "photo.jpg")
    make_frame(library_dir / f"{FRAME_ID}.png")
    make_stickers([library_dir / f"{sid}.png" for sid in STICKER_IDS])

    # 앱이 읽는 형식 그대로 — 경로는 문서 디렉터리 기준 상대 경로다.
    library = {
        "frame": [
            {"id": FRAME_ID, "label": "레이스 리본", "emoji": "🖼️",
             "path": f"user-library/{FRAME_ID}.png"},
        ],
        "sticker": [
            {"id": STICKER_IDS[0], "label": "하트", "emoji": "✨",
             "path": f"user-library/{STICKER_IDS[0]}.png"},
            {"id": STICKER_IDS[1], "label": "반짝 별", "emoji": "✨",
             "path": f"user-library/{STICKER_IDS[1]}.png"},
            {"id": STICKER_IDS[2], "label": "리본", "emoji": "✨",
             "path": f"user-library/{STICKER_IDS[2]}.png"},
        ],
        "text": [],
    }
    manifest = {
        LIBRARY_KEY: json.dumps(library, ensure_ascii=False),
        PROFILE_KEY: json.dumps({"nickname": "지민", "emoji": "🍑"}, ensure_ascii=False),
        FAVORITES_KEY: json.dumps(
            {"frame": [FRAME_ID], "sticker": [STICKER_IDS[0]], "text": ["t4"]},
            ensure_ascii=False,
        ),
    }
    (storage_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False))

    print(f"  사진      {demo_dir / 'photo.jpg'}")
    print(f"  프레임 1  스티커 {len(STICKER_IDS)}")
    print(f"  AsyncStorage manifest.json ({len(manifest)} 키)")
    print("\n앱을 다시 실행한 뒤 딥링크로 화면을 지정하세요:")
    print('  xcrun simctl openurl booted "wepicam://demo?screen=home"')


if __name__ == "__main__":
    main()
