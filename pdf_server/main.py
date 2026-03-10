"""
FortuneTab 유료 플래너 로컬 PDF 생성 서버
FastAPI + Pillow (PIL)

실행: uvicorn main:app --reload --port 8710
또는: start.bat / start.sh

엔드포인트:
  POST /generate  → PDF 바이너리 스트림 다운로드
  GET  /health    → 서버 상태 확인
"""

from __future__ import annotations

import io
import math
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from PIL import Image, ImageDraw, ImageFont

# ── 로깅 ───────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("fortunetab_pdf")

# ── FastAPI 앱 ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FortuneTab PDF Generator",
    description="유료 사주 플래너 PDF 생성 로컬 서버",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://fortunetab.com",
        "https://fortunetab-landing.pages.dev",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── 요청 스키마 ────────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    orientation: Literal["portrait", "landscape"] = "portrait"
    year: int = Field(2026, ge=2020, le=2040)
    name: str = Field("나의 플래너", max_length=40)
    pages: list[Literal["cover", "year-index", "monthly", "weekly", "daily"]] = Field(
        default=["cover", "year-index", "monthly", "weekly", "daily"]
    )
    # 사주 정보 (유료 전용)
    birth_year:  Optional[int] = Field(None, ge=1900, le=2020)
    birth_month: Optional[int] = Field(None, ge=1, le=12)
    birth_day:   Optional[int] = Field(None, ge=1, le=31)
    birth_hour:  Optional[int] = Field(None, ge=0, le=23)
    gender:      Optional[Literal["male", "female"]] = None


# ── 팔레트 ─────────────────────────────────────────────────────────────────────
C = {
    "indigo_deep":  (30,  27,  75),
    "indigo_mid":   (49,  46, 129),
    "indigo_light": (67,  56, 202),
    "indigo_100":   (224, 231, 255),
    "indigo_200":   (199, 210, 254),
    "gold":         (245, 158,  11),
    "gold_pale":    (251, 191,  36),
    "gold_faint":   (253, 230, 138),
    "white":        (255, 255, 255),
    "white_soft":   (220, 218, 240),
    "text_dark":    (30,  27,  75),
    "text_light":   (148, 163, 184),
    "bg_page":      (250, 249, 252),
    "bg_cell":      (248, 249, 255),
    "rule_light":   (199, 210, 254),
}

# ── 캔버스 크기 (150dpi A4) ────────────────────────────────────────────────────
PORTRAIT_W,  PORTRAIT_H  = 1240, 1754
LANDSCAPE_W, LANDSCAPE_H = 1754, 1240

# ── 월 이름 ────────────────────────────────────────────────────────────────────
KO_MONTHS = ["1월","2월","3월","4월","5월","6월",
             "7월","8월","9월","10월","11월","12월"]
KO_DAYS   = ["월","화","수","목","금","토","일"]


# ── 폰트 로더 (시스템 폰트 또는 기본 폰트 폴백) ───────────────────────────────
def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "malgun.ttf" if not bold else "malgunbd.ttf",        # 맑은 고딕 (Windows)
        "NanumGothic.ttf" if not bold else "NanumGothicBold.ttf",
        "NotoSansCJK-Regular.ttc" if not bold else "NotoSansCJK-Bold.ttc",
        "arial.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


# ── 그라데이션 배경 ────────────────────────────────────────────────────────────
def _gradient_bg(draw: ImageDraw.ImageDraw, W: int, H: int) -> None:
    r1, g1, b1 = C["indigo_deep"]
    r2, g2, b2 = C["indigo_mid"]
    for y in range(H):
        t = y / H
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))


# ── 별 그리기 ──────────────────────────────────────────────────────────────────
def _stars(draw: ImageDraw.ImageDraw, W: int, H: int, seed: int = 42) -> None:
    import random
    rng = random.Random(seed)
    for _ in range(60):
        x = rng.randint(0, W)
        y = rng.randint(0, H)
        r = rng.choice([1, 1, 1, 2])
        alpha = rng.randint(100, 220)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(255, 255, 255, alpha))


# ── 달 그리기 ──────────────────────────────────────────────────────────────────
def _moon(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int,
          bg: tuple[int, int, int]) -> None:
    gold = C["gold"]
    draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=gold)
    offset = int(radius * 0.35)
    dr = int(radius * 1.0)
    draw.ellipse([cx-dr+offset, cy-dr, cx+dr+offset, cy+dr], fill=bg)


