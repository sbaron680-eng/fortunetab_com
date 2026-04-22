# FortuneTab — 유료 사주 심층 리포트 자동화 (Phase 2)

결제 → 5~10분 내 심층 리포트 PDF 이메일 배달 파이프라인. **완전 자동, 브라우저 종료 무관.**

```
[Toss 결제]
    │
    ▼
[Supabase Edge: confirm-payment v6]  ── fire-and-forget ──┐
                                                          │
                                                          ▼
                    [Supabase Edge: generate-premium-report v2]
                                  │  HMAC-SHA256 서명
                                  ▼
                    ┌──────────────────────────────┐
                    │  n8n Webhook (이 디렉토리의   │
                    │  workflow.json)              │
                    ├──────────────────────────────┤
                    │ 1. HMAC 검증                 │
                    │ 2. ReportInput 구성          │
                    │ 3. 5개 Sonnet 4.6 병렬       │  ← 15 → 5로 축소
                    │ 4. 결과 집계 + JSON 파싱     │
                    │ 5. Haiku 4.5 검수 패스       │
                    │ 6. pdf_server /reports/render│  ← WeasyPrint HTML→PDF
                    │ 7. /volume1/reports/{id}.pdf │  ← NAS 저장
                    │ 8. Supabase UPDATE orders    │
                    │ 9. send-report-email 콜백    │  ← Resend 이메일
                    └──────────────────────────────┘
                                  │
                                  ▼
                    [고객 받은편지함]
```

---

## 📁 이 디렉토리 파일 설명

| 파일 | 역할 |
|------|------|
| `claude-prompts.js` | 5 Sonnet + 1 Haiku 프롬프트 **소스 오브 트루스**. Node.js 모듈로 require해서 단위 테스트 가능. `workflow.json`의 Code 노드들도 이 파일의 축약본. |
| `hmac-verify.js` | HMAC-SHA256 검증 Code 노드 단독 소스. `workflow.json`의 "HMAC 검증" 노드가 이 파일의 복붙본. |
| `workflow.json` | **n8n import 파일**. 15개 노드 + 연결 정보. |
| `README.md` | 이 문서. |

**드리프트 주의**: `claude-prompts.js` 또는 `hmac-verify.js` 수정 시, `workflow.json`의 해당 Code 노드 `jsCode` 필드도 동기화 필수.

---

## 🚀 설치 절차 (처음 한 번)

### 1. NAS에 WeasyPrint 시스템 의존성 설치

Synology Container Manager 또는 SSH:

```bash
# pdf_server 컨테이너(또는 호스트)에서
apt-get update && apt-get install -y \
  libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b \
  fonts-nanum fonts-nanum-coding fonts-noto-cjk \
  && fc-cache -fv
```

`pdf_server/requirements.txt`에 `weasyprint>=62.0`, `jinja2>=3.1.4`가 추가되었으므로:

```bash
cd /path/to/pdf_server
pip install -r requirements.txt
```

### 2. pdf_server 재시작 & 헬스 체크

```bash
# 재시작
./start.sh

# 헬스 체크
curl http://localhost:8710/reports/health
# → {"status":"ok","template_found":true,"weasyprint":true,...}
```

### 3. n8n 워크플로 Import

1. n8n UI → Workflows → **Import from File** → `workflow.json` 업로드
2. Import 완료 후 각 HTTP Request 노드에서 자격증명(Credential)은 불필요 — 환경변수로 주입됨

### 4. n8n 환경변수 설정

n8n Settings → **Variables** (또는 Docker `env_file`) 에 다음 추가:

| Key | 값 | 비고 |
|-----|-----|------|
| `WEBHOOK_SHARED_SECRET` | Supabase Edge Function의 `WEBHOOK_SHARED_SECRET`과 동일 | HMAC 검증 |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Claude Sonnet + Haiku |
| `PDF_SERVER_URL` | `http://pdf-server:8710` (Docker 내부) 또는 `http://192.168.219.108:8710` | pdf_server 엔드포인트 |
| `REPORT_RENDER_SECRET` | 선택. pdf_server 앞단 추가 보호용 | pdf_server `REPORT_RENDER_SECRET` 환경변수와 일치 |
| `NAS_REPORT_PUBLIC_BASE` | 예: `https://reports.fortunetab.com/r` | 이메일 다운로드 링크 베이스 |

### 5. Webhook URL 확인 + Supabase에 등록

Import한 워크플로의 **Webhook 노드** → "Webhook URLs" → "Production URL" 복사.  
예: `https://n8n.fortunetab.com/webhook/fortunetab-report`

Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```
N8N_REPORT_WEBHOOK_URL = <위에서 복사한 URL>
```

