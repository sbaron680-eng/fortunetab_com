"""
FortuneTab 유료 플래너 로컬 PDF 생성 서버
FastAPI + Pillow (PIL) + pypdf

기능:
  - 대한민국 공휴일 / 대체 공휴일 표시
  - 음력 날짜 표시
  - 모든 날짜 (월간/주간/일간) 완전 표기
  - PDF 내부 하이퍼링크 네비게이션

실행: uvicorn main:app --reload --port 8710
"""

from __future__ import annotations

import calendar
import io
import logging
import math
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, Field

# 한국 음력 변환
try:
    from korean_lunar_calendar import KoreanLunarCalendar
    _lunar_cal = KoreanLunarCalendar()

    def gregorian_to_lunar(y: int, m: int, d: int) -> tuple[int, int, bool]:
        """양력 → 음력 변환. (lunar_month, lunar_day, is_leap_month) 반환"""
        _lunar_cal.setSolarDate(y, m, d)
        lc = _lunar_cal.LunarIsoFormat()  # "YYYY-MM-DD" or "YYYY-MM-DD (intercalation)"
        parts = lc.split("-")
        lm = int(parts[1])
        ld = int(parts[2].split(" ")[0])
        is_leap = "(intercalation)" in lc
        return lm, ld, is_leap

except ImportError:
    def gregorian_to_lunar(y: int, m: int, d: int) -> tuple[int, int, bool]:
        return 0, 0, False


def _lunar_to_solar(year: int, lm: int, ld: int) -> date:
    """음력 → 양력 변환"""
    try:
        cal = KoreanLunarCalendar()
        cal.setLunarDate(year, lm, ld, False)
        s = cal.SolarIsoFormat()
        return date.fromisoformat(s)
    except Exception:
        return date(year, lm, ld)


# ── 로깅 ──────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("fortunetab_pdf")

# ── FastAPI 앱 ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FortuneTab PDF Generator",
    description="유료 사주 플래너 PDF 생성 로컬 서버",
    version="2.0.0",
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


# ── 요청 스키마 ───────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    orientation: Literal["portrait", "landscape"] = "portrait"
    year: int = Field(2026, ge=2020, le=2040)
    name: str = Field("나의 플래너", max_length=40)
    pages: list[Literal["cover", "year-index", "monthly", "weekly", "daily"]] = Field(
        default=["cover", "year-index", "monthly", "weekly", "daily"]
    )
    birth_year:  Optional[int] = Field(None, ge=1900, le=2020)
    birth_month: Optional[int] = Field(None, ge=1, le=12)
    birth_day:   Optional[int] = Field(None, ge=1, le=31)
    birth_hour:  Optional[int] = Field(None, ge=0, le=23)
    gender:      Optional[Literal["male", "female"]] = None


# ── 팔레트 ────────────────────────────────────────────────────────────────────
C = {
    "indigo_deep":   (30,  27,  75),
    "indigo_mid":    (49,  46, 129),
    "indigo_light":  (67,  56, 202),
    "indigo_100":    (224, 231, 255),
    "indigo_200":    (199, 210, 254),
    "gold":          (245, 158,  11),
    "gold_pale":     (251, 191,  36),
    "gold_faint":    (253, 230, 138),
    "white":         (255, 255, 255),
    "white_soft":    (220, 218, 240),
    "text_dark":     (30,  27,  75),
    "text_light":    (148, 163, 184),
    "bg_page":       (250, 249, 252),
    "bg_cell":       (248, 249, 255),
    "rule_light":    (199, 210, 254),
    "holiday_red":   (220,  38,  38),
    "holiday_bg":    (254, 226, 226),
    "sat_blue":      ( 37,  99, 235),
    "lunar_gray":    (150, 140, 180),
    "nav_bg":        ( 44,  40, 100),
    "nav_active":    (245, 158,  11),
    "nav_inactive":  (148, 163, 184),
    "subst_orange":  (234,  88,  12),
}