# ── 수평 구분선 ────────────────────────────────────────────────────────────────
def _rule(draw: ImageDraw.ImageDraw, y: int, W: int, margin: int = 80) -> None:
    draw.line([(margin, y), (W-margin, y)], fill=(*C["rule_light"], 80), width=1)


# ── 커버 페이지 ────────────────────────────────────────────────────────────────
def draw_cover(W: int, H: int, req: GenerateRequest) -> Image.Image:
    img  = Image.new("RGBA", (W, H), C["indigo_deep"])
    draw = ImageDraw.Draw(img, "RGBA")
    _gradient_bg(draw, W, H)
    _stars(draw, W, H, seed=1)

    if W < H:  # portrait
        cx, cy, r = W // 2, int(H * 0.28), int(min(W, H) * 0.14)
    else:       # landscape
        cx, cy, r = W // 3, H // 2, int(H * 0.30)

    _moon(draw, cx, cy, r, C["indigo_mid"])

    # 연도
    fy = ImageFont.truetype("malgun.ttf", int(H * 0.06)) if True else _load_font(int(H * 0.06), True)
    try:
        fy = _load_font(int(H * 0.06), bold=True)
        fn = _load_font(int(H * 0.035), bold=True)
        fs = _load_font(int(H * 0.022), bold=False)
    except Exception:
        fy = fn = fs = ImageFont.load_default()

    year_txt  = str(req.year)
    name_txt  = req.name
    sub_txt   = "사주·운세 플래너"
    brand_txt = "fortunetab"

    if W < H:  # portrait 중앙 정렬
        cx_text = W // 2
        draw.text((cx_text, int(H * 0.50)), year_txt,  font=fy, fill=C["gold"],   anchor="mm")
        draw.text((cx_text, int(H * 0.60)), name_txt,  font=fn, fill=C["white"],  anchor="mm")
        draw.text((cx_text, int(H * 0.68)), sub_txt,   font=fs, fill=(*C["indigo_200"], 220), anchor="mm")
        _rule(draw, int(H * 0.73), W, margin=W // 4)
        draw.text((cx_text, int(H * 0.80)), brand_txt, font=fs, fill=(*C["gold_faint"], 180), anchor="mm")
    else:       # landscape 오른쪽 정렬
        rx = int(W * 0.62)
        draw.text((rx, int(H * 0.35)), year_txt,  font=fy, fill=C["gold"],   anchor="mm")
        draw.text((rx, int(H * 0.52)), name_txt,  font=fn, fill=C["white"],  anchor="mm")
        draw.text((rx, int(H * 0.64)), sub_txt,   font=fs, fill=(*C["indigo_200"], 220), anchor="mm")
        _rule(draw, int(H * 0.73), W, margin=W // 3)
        draw.text((rx, int(H * 0.82)), brand_txt, font=fs, fill=(*C["gold_faint"], 180), anchor="mm")

    return img.convert("RGB")


# ── 연간 인덱스 페이지 ──────────────────────────────────────────────────────────
def draw_year_index(W: int, H: int, req: GenerateRequest) -> Image.Image:
    img  = Image.new("RGB", (W, H), C["bg_page"])
    draw = ImageDraw.Draw(img)

    # 상단 헤더 바
    draw.rectangle([0, 0, W, int(H * 0.12)], fill=C["indigo_deep"])
    fh = _load_font(int(H * 0.045), bold=True)
    fs = _load_font(int(H * 0.022))
    draw.text((W // 2, int(H * 0.06)), f"{req.year} 연간 인덱스",
              font=fh, fill=C["gold"], anchor="mm")

    cols = 4 if W > H else 3
    rows = 4 if W > H else (4 if cols == 3 else 3)
    margin_x = int(W * 0.04)
    margin_y = int(H * 0.15)
    cell_w = (W - margin_x * 2) // cols
    cell_h = (H - margin_y - int(H * 0.05)) // rows

    for i in range(12):
        col = i % cols
        row = i // cols
        x0 = margin_x + col * cell_w + 4
        y0 = margin_y + row * cell_h + 4
        x1 = x0 + cell_w - 8
        y1 = y0 + cell_h - 8

        draw.rounded_rectangle([x0, y0, x1, y1], radius=8,
                               fill=C["bg_cell"], outline=C["indigo_200"], width=1)

        # 월 제목
        fm = _load_font(int(cell_h * 0.15), bold=True)
        draw.text((x0 + 12, y0 + 8), KO_MONTHS[i], font=fm, fill=C["indigo_deep"])

        # 간단 줄 (기록용)
        line_y = y0 + int(cell_h * 0.35)
        line_gap = int(cell_h * 0.12)
        for _ in range(4):
            draw.line([(x0 + 10, line_y), (x1 - 10, line_y)],
                     fill=C["rule_light"], width=1)
            line_y += line_gap

    return img


# ── 월간 페이지 ────────────────────────────────────────────────────────────────
def draw_monthly(W: int, H: int, req: GenerateRequest, month_idx: int) -> Image.Image:
    import calendar
    img  = Image.new("RGB", (W, H), C["bg_page"])
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, W, int(H * 0.11)], fill=C["indigo_deep"])
    fh = _load_font(int(H * 0.042), bold=True)
    fs = _load_font(int(H * 0.020))
    draw.text((W // 2, int(H * 0.055)),
              f"{req.year}년 {KO_MONTHS[month_idx]}",
              font=fh, fill=C["gold"], anchor="mm")

    # 요일 헤더
    margin_x = int(W * 0.03)
    header_y = int(H * 0.13)
    col_w = (W - margin_x * 2) // 7
    for d, label in enumerate(KO_DAYS):
        cx_ = margin_x + d * col_w + col_w // 2
        color = (220, 50, 50) if d == 5 else (50, 50, 220) if d == 6 else C["text_dark"]
        draw.text((cx_, header_y), label, font=fs, fill=color, anchor="mm")

    # 날짜 그리드
    cal = calendar.monthcalendar(req.year, month_idx + 1)
    row_h = int((H * 0.80) / len(cal))
    grid_y = int(H * 0.16)
    fd = _load_font(int(row_h * 0.22), bold=True)

    for week_i, week in enumerate(cal):
        for day_i, day in enumerate(week):
            if day == 0:
                continue
            cx_ = margin_x + day_i * col_w + col_w // 2
            cy_ = grid_y + week_i * row_h
            cx0, cy0 = cx_ - col_w // 2 + 3, cy_
            cx1, cy1 = cx_ + col_w // 2 - 3, cy_ + row_h - 3
            draw.rounded_rectangle([cx0, cy0, cx1, cy1], radius=5,
                                   fill=C["bg_cell"], outline=C["rule_light"], width=1)
            color = (220, 50, 50) if day_i == 5 else (50, 50, 220) if day_i == 6 else C["indigo_deep"]
            draw.text((cx_, cy_ + row_h // 4), str(day),
                     font=fd, fill=color, anchor="mm")

    return img


# ── 주간 페이지 ────────────────────────────────────────────────────────────────
def draw_weekly(W: int, H: int, req: GenerateRequest, week_num: int) -> Image.Image:
    img  = Image.new("RGB", (W, H), C["bg_page"])
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, W, int(H * 0.10)], fill=C["indigo_deep"])
    fh = _load_font(int(H * 0.038), bold=True)
    draw.text((W // 2, int(H * 0.05)),
              f"{req.year}년 {week_num}주차",
              font=fh, fill=C["gold"], anchor="mm")

    margin_x = int(W * 0.03)
    col_w = (W - margin_x * 2) // 7
    header_y = int(H * 0.13)
    fs = _load_font(int(H * 0.022), bold=True)

    for d, label in enumerate(KO_DAYS):
        cx_ = margin_x + d * col_w + col_w // 2
        color = (220, 50, 50) if d == 5 else (50, 50, 220) if d == 6 else C["indigo_light"]
        draw.text((cx_, header_y), label, font=fs, fill=color, anchor="mm")
        x0 = margin_x + d * col_w + 2
        draw.rectangle([x0, int(H * 0.16), x0 + col_w - 4, int(H * 0.97)],
                      fill=C["bg_cell"], outline=C["rule_light"], width=1)

    # 가로 시간 줄
    fl = _load_font(int(H * 0.016))
    for h_i in range(9):
        ly = int(H * 0.16) + h_i * int((H * 0.81) / 9)
        draw.line([(margin_x, ly), (W - margin_x, ly)],
                 fill=C["rule_light"], width=1)
        label = f"{h_i + 9}:00"
        draw.text((margin_x - 5, ly + 3), label, font=fl,
                 fill=C["text_light"], anchor="ra")

    return img


# ── 일간 페이지 ────────────────────────────────────────────────────────────────
def draw_daily(W: int, H: int, req: GenerateRequest) -> Image.Image:
    img  = Image.new("RGB", (W, H), C["bg_page"])
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, W, int(H * 0.10)], fill=C["indigo_deep"])
    fh = _load_font(int(H * 0.038), bold=True)
    draw.text((W // 2, int(H * 0.05)), f"{req.year} 하루 기록",
              font=fh, fill=C["gold"], anchor="mm")

    margin_x = int(W * 0.06)
    col_w = (W - margin_x * 2) // 2
    left_x  = margin_x
    right_x = margin_x + col_w

    # 왼쪽: 시간대별 블록 (6~22시)
    fl = _load_font(int(H * 0.018), bold=True)
    fs = _load_font(int(H * 0.015))
    block_h = int((H * 0.82) / 17)
    colors = [(67,56,202), (79,70,229), (99,102,241), (129,140,248),
              (165,180,252), (199,210,254), (224,231,255)]

    for idx, hour in enumerate(range(6, 23)):
        y0 = int(H * 0.13) + idx * block_h
        shade = colors[min(idx, len(colors)-1)]
        x1_block = right_x - 20
        draw.rounded_rectangle([left_x, y0, x1_block, y0 + block_h - 2],
                               radius=4, fill=shade, outline=C["rule_light"], width=1)
        draw.text((left_x + 8, y0 + block_h // 2),
                 f"{hour:02d}:00", font=fl, fill=C["white"], anchor="lm")

    # 오른쪽: 메모 섹션
    sections = ["오늘의 키워드", "감사 일기", "내일 준비"]
    section_h = int((H * 0.82) / len(sections))
    fb = _load_font(int(H * 0.022), bold=True)

    for s_i, title in enumerate(sections):
        y0 = int(H * 0.13) + s_i * section_h
        draw.rectangle([right_x, y0, W - margin_x, y0 + section_h - 4],
                      fill=C["bg_cell"], outline=C["rule_light"], width=1)
        draw.text((right_x + 12, y0 + 10), title,
                 font=fb, fill=C["indigo_deep"])
        line_y = y0 + int(section_h * 0.30)
        for _ in range(5):
            draw.line([(right_x + 10, line_y), (W - margin_x - 10, line_y)],
                     fill=C["rule_light"], width=1)
            line_y += int(section_h * 0.13)

    return img


# ── PDF 빌더 ───────────────────────────────────────────────────────────────────
def build_pdf(req: GenerateRequest) -> bytes:
    W = PORTRAIT_W  if req.orientation == "portrait" else LANDSCAPE_W
    H = PORTRAIT_H  if req.orientation == "portrait" else LANDSCAPE_H

    pages_images: list[Image.Image] = []

    for page_type in req.pages:
        if page_type == "cover":
            pages_images.append(draw_cover(W, H, req))
        elif page_type == "year-index":
            pages_images.append(draw_year_index(W, H, req))
        elif page_type == "monthly":
            for m in range(12):
                pages_images.append(draw_monthly(W, H, req, m))
        elif page_type == "weekly":
            for w in range(1, 53):
                pages_images.append(draw_weekly(W, H, req, w))
        elif page_type == "daily":
            pages_images.append(draw_daily(W, H, req))

    if not pages_images:
        raise ValueError("생성할 페이지가 없습니다.")

    buf = io.BytesIO()
    first, rest = pages_images[0], pages_images[1:]
    first.save(
        buf,
        format="PDF",
        save_all=True,
        append_images=rest,
        resolution=150,
    )
    buf.seek(0)
    return buf.read()


# ── 엔드포인트 ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "fortunetab-pdf-server", "version": "1.0.0"}


@app.post("/generate")
async def generate_pdf(req: GenerateRequest):
    log.info(f"PDF 생성 요청 | 방향={req.orientation} 페이지={req.pages} 이름={req.name}")

    try:
        pdf_bytes = build_pdf(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.exception("PDF 생성 실패")
        raise HTTPException(status_code=500, detail=f"생성 실패: {e}")

    filename = f"fortunetab_{req.year}_planner_{req.orientation}.pdf"
    log.info(f"PDF 생성 완료 | {len(pdf_bytes):,} bytes | {filename}")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