### 6. NAS 공개 경로 구성

`/volume1/reports/{order_id}.pdf`를 외부에서 접근 가능하게 만드는 3가지 방법:

- **A. Cloudflare Tunnel** — `reports.fortunetab.com/r/{id}.pdf` → NAS의 `/volume1/reports/` 노출
- **B. Synology Web Station** — 가상 호스트 + 디렉토리 리스팅 비활성화
- **C. 별도 정적 파일 서버 컨테이너** (nginx) — `/r` 경로로 바인드

**주의**: `/volume1/reports/`는 **인증 없이 URL만 알면 누구나 접근 가능**. 고객의 order_id는 UUID라 추측 불가(URL non-enumerable)지만, 민감도 높은 사주 정보이므로 수익화 후 Supabase Storage + Signed URL 방식으로 교체 권장.

---

## 🧪 테스트 시나리오

### 테스트 1 — pdf_server 단독 렌더 (Claude 미호출)

```bash
curl -X POST http://localhost:8710/reports/render \
  -H "Content-Type: application/json" \
  -d @test-payload.json \
  --output test.pdf

# test-payload.json 예시는 아래 '샘플 페이로드' 섹션 참조
```

**검증 포인트**:
- [ ] PDF가 정상 생성되고 한국어가 깨지지 않음
- [ ] 4주8자 한자가 렌더링됨
- [ ] 월별 세운 12개 카드 레이아웃 유지
- [ ] 페이지 번호가 하단 중앙에 표시

### 테스트 2 — n8n 워크플로 단독 (Supabase 생략)

1. n8n에서 워크플로 수동 실행 → Webhook 노드의 **"Test URL"** 복사
2. 아래 curl로 Test URL 호출 (HMAC은 사전 계산):

```bash
# secret와 동일한 값
SECRET="your-webhook-shared-secret"
BODY='{"order_id":"6ea5f16e-4d53-449b-8679-06c94dff4fed","order_number":"FT-20260421-WSWF","user":{"name":"박성준","email":"sbaron680@gmail.com","gender":"male","birth_date":"1979-01-06","birth_hour":"묘시"},"saju_data":{...},"callback":{"send_email_url":"https://cwnzezlgtcqkmnyojhbd.supabase.co/functions/v1/send-report-email","service_role_bearer":"eyJ..."}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')

curl -X POST "https://n8n.fortunetab.com/webhook-test/fortunetab-report" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIG" \
  -d "$BODY"
```

### 테스트 3 — 전체 end-to-end

기존 WSWF 주문으로 `generate-premium-report` 재호출:

```bash
curl -X POST "https://cwnzezlgtcqkmnyojhbd.supabase.co/functions/v1/generate-premium-report" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"6ea5f16e-4d53-449b-8679-06c94dff4fed"}'
```

**진행 추적** (Supabase SQL Editor):

```sql
SELECT order_number, report_status, report_file_url, report_sent_at, report_expires_at,
       (report_json IS NOT NULL) AS has_json
FROM orders
WHERE id = '6ea5f16e-4d53-449b-8679-06c94dff4fed';
```

**성공 시** `report_status='sent'`, `report_file_url=<NAS URL>`, `report_json != null`.

---

## 📊 비용 / 레이턴시 예산 (하루 10건 기준)

| 항목 | 수치 | 월 환산 |
|------|------|---------|
| Sonnet 4.6 입력 (캐시 히트율 80%) | ~5k 토큰 × 5호출 | $3.75/월 |
| Sonnet 4.6 출력 | ~2k 토큰 × 5호출 | $15/월 |
| Haiku 검수 | ~8k 토큰 | $0.5/월 |
| **Claude 합계** | — | **~$20/월** |
| n8n NAS 부하 | ~90초 × 10건 | 무시 가능 |
| pdf_server CPU | ~5초 × 10건 | 무시 가능 |

*목표 p95 레이턴시: 90초 (Sonnet 5개 병렬의 최대치 기준)*

---

## 🔁 실패 복구