# ── 캔버스 크기 (150dpi A4) ───────────────────────────────────────────────────
PORTRAIT_W,  PORTRAIT_H  = 1240, 1754
LANDSCAPE_W, LANDSCAPE_H = 1754, 1240

# ── 월/요일 이름 ──────────────────────────────────────────────────────────────
KO_MONTHS = ["1월","2월","3월","4월","5월","6월",
             "7월","8월","9월","10월","11월","12월"]
KO_DAYS   = ["월","화","수","목","금","토","일"]

# ── 네비게이션 바 높이 ────────────────────────────────────────────────────────
NAV_H = 54

# ── 네비게이션 탭 목록 ────────────────────────────────────────────────────────
NAV_TABS = [
    ("cover",      "표지"),
    ("year-index", "연간"),
    ("monthly",    "월간"),
    ("weekly",     "주간"),
    ("daily",      "일간"),
]


# ══════════════════════════════════════════════════════════════════════════════
#  대한민국 공휴일 계산 (대체 공휴일 포함)
# ══════════════════════════════════════════════════════════════════════════════

def _get_korean_holidays(year: int) -> dict[date, str]:
    """대한민국 법정공휴일 + 대체공휴일 반환 {date: name}"""
    holidays: dict[date, str] = {}

    def add(d: date, name: str):
        holidays[d] = name

    # 양력 고정 공휴일
    fixed = [
        (1,  1,  "신정"),
        (3,  1,  "삼일절"),
        (5,  5,  "어린이날"),
        (6,  6,  "현충일"),
        (8,  15, "광복절"),
        (10, 3,  "개천절"),
        (10, 9,  "한글날"),
        (12, 25, "크리스마스"),
    ]
    for m, d, name in fixed:
        add(date(year, m, d), name)

    # 음력 공휴일
    seollal = _lunar_to_solar(year, 1, 1)
    add(seollal - timedelta(1), "설날 연휴")
    add(seollal,                "설날")
    add(seollal + timedelta(1), "설날 연휴")

    buddha = _lunar_to_solar(year, 4, 8)
    add(buddha, "석가탄신일")

    chuseok = _lunar_to_solar(year, 8, 15)
    add(chuseok - timedelta(1), "추석 연휴")
    add(chuseok,                "추석")
    add(chuseok + timedelta(1), "추석 연휴")

    # 대체 공휴일: 공휴일이 일요일과 겹치면 다음 비공휴일 평일로 대체
    base_holidays = dict(holidays)
    substitute_added: dict[date, str] = {}

    def next_non_holiday_weekday(d: date) -> date:
        nd = d + timedelta(1)
        while nd.weekday() == 6 or nd in holidays or nd in substitute_added:
            nd += timedelta(1)
        return nd

    for d, name in sorted(base_holidays.items()):
        if d.weekday() == 6:  # 일요일
            sub_d = next_non_holiday_weekday(d)
            if sub_d not in holidays:
                substitute_added[sub_d] = f"대체공휴일({name})"

    holidays.update(substitute_added)
    return holidays


_holiday_cache: dict[int, dict[date, str]] = {}

def get_holidays(year: int) -> dict[date, str]:
    if year not in _holiday_cache:
        _holiday_cache[year] = _get_korean_holidays(year)
    return _holiday_cache[year]


# ══════════════════════════════════════════════════════════════════════════════
#  폰트 로더
# ══════════════════════════════════════════════════════════════════════════════

_font_cache: dict[tuple, ImageFont.FreeTypeFont] = {}

def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    key = (size, bold)
    if key in _font_cache:
        return _font_cache[key]
    candidates = [
        "malgunbd.ttf" if bold else "malgun.ttf",
        "NanumGothicBold.ttf" if bold else "NanumGothic.ttf",
        "NotoSansCJK-Bold.ttc" if bold else "NotoSansCJK-Regular.ttc",
        "arial.ttf",
    ]
    for name in candidates:
        try:
            f = ImageFont.truetype(name, size)
            _font_cache[key] = f
            return f
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


# ══════════════════════════════════════════════════════════════════════════════
#  공통 그리기 유틸
# ══════════════════════════════════════════════════════════════════════════════

