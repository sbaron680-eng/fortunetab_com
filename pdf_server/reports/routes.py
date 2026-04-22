"""
FortuneTab 심층 리포트 렌더 라우트

◆ 계약 (n8n → pdf_server)
  POST /reports/render
  Headers:
    Content-Type: application/json
    X-Render-Secret: <optional shared secret>  # n8n이 사설망 밖에서 오면 사용
  Body:  (5개 Claude 섹션 + meta)
    {
      "order_id":     "uuid",
      "order_number": "FT-20260421-WSWF",
      "user":         {"name":"…","gender":"male","birth_date":"1979-01-06","birth_time":"묘시"},
      "meta":         {"current_year": 2026, "issued_at": "2026-04-22"},
      "saju_core":            {...},
      "annual_outlook":       {...},
      "monthly_seun":         {...},
      "action_guide":         {...},
      "insight_highlight":    {...}
    }
  Response:
    application/pdf (binary) · Content-Disposition: attachment
    실패 시 400/500 + JSON {"error": "..."}

◆ 렌더 흐름
  1. Jinja2로 templates/report.html.j2 렌더
  2. WeasyPrint HTML → PDF
  3. StreamingResponse로 바이너리 반환

◆ 폰트 (NAS Docker 설치 필요)
  apt-get install fonts-nanum fonts-noto-cjk  # Debian/Ubuntu 계열
  (Synology Container Manager: 이미지에 사전 포함하거나 볼륨 마운트)

◆ 테스트 (curl)
  curl -X POST http://localhost:8710/reports/render \\
    -H "Content-Type: application/json" \\
    -d @sample_payload.json \\
    --output out.pdf

◆ 예상 오류
  1. TemplateNotFound — templates/report.html.j2 경로 문제.
     → main.py 실행 CWD를 pdf_server/로 고정하거나 BASE_DIR 절대경로 사용.
  2. OSError "cannot load ... font" — NanumGothic 미설치.
     → apt install fonts-nanum && fc-cache -fv
  3. Pydantic ValidationError — payload 스키마 누락.
     → 클라이언트(n8n)에서 5개 섹션 모두 전달하는지 확인.
"""

from __future__ import annotations

import io
import logging
import os
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field

log = logging.getLogger("fortunetab_report")

# ── 경로 상수 ─────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent  # .../pdf_server/
TEMPLATE_DIR = BASE_DIR / "templates"

# ── Jinja2 환경 ──────────────────────────────────────────────────────────────
_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

# ── 선택적 공유 비밀 (n8n ↔ pdf_server 사이 추가 보호, 사설망 전제면 생략 가능) ──
RENDER_SHARED_SECRET = os.environ.get("REPORT_RENDER_SECRET", "")

router = APIRouter(prefix="/reports", tags=["Premium Report"])


# ══════════════════════════════════════════════════════════════════════════════
#  요청 스키마
# ══════════════════════════════════════════════════════════════════════════════

class UserBlock(BaseModel):
    name: str
    gender: str
    birth_date: str
    birth_time: str


class MetaBlock(BaseModel):
    current_year: int
    issued_at: str  # 'YYYY-MM-DD' or 'YYYY년 M월 D일'


class RenderRequest(BaseModel):
    """n8n이 보내는 렌더 페이로드. 5개 섹션은 Claude가 생성한 raw dict."""
    order_id: str
    order_number: str
    user: UserBlock
    meta: MetaBlock
    saju_core: dict[str, Any]
    annual_outlook: dict[str, Any]
    monthly_seun: dict[str, Any]
    action_guide: dict[str, Any]
    insight_highlight: dict[str, Any]


# ══════════════════════════════════════════════════════════════════════════════
#  렌더 엔진 — 단위 테스트 용이하도록 분리
# ══════════════════════════════════════════════════════════════════════════════

def render_html(payload: RenderRequest) -> str:
    """Jinja2로 HTML 문자열 생성."""
    tmpl = _jinja_env.get_template("report.html.j2")
    return tmpl.render(
        order_id=payload.order_id,
        order_number=payload.order_number,
        user=payload.user.model_dump(),
        meta=payload.meta.model_dump(),
        saju_core=payload.saju_core,
        annual_outlook=payload.annual_outlook,
        monthly_seun=payload.monthly_seun,
        action_guide=payload.action_guide,
        insight_highlight=payload.insight_highlight,
    )


def html_to_pdf(html: str) -> bytes:
    """WeasyPrint로 HTML → PDF 바이트. base_url은 TEMPLATE_DIR (상대 자산 참조용)."""
    # 무거운 import는 여기서 지연 (main 서버 시작 시간 단축)
    from weasyprint import HTML  # type: ignore

    pdf_bytes = HTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf()
    if not pdf_bytes:
        raise RuntimeError("WeasyPrint가 빈 PDF를 반환했습니다.")
    return pdf_bytes


# ══════════════════════════════════════════════════════════════════════════════
#  FastAPI 엔드포인트
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/health")
def health() -> dict[str, Any]:
    """WeasyPrint/Jinja2 로드 가능 여부 진단."""
    template_ok = (TEMPLATE_DIR / "report.html.j2").is_file()
    weasy_ok: Optional[bool] = None
    weasy_err: Optional[str] = None
    try:
        from weasyprint import HTML  # noqa: F401
        weasy_ok = True
    except Exception as e:  # pragma: no cover
        weasy_ok = False
        weasy_err = str(e)

    return {
        "status": "ok" if (template_ok and weasy_ok) else "degraded",
        "template_found": template_ok,
        "template_path": str(TEMPLATE_DIR / "report.html.j2"),
        "weasyprint": weasy_ok,
        "weasyprint_error": weasy_err,
        "shared_secret_set": bool(RENDER_SHARED_SECRET),
    }


@router.post("/render")
async def render_report(
    request: Request,
    payload: RenderRequest,
    x_render_secret: Optional[str] = Header(default=None, alias="X-Render-Secret"),
) -> StreamingResponse:
    """Claude 섹션 JSON → 심층 리포트 PDF 바이너리."""

    # 1) 선택적 공유 비밀 검증 (사설망 밖에서 호출 시)
    if RENDER_SHARED_SECRET:
        if not x_render_secret or x_render_secret != RENDER_SHARED_SECRET:
            log.warning("[render-report] X-Render-Secret 불일치 — from=%s", request.client.host if request.client else "?")
            raise HTTPException(status_code=401, detail="unauthorized")

    log.info("[render-report] start | order=%s user=%s", payload.order_number, payload.user.name)

    # 2) HTML 렌더
    try:
        html = render_html(payload)
    except Exception as e:
        log.exception("[render-report] Jinja2 렌더 실패")
        raise HTTPException(status_code=400, detail=f"template render failed: {e}")

    # 3) PDF 생성
    try:
        pdf_bytes = html_to_pdf(html)
    except ImportError as e:
        log.exception("[render-report] WeasyPrint 미설치")
        raise HTTPException(status_code=500, detail=f"weasyprint unavailable: {e}")
    except Exception as e:
        log.exception("[render-report] PDF 변환 실패")
        raise HTTPException(status_code=500, detail=f"pdf conversion failed: {e}")

    filename = f"fortunetab_report_{payload.order_number}.pdf"
    log.info(
        "[render-report] done | order=%s bytes=%d",
        payload.order_number, len(pdf_bytes),
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Report-Order": payload.order_number,
        },
    )