| 실패 지점 | 동작 | 복구 방법 |
|-----------|------|-----------|
| HMAC 불일치 | n8n 워크플로 fail, 401 | Edge Function `WEBHOOK_SHARED_SECRET` 확인 |
| Claude 호출 타임아웃 | HTTP Request 노드 재시도 2회 | 그래도 실패 시 관리자 수동 재실행 |
| JSON 파싱 실패 | "Sonnet 결과 집계" 노드 throw | Claude 응답 원문을 n8n 실행 히스토리에서 확인, 프롬프트 조정 |
| pdf_server 다운 | "pdf_server /reports/render" 노드 fail | pdf_server 재기동, n8n 워크플로 수동 재실행 |
| NAS 저장 실패 | Write File 노드 fail | `/volume1/reports/` 권한 확인 |
| Supabase UPDATE 실패 | PATCH 노드 4xx | service_role_bearer 만료 여부 확인 |
| 이메일 발송 실패 | send-report-email callback 500 | Resend 도메인 Verified 상태 확인, DNS 재확인 |

**수동 재실행**: n8n Executions → 실패한 실행 → "Retry" 버튼.  
**DB 롤백**: `UPDATE orders SET report_status='pending' WHERE id='<uuid>'` → 재호출.

---

## 🛠️ 운영 Cron (별도 구성 필요)

**32일 지난 PDF 자동 삭제** + `report_status='expired'`:

n8n에서 별도 Schedule 노드로 매일 00:30 KST 실행:

```sql
-- Supabase REST API PATCH
UPDATE orders
SET report_status = 'expired'
WHERE report_status = 'sent'
  AND report_expires_at IS NOT NULL
  AND report_expires_at < NOW();
```

+ NAS Code 노드:

```js
const fs = require('fs');
const path = require('path');
const expiredOrders = $input.all().map(i => i.json.id);
for (const id of expiredOrders) {
  const p = `/volume1/reports/${id}.pdf`;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
```

---

## 📝 샘플 페이로드 (pdf_server 단독 테스트용)