def _gradient_bg(draw: ImageDraw.ImageDraw, W: int, H: int) -> None:
    r1, g1, b1 = C["indigo_deep"]
    r2, g2, b2 = C["indigo_mid"]
    for y in range(H):
        t = y / H
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))


def _stars(draw: ImageDraw.ImageDraw, W: int, H: int, seed: int = 42) -> None:
    import random
    rng = random.Random(seed)
    for _ in range(60):
        x = rng.randint(0, W)
        y = rng.randint(0, H)
        r = rng.choice([1, 1, 1, 2])
        alpha = rng.randint(100, 220)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(255, 255, 255, alpha))


def _moon(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int,
          bg: tuple[int, int, int]) -> None:
    draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=C["gold"])
    offset = int(radius * 0.35)
    dr = int(radius * 1.0)
    draw.ellipse([cx-dr+offset, cy-dr, cx+dr+offset, cy+dr], fill=bg)


def _rule(draw: ImageDraw.ImageDraw, y: int, W: int, margin: int = 80) -> None:
    draw.line([(margin, y), (W-margin, y)], fill=(*C["rule_light"], 80), width=1)


# ══════════════════════════════════════════════════════════════════════════════
#  하단 네비게이션 바
# ══════════════════════════════════════════════════════════════════════════════

def draw_nav_bar(draw: ImageDraw.ImageDraw, W: int, H: int,
                 active_section: str) -> None:
    """하단 네비게이션 바 그리기"""
    bar_y = H - NAV_H
    draw.rectangle([0, bar_y, W, H], fill=C["nav_bg"])

    tab_w = W // len(NAV_TABS)
    fn = _load_font(int(NAV_H * 0.38), bold=True)

    for i, (section, label) in enumerate(NAV_TABS):
        x0 = i * tab_w
        x1 = x0 + tab_w
        cx = (x0 + x1) // 2
        cy = bar_y + NAV_H // 2
        is_active = (section == active_section)

        if is_active:
            draw.rectangle([x0 + 4, bar_y + 4, x1 - 4, H - 4],
                           fill=(55, 48, 120), outline=C["gold"], width=1)

        color = C["nav_active"] if is_active else C["nav_inactive"]
        draw.text((cx, cy), label, font=fn, fill=color, anchor="mm")


# ══════════════════════════════════════════════════════════════════════════════
#  페이지 드로어 함수들
# ══════════════════════════════════════════════════════════════════════════════

