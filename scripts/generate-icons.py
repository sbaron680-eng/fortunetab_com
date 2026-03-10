#!/usr/bin/env python3
"""
FortuneTab 파비콘 및 아이콘 생성 스크립트
: Pillow 를 사용해 PNG + ICO 파일을 생성합니다.
"""

import os
import math
from PIL import Image, ImageDraw

# ── 브랜드 컬러 ─────────────────────────────────────────
INDIGO  = (30, 27, 75, 255)       # #1e1b4b
GOLD    = (240, 192, 64, 255)     # #f0c040
GOLD_75 = (240, 192, 64, 191)
GOLD_60 = (240, 192, 64, 153)
GOLD_50 = (240, 192, 64, 128)
TRANS   = (0, 0, 0, 0)

# ── 출력 경로 ────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC    = os.path.join(BASE_DIR, "public")
APP_DIR   = os.path.join(BASE_DIR, "src", "app")

os.makedirs(PUBLIC, exist_ok=True)


def draw_logo(size: int) -> Image.Image:
    """
    FortuneTab 로고 마크를 그립니다.
    - 인디고 라운드 사각형 배경
    - 골드 초승달 (두 원의 겹침 기법)
    - 별 3~4개
    """
    img = Image.new("RGBA", (size, size), TRANS)
    draw = ImageDraw.Draw(img)

    s = size / 100.0  # 스케일 팩터

    # 1. 인디고 라운드 사각형 배경
    corner_r = int(22 * s)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=corner_r, fill=INDIGO)

    # 2. 골드 초승달 — 큰 원
    cx, cy, cr = 46 * s, 50 * s, 27 * s
    draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=GOLD)

    # 3. 초승달 마스크 — 인디고 원으로 펀치아웃
    mx, my, mr = 60 * s, 43 * s, 21 * s
    draw.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=INDIGO)

    # 4. 별들 (크기순)
    stars = [
        (74, 24, 3.5, GOLD),
        (65, 18, 1.5, GOLD_60),
        (82, 42, 2.0, GOLD_75),
        (77, 61, 1.5, GOLD_50),
    ]
    for (sx, sy, sr, color) in stars:
        sx, sy, sr = sx * s, sy * s, sr * s
        draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=color)

    return img


def save_png(img: Image.Image, path: str):
    img.save(path, "PNG", optimize=True)
    print(f"  OK {os.path.relpath(path, BASE_DIR)}")


def main():
    print("\nFortuneTab icon generating...\n")

    # ── PNG 생성 ─────────────────────────────────────────

    # 512x512 — 고해상도 (PWA 등)
    img_512 = draw_logo(512)
    save_png(img_512, os.path.join(PUBLIC, "icon-512.png"))

    # 192x192 — Android PWA
    img_192 = draw_logo(192)
    save_png(img_192, os.path.join(PUBLIC, "icon-192.png"))

    # 180x180 — Apple Touch Icon
    img_180 = draw_logo(180)
    save_png(img_180, os.path.join(PUBLIC, "apple-touch-icon.png"))

    # 48x48
    img_48 = draw_logo(48)
    save_png(img_48, os.path.join(PUBLIC, "icon-48.png"))

    # 32x32
    img_32 = draw_logo(32)
    save_png(img_32, os.path.join(PUBLIC, "icon-32.png"))

    # 16x16
    img_16 = draw_logo(16)
    save_png(img_16, os.path.join(PUBLIC, "icon-16.png"))

    # ── favicon.ico (16 + 32 + 48 멀티사이즈) ───────────
    ico_path = os.path.join(PUBLIC, "favicon.ico")
    img_32.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[img_16, img_48],
    )
    print(f"  OK public/favicon.ico  (16x16 + 32x32 + 48x48)")

    # ── /app 디렉토리에도 복사 (Next.js App Router 자동 감지) ──
    # icon.png → <link rel="icon"> 메타데이터 자동 생성
    app_icon_path = os.path.join(APP_DIR, "icon.png")
    img_32.save(app_icon_path, "PNG", optimize=True)
    print(f"  OK src/app/icon.png  (Next.js App Router auto-detected)")

    # apple-icon.png → <link rel="apple-touch-icon"> 자동 생성
    app_apple_path = os.path.join(APP_DIR, "apple-icon.png")
    img_180.save(app_apple_path, "PNG", optimize=True)
    print(f"  OK src/app/apple-icon.png")

    print("\nDone! All icons generated.\n")


if __name__ == "__main__":
    main()