```json
{
  "order_id": "test-0001",
  "order_number": "FT-TEST-0001",
  "user": {
    "name": "박성준",
    "gender": "male",
    "birth_date": "1979-01-06",
    "birth_time": "묘시"
  },
  "meta": {
    "current_year": 2026,
    "issued_at": "2026년 4월 22일"
  },
  "saju_core": {
    "four_pillars": {
      "year":  {"hj": "戊午", "ko": "무오", "element": "화"},
      "month": {"hj": "乙丑", "ko": "을축", "element": "토"},
      "day":   {"hj": "丁未", "ko": "정미", "element": "토"},
      "hour":  {"hj": "癸卯", "ko": "계묘", "element": "목"}
    },
    "day_master": {
      "stem": "丁(정)",
      "element": "화",
      "strength": "신약",
      "description": "불씨 같은 섬세한 기운을 타고났으며, 주변 환경의 지지에 따라 빛이 크게 달라지는 분입니다."
    },
    "five_elements": {"wood": 1, "fire": 2, "earth": 3, "metal": 0, "water": 2},
    "yongsin": {"element": "목", "reason": "신약한 정화(丁火)에 땔감 역할을 하는 목 기운이 용신입니다."},
    "sipsin_highlight": [
      {"position": "월간", "name": "편인", "meaning": "깊이 있는 사유와 학문 성향"}
    ],
    "narrative": "섬세한 불의 원형을 가진 당신은..."
  },
  "annual_outlook": {
    "current_daeun": {
      "period": "43-52세",
      "pillar_hj": "辛酉",
      "pillar_ko": "신유",
      "theme": "정리와 결실의 10년",
      "opportunities": ["오래 준비해온 전문성이 세상에 드러남"],
      "challenges": ["인간관계 정리가 필요한 국면"],
      "transition_signs": "이 대운 초반에는 기존 것을 놓는 결단이 반복됩니다."
    },
    "next_daeun_preview": {
      "period": "53-62세",
      "pillar_hj": "庚申",
      "one_line": "외부 확장보다 내면의 안정기"
    },
    "annual_flow": {
      "year": 2026,
      "seun_pillar": "丙午 (병오)",
      "theme": "불의 해 — 드러냄과 발화",
      "quarters": {
        "q1": "준비된 것을 공개하는 시기",
        "q2": "관계 재편",
        "q3": "중심을 지키는 훈련",
        "q4": "수확과 정돈"
      },
      "key_months": [{"month": 5, "why": "인연이 집중되는 달", "action": "거절 기준 명확히"}]
    },
    "narrative": "10년 큰 흐름 안에서 올해는..."
  },
  "monthly_seun": {
    "months": [
      {"month":1,"seun_pillar_ko":"경인","energy":"새 출발의 바람","focus":"계획 구체화","watch_out":"조급함","keyword":"시작","color_tone":"연한 청록"},
      {"month":2,"seun_pillar_ko":"신묘","energy":"싹이 트는 달","focus":"첫 행동","watch_out":"미완결","keyword":"첫 싹","color_tone":"새순"},
      {"month":3,"seun_pillar_ko":"임진","energy":"봄의 도약","focus":"사람 만남","watch_out":"과신","keyword":"확장","color_tone":"옅은 황색"},
      {"month":4,"seun_pillar_ko":"계사","energy":"열기의 전조","focus":"공개","watch_out":"과로","keyword":"드러냄","color_tone":"주홍"},
      {"month":5,"seun_pillar_ko":"갑오","energy":"정점의 빛","focus":"선택과 집중","watch_out":"번아웃","keyword":"정점","color_tone":"진한 다홍"},
      {"month":6,"seun_pillar_ko":"을미","energy":"무더위 속 정지","focus":"회복","watch_out":"미적지근함","keyword":"정비","color_tone":"흙빛"},
      {"month":7,"seun_pillar_ko":"병신","energy":"방향 재조정","focus":"리뷰","watch_out":"반복","keyword":"점검","color_tone":"회백색"},
      {"month":8,"seun_pillar_ko":"정유","energy":"수확의 전환","focus":"결실 정리","watch_out":"미련","keyword":"수확","color_tone":"황금"},
      {"month":9,"seun_pillar_ko":"무술","energy":"안정의 구축","focus":"기반 다지기","watch_out":"답답함","keyword":"정착","color_tone":"카키"},
      {"month":10,"seun_pillar_ko":"기해","energy":"내면의 깊이","focus":"사유","watch_out":"고립","keyword":"심연","color_tone":"남색"},
      {"month":11,"seun_pillar_ko":"경자","energy":"정리와 응축","focus":"비우기","watch_out":"상실감","keyword":"비움","color_tone":"청흑"},
      {"month":12,"seun_pillar_ko":"신축","energy":"다음 문턱","focus":"내년 준비","watch_out":"서두름","keyword":"문턱","color_tone":"은회"}
    ]
  },
  "action_guide": {
    "grow_four": {
      "goal":    {"title": "목표 — 올해 당신이 닿을 곳", "items": ["매달 한 번 작품 공개하기", "지식 자산 3개 축적하기"]},
      "reality": {"title": "현재 지점", "items": ["에너지 분산 중", "회복 루틴 부재"]},
      "options": {"title": "선택지", "items": ["글로 정리하기", "한 사람에게 전달하기"]},
      "will":    {"title": "첫 7일 실행", "items": ["매일 30분 글쓰기", "일요일 주간 리뷰"]}
    },
    "weekly_habits": [
      {"day": "월", "habit": "주간 목표 3개 적기"},
      {"day": "수", "habit": "중간 점검 5분"},
      {"day": "금", "habit": "이번 주 수확 기록"},
      {"day": "일", "habit": "다음 주 리듬 설계"}
    ],
    "first_sprout": "지금 바로 — 다음 7일 중 '하지 않을 일' 하나를 포스트잇에 써서 모니터에 붙이세요."
  },
  "insight_highlight": {
    "top_insights": [
      {"title": "드러내는 해", "body": "당신의 2026년은 오래 쌓아온 것을 조용히 공개하는 해입니다. 완벽을 기다리지 말고 70%에서 내보내세요."},
      {"title": "불씨를 지킬 땔감", "body": "정화(丁火) 일간의 당신에겐 꾸준한 지지자 한두 명이 결정적입니다. 올해는 인맥을 넓히기보다 깊이 투자하세요."},
      {"title": "놓음의 용기", "body": "현재 대운 초입은 불필요한 관계/프로젝트를 내려놓을 때입니다. 더하기보다 빼기가 선명한 결과로 돌아옵니다."}
    ],
    "watchouts": [
      {"area": "건강", "caution": "5~6월 과로 주의, 위장·수면 패턴 흐트러질 수 있음", "timing": "5월~6월"},
      {"area": "관계", "caution": "오래된 관계에서 이별/정리 신호 감지될 수 있음", "timing": "대운 후반기"}
    ],
    "one_line": "드러내고, 지키고, 놓으세요."
  }
}
```

위 JSON을 `test-payload.json`으로 저장하면 테스트 1에서 바로 사용 가능.

---

## 🔗 연결 파일 레퍼런스

- **Edge Function 서명 로직**: `supabase/functions/generate-premium-report/index.ts` (`sign()` 함수)
- **이메일 발송 콜백**: `supabase/functions/send-report-email/index.ts`
- **DB 스키마**: `supabase/migrations/00009_add_orders_report_json.sql`
- **PDF 렌더 엔드포인트**: `pdf_server/reports/routes.py`
- **HTML 템플릿**: `pdf_server/templates/report.html.j2`