def draw_cover(W: int, H: int, req: GenerateRequest) -> Image.Image:
    img  = Image.new("RGBA", (W, H), C["indigo_deep"])
    draw = ImageDraw.Draw(img, "RGBA")
    _gradient_bg(draw, W, H)
    _stars(draw, W, H, seed=1)

    if W < H:
        cx, cy, r = W // 2, int(H * 0.28), int(min(W, H) * 0.14)
    else:
        cx, cy, r = W // 3, H // 2, int(H * 0.30)

    _moon(draw, cx, cy, r, C["indigo_mid"])

    fy = _load_font(int(H * 0.06), bold=True)
    fn = _load_font(int(H * 0.035), bold=True)
    fs = _load_font(int(H * 0.022))

    if W < H:
        cx_text = W // 2
        draw.text((cx_text, int(H * 0.50)), str(req.year),      font=fy, fill=C["gold"],   anchor="mm")
        draw.text((cx_text, int(H * 0.60)), req.name,           font=fn, fill=C["white"],  anchor="mm")
        draw.text((cx_text, int(H * 0.68)), "사주·운세 플래너", font=fs, fill=(*C["indigo_200"], 220), anchor="mm")
        _rule(draw, int(H * 0.73), W, margin=W // 4)
        draw.text((cx_text, int(H * 0.80)), "fortunetab",       font=fs, fill=(*C["gold_faint"], 180), anchor="mm")
    else:
        rx = int(W * 0.62)
        draw.text((rx, int(H * 0.35)), str(req.year),      font=fy, fill=C["gold"],   anchor="mm")
        draw.text((rx, int(H * 0.52)), req.name,           font=fn, fill=C["white"],  anchor="mm")
        draw.text((rx, int(H * 0.64)), "사주·운세 플래너", font=fs, fill=(*C["indigo_200"], 220), anchor="mm")
        _rule(draw, int(H * 0.73), W, margin=W // 3)
        draw.text((rx, int(H * 0.82)), "fortunetab",       font=fs, fill=(*C["gold_faint"], 180), anchor="mm")

    return img.convert("RGB")


def draw_year_index(W: int, H: int, req: GenerateRequest) -> Image.Image:
    """연간 인덱스: 12개월 셀 + 월별 공휴일 목록"""
    holidays = get_holidays(req.year)
    img  = Image.new("RGB", (W, H), C["bg_page"])
    draw = ImageDraw.Draw(img)
    content_H = H - NAV_H

    draw.rectangle([0, 0, W, int(content_H * 0.11)], fill=C["indigo_deep"])
    fh  = _load_font(int(content_H * 0.040), bold=True)
    fhd = _load_font(int(content_H * 0.017))

    draw.text((W // 2, int(content_H * 0.055)),
              f"{req.year} 연간 인덱스",
              font=fh, fill=C["gold"], anchor="mm")

    cols = 4 if W > H else 3
    rows = math.ceil(12 / cols)
    margin_x = int(W * 0.03)
    margin_y = int(content_H * 0.13)
    cell_w = (W - margin_x * 2) // cols
    cell_h = (content_H - margin_y - int(content_H * 0.03)) // rows

    for i in range(12):
        col = i % cols
        row = i // cols
        x0 = margin_x + col * cell_w + 4
        y0 = margin_y + row * cell_h + 4
        x1 = x0 + cell_w - 8
        y1 = y0 + cell_h - 8

        draw.rounded_rectangle([x0, y0, x1, y1], radius=8,
                               fill=C["bg_cell"], outline=C["indigo_200"], width=1)

        fm = _load_font(int(cell_h * 0.14), bold=True)
        draw.text((x0 + 12, y0 + 8), KO_MONTHS[i], font=fm, fill=C["indigo_deep"])

        # 해당 월의 공휴일 목록
        month_holidays = sorted(
            {d: n for d, n in holidays.items() if d.year == req.year and d.month == (i+1)}.items()
        )
        hy = y0 + int(cell_h * 0.30)
        hgap = int(cell_h * 0.115)
        for hd, hname in month_holidays[:5]:
            is_sub = "대체" in hname
            color = C["subst_orange"] if is_sub else C["holiday_red"]
            label = f"{hd.day}일 {hname[:6]}"
            draw.text((x0 + 10, hy), label, font=fhd, fill=color)
            hy += hgap

    draw_nav_bar(draw, W, H, "year-index")
    return img


def draw_monthly(W: int, H: int, req: GenerateRequest, month_idx: int) -> Image.Image:
    """월간: 날짜 그리드 + 공휴일 + 음력"""
    holidays = get_holidays(req.year)
    month_num = month_idx + 1
    img  = Image.new("RGB", (W, H), C["bg_page"])
    draw = ImageDraw.Draw(img)
    content_H = H - NAV_H

    # 헤더
    draw.rectangle([0, 0, W, int(content_H * 0.11)], fill=C["indigo_deep"])
    fh = _load_font(int(content_H * 0.042), bold=True)
    draw.text((W // 2, int(content_H * 0.055)),
              f"{req.year}년 {KO_MONTHS[month_idx]}",
              font=fh, fill=C["gold"], anchor="mm")

    # 요일 헤더
    margin_x = int(W * 0.03)
    header_y = int(content_H * 0.135)
    col_w = (W - margin_x * 2) // 7

    fday_hdr = _load_font(int(content_H * 0.023), bold=True)
    for d_i, label in enumerate(KO_DAYS):
        cx_ = margin_x + d_i * col_w + col_w // 2
        if d_i == 5:
            color = C["sat_blue"]
        elif d_i == 6:
            color = C["holiday_red"]
        else:
            color = C["text_dark"]
        draw.text((cx_, header_y), label, font=fday_hdr, fill=color, anchor="mm")

    # 날짜 그리드
    cal_weeks = calendar.monthcalendar(req.year, month_num)
    row_h  = int((content_H * 0.82) / len(cal_weeks))
    grid_y = int(content_H * 0.16)
    fd   = _load_font(int(row_h * 0.22), bold=True)
    fhol = _load_font(int(row_h * 0.14))
    flun = _load_font(int(row_h * 0.13))

    for week_i, week in enumerate(cal_weeks):
        for day_i, day in enumerate(week):
            if day == 0:
                continue

            cx_ = margin_x + day_i * col_w + col_w // 2
            cy_ = grid_y + week_i * row_h
            cx0 = cx_ - col_w // 2 + 3
            cy0 = cy_
            cx1 = cx_ + col_w // 2 - 3
            cy1 = cy_ + row_h - 3

            cur = date(req.year, month_num, day)
            is_holiday = cur in holidays
            is_sub     = is_holiday and "대체" in holidays.get(cur, "")

            cell_fill = (255, 237, 213) if is_sub else \
                        C["holiday_bg"]  if is_holiday else \
                        C["bg_cell"]

            draw.rounded_rectangle([cx0, cy0, cx1, cy1], radius=5,
                                   fill=cell_fill, outline=C["rule_light"], width=1)

            num_color = C["subst_orange"]  if is_sub      else \
                        C["holiday_red"]   if (is_holiday or day_i == 6) else \
                        C["sat_blue"]      if day_i == 5  else \
                        C["indigo_deep"]

            draw.text((cx_, cy_ + int(row_h * 0.25)),
                     str(day), font=fd, fill=num_color, anchor="mm")

            if is_holiday:
                hname = holidays[cur]
                c_hol = C["subst_orange"] if is_sub else C["holiday_red"]
                draw.text((cx_, cy_ + int(row_h * 0.52)),
                         hname[:5], font=fhol, fill=c_hol, anchor="mm")

            # 음력 날짜
            lm, ld, is_leap = gregorian_to_lunar(req.year, month_num, day)
            if lm > 0:
                leap_mark = "윤" if is_leap else ""
                lunar_txt = f"{leap_mark}{lm}/{ld}" if ld == 1 else f"{leap_mark}{ld}"
                draw.text((cx_, cy_ + int(row_h * 0.78)),
                         lunar_txt, font=flun, fill=C["lunar_gray"], anchor="mm")

    draw_nav_bar(draw, W, H, "monthly")
    return img


def draw_weekly(W: int, H: int, req: GenerateRequest, week_num: int) -> Image.Image:
    """주간: 실제 날짜 + 요일 + 공휴일 + 음력"""
    holidays = get_holidays(req.year)

    # ISO 주차 기준 주의 첫째 날(월요일) 계산
    jan4        = date(req.year, 1, 4)
    week1_mon   = jan4 - timedelta(days=jan4.weekday())
    week_start  = week1_mon + timedelta(weeks=week_num - 1)
    week_dates  = [week_start + timedelta(days=i) for i in range(7)]

    img  = Image.new("RGB", (W, H), C["bg_page"])
    draw = ImageDraw.Draw(img)
    content_H = H - NAV_H

    # 헤더
    draw.rectangle([0, 0, W, int(content_H * 0.10)], fill=C["indigo_deep"])
    fh = _load_font(int(content_H * 0.034), bold=True)

    start_d, end_d = week_dates[0], week_dates[6]
    if start_d.month != end_d.month:
        range_txt = f"{start_d.month}월 {start_d.day}일 – {end_d.month}월 {end_d.day}일"
    else:
        range_txt = f"{start_d.month}월 {start_d.day}~{end_d.day}일"

    draw.text((W // 2, int(content_H * 0.050)),
              f"{req.year}년 {week_num}주차  |  {range_txt}",
              font=fh, fill=C["gold"], anchor="mm")

    margin_x = int(W * 0.06)
    col_w    = (W - margin_x * 2) // 7
    header_y = int(content_H * 0.12)

    fd_day = _load_font(int(content_H * 0.022), bold=True)
    fd_num = _load_font(int(content_H * 0.028), bold=True)
    fhol   = _load_font(int(content_H * 0.016))
    flun   = _load_font(int(content_H * 0.015))
    fl     = _load_font(int(content_H * 0.016))

    for d_i, d in enumerate(week_dates):
        cx_ = margin_x + d_i * col_w + col_w // 2
        x0  = margin_x + d_i * col_w + 2

        is_holiday = d in holidays
        is_sub     = is_holiday and "대체" in holidays.get(d, "")

        col_fill = (255, 237, 213) if is_sub   else \
                   (254, 226, 226) if is_holiday else \
                   C["bg_cell"]

        draw.rectangle([x0, int(content_H * 0.15), x0 + col_w - 4, int(content_H * 0.97)],
                      fill=col_fill, outline=C["rule_light"], width=1)

        day_color = C["sat_blue"]      if d_i == 5 else \
                    C["holiday_red"]   if d_i == 6 else \
                    C["indigo_light"]

        # 요일 레이블
        draw.text((cx_, header_y - 14), KO_DAYS[d_i],
                 font=fd_day, fill=day_color, anchor="mm")

        # 날짜 (월.일)
        num_color = C["subst_orange"]  if is_sub         else \
                    C["holiday_red"]   if (is_holiday or d_i == 6) else \
                    C["sat_blue"]      if d_i == 5        else \
                    C["text_light"]    if d.year != req.year else \
                    C["indigo_deep"]

        draw.text((cx_, header_y + 14),
                 f"{d.month}/{d.day}", font=fd_num, fill=num_color, anchor="mm")

        # 공휴일 이름
        hol_row_h = 0
        if is_holiday:
            hname = holidays[d]
            c_hol = C["subst_orange"] if is_sub else C["holiday_red"]
            draw.text((cx_, header_y + 36),
                     hname[:5], font=fhol, fill=c_hol, anchor="mm")
            hol_row_h = 18

        # 음력 날짜
        lm, ld, is_leap = gregorian_to_lunar(d.year, d.month, d.day)
        if lm > 0:
            leap_mark = "윤" if is_leap else ""
            lunar_txt = f"음{leap_mark}{lm}/{ld}" if ld == 1 else f"음{leap_mark}{ld}"
            draw.text((cx_, header_y + 50 + hol_row_h),
                     lunar_txt, font=flun, fill=C["lunar_gray"], anchor="mm")

    # 가로 시간선 (8~22시, 15슬롯)
    time_start_y = int(content_H * 0.22)
    time_end_y   = int(content_H * 0.97)
    slot_count   = 15
    slot_h = (time_end_y - time_start_y) // slot_count

    for h_i in range(slot_count + 1):
        ly = time_start_y + h_i * slot_h
        draw.line([(margin_x, ly), (W - margin_x, ly)],
                 fill=C["rule_light"], width=1)
        draw.text((margin_x - 5, ly + 2), f"{h_i + 8}:00",
                 font=fl, fill=C["text_light"], anchor="ra")

    draw_nav_bar(draw, W, H, "weekly")
    return img


def draw_daily(W: int, H: int, req: GenerateRequest,
               year: int, month: int, day: int) -> Image.Image:
    """일간: 날짜 헤더 (음력 포함) + 시간대별 블록 + 메모 섹션"""
    holidays    = get_holidays(year)
    cur         = date(year, month, day)
    is_holiday  = cur in holidays
    is_sub      = is_holiday and "대체" in holidays.get(cur, "")
    weekday_ko  = KO_DAYS[cur.weekday()]

    lm, ld, is_leap = gregorian_to_lunar(year, month, day)
    leap_mark = "윤" if is_leap else ""
    lunar_str = f"음력 {leap_mark}{lm}월 {ld}일" if lm > 0 else ""
    holiday_name = holidays.get(cur, "")

    img  = Image.new("RGB", (W, H), C["bg_page"])
    draw = ImageDraw.Draw(img)
    content_H = H - NAV_H

    hdr_bg = (120, 30, 30) if (is_holiday and not is_sub) else \
             (140, 60, 10) if is_sub else C["indigo_deep"]
    draw.rectangle([0, 0, W, int(content_H * 0.13)], fill=hdr_bg)

    fh  = _load_font(int(content_H * 0.038), bold=True)
    fh2 = _load_font(int(content_H * 0.023), bold=True)

    date_txt = f"{year}년 {month}월 {day}일 ({weekday_ko})"
    draw.text((W // 2, int(content_H * 0.048)),
              date_txt, font=fh, fill=C["gold"], anchor="mm")

    sub_parts = []
    if lunar_str:
        sub_parts.append(lunar_str)
    if holiday_name:
        sub_parts.append(holiday_name)
    if sub_parts:
        draw.text((W // 2, int(content_H * 0.095)),
                  "  |  ".join(sub_parts),
                  font=fh2, fill=C["gold_faint"], anchor="mm")

    margin_x = int(W * 0.06)
    col_w    = (W - margin_x * 2) // 2
    left_x   = margin_x
    right_x  = margin_x + col_w + int(margin_x * 0.3)

    # 왼쪽: 시간대별 블록 (6~22시)
    fl_time = _load_font(int(content_H * 0.018), bold=True)
    block_h = int((content_H * 0.82) / 17)
    shades  = [(67,56,202), (79,70,229), (99,102,241), (129,140,248),
               (165,180,252), (199,210,254), (224,231,255)]

    for idx, hour in enumerate(range(6, 23)):
        y0 = int(content_H * 0.15) + idx * block_h
        shade = shades[min(idx, len(shades)-1)]
        x1_block = right_x - int(margin_x * 0.6)
        draw.rounded_rectangle([left_x, y0, x1_block, y0 + block_h - 2],
                               radius=4, fill=shade, outline=C["rule_light"], width=1)
        draw.text((left_x + 8, y0 + block_h // 2),
                 f"{hour:02d}:00", font=fl_time, fill=C["white"], anchor="lm")

    # 오른쪽: 메모 섹션
    sections  = ["오늘의 키워드", "감사 일기", "내일 준비", "하루 점수"]
    section_h = int((content_H * 0.82) / len(sections))
    fb = _load_font(int(content_H * 0.022), bold=True)
    fl = _load_font(int(content_H * 0.015))

    for s_i, title in enumerate(sections):
        y0 = int(content_H * 0.15) + s_i * section_h
        draw.rectangle([right_x, y0, W - margin_x, y0 + section_h - 4],
                      fill=C["bg_cell"], outline=C["rule_light"], width=1)
        draw.text((right_x + 12, y0 + 10), title, font=fb, fill=C["indigo_deep"])
        line_y = y0 + int(section_h * 0.30)
        for _ in range(5):
            draw.line([(right_x + 10, line_y), (W - margin_x - 10, line_y)],
                     fill=C["rule_light"], width=1)
            line_y += int(section_h * 0.13)

    draw_nav_bar(draw, W, H, "daily")
    return img


# ══════════════════════════════════════════════════════════════════════════════
#  PDF 빌더 + pypdf 하이퍼링크 후처리
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class PageRecord:
    index:     int
    section:   str
    month:     int = 0
    week:      int = 0
    year:      int = 0
    month_num: int = 0
    month_day: int = 0


def _add_nav_links_to_pdf(
    raw_bytes: bytes,
    page_records: list[PageRecord],
    W: int,
    H: int,
) -> bytes:
    """pypdf로 네비게이션 탭 영역에 내부 페이지 링크 삽입"""
    try:
        from pypdf import PdfReader, PdfWriter
        from pypdf.generic import (
            ArrayObject, DictionaryObject, NameObject, NumberObject,
        )
        from pypdf.generic import FloatObject
    except ImportError:
        return raw_bytes

    section_first: dict[str, int] = {}
    for rec in page_records:
        if rec.section not in section_first:
            section_first[rec.section] = rec.index

    reader = PdfReader(io.BytesIO(raw_bytes))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)

    tab_w         = W / len(NAV_TABS)
    bar_y_from_top = H - NAV_H

    for pg_rec in page_records:
        pg = writer.pages[pg_rec.index]
        pdf_page_h = float(pg.mediabox.height)
        pdf_page_w = float(pg.mediabox.width)
        scale_x = pdf_page_w / W
        scale_y = pdf_page_h / H

        for i, (section, _label) in enumerate(NAV_TABS):
            if section not in section_first:
                continue

            target_idx = section_first[section]
            x0_pdf = FloatObject(i * tab_w * scale_x)
            x1_pdf = FloatObject((i + 1) * tab_w * scale_x)
            y0_pdf = FloatObject((H - H) * scale_y)                  # bottom
            y1_pdf = FloatObject((H - bar_y_from_top) * scale_y)     # top

            annot = DictionaryObject({
                NameObject("/Type"):    NameObject("/Annot"),
                NameObject("/Subtype"): NameObject("/Link"),
                NameObject("/Rect"):    ArrayObject([x0_pdf, y0_pdf, x1_pdf, y1_pdf]),
                NameObject("/Border"):  ArrayObject([NumberObject(0), NumberObject(0), NumberObject(0)]),
                NameObject("/Dest"):    ArrayObject([
                    writer.pages[target_idx].indirect_reference,
                    NameObject("/Fit"),
                ]),
            })

            if "/Annots" not in pg:
                pg[NameObject("/Annots")] = ArrayObject()
            pg[NameObject("/Annots")].append(writer._add_object(annot))

    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    return out.read()


def build_pdf(req: GenerateRequest) -> bytes:
    W = PORTRAIT_W  if req.orientation == "portrait" else LANDSCAPE_W
    H = PORTRAIT_H  if req.orientation == "portrait" else LANDSCAPE_H

    pages_images: list[Image.Image] = []
    page_records: list[PageRecord]  = []
    idx = 0

    for page_type in req.pages:
        if page_type == "cover":
            pages_images.append(draw_cover(W, H, req))
            page_records.append(PageRecord(idx, "cover"))
            idx += 1

        elif page_type == "year-index":
            pages_images.append(draw_year_index(W, H, req))
            page_records.append(PageRecord(idx, "year-index"))
            idx += 1

        elif page_type == "monthly":
            for m in range(12):
                pages_images.append(draw_monthly(W, H, req, m))
                page_records.append(PageRecord(idx, "monthly", month=m+1))
                idx += 1

        elif page_type == "weekly":
            for w in range(1, 53):
                pages_images.append(draw_weekly(W, H, req, w))
                page_records.append(PageRecord(idx, "weekly", week=w))
                idx += 1

        elif page_type == "daily":
            year = req.year
            for m in range(1, 13):
                days_in_month = calendar.monthrange(year, m)[1]
                for d in range(1, days_in_month + 1):
                    pages_images.append(draw_daily(W, H, req, year, m, d))
                    page_records.append(PageRecord(idx, "daily",
                                                   year=year, month_num=m, month_day=d))
                    idx += 1

    if not pages_images:
        raise ValueError("생성할 페이지가 없습니다.")

    # PIL → PDF
    buf = io.BytesIO()
    first, rest = pages_images[0], pages_images[1:]
    first.save(buf, format="PDF", save_all=True, append_images=rest, resolution=150)
    buf.seek(0)
    raw_pdf = buf.read()

    # pypdf로 네비게이션 링크 삽입
    return _add_nav_links_to_pdf(raw_pdf, page_records, W, H)


# ══════════════════════════════════════════════════════════════════════════════
#  FastAPI 엔드포인트
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok", "service": "fortunetab-pdf-server", "version": "2.0.0"}


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
