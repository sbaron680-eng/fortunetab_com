# FortuneTab 2.0 — Claude 작업 가이드

## 프로젝트 개요
AI가 동양 사주명리와 서양 점성술을 융합 해석하여, 대화를 통해 삶의 방향을 탐색하는 **글로벌 플랫폼**.

- **URL**: fortunetab.com (Cloudflare Pages 배포)
- **GitHub**: sbaron680-eng/fortunetab_com (main 브랜치 → 자동 배포)
- **팀**: 1인 개발 (박성준)
- **슬로건**: Where Eastern Wisdom Meets Western Stars

---

## 핵심 전환 (v1 → v2)

| 항목 | v1 | v2 |
|------|----|----|
| 경험 | 7단계 위저드 | AI 대화형 세션 |
| 시장 | 국내 전용 | 글로벌 퍼스트 (한/영) |
| 엔진 | 사주 단독 | 사주 + 서양 점성술 융합 |
| 수익 | 건당 결제 | 크레딧/토큰 시스템 |
| AI | 3역할 병렬 JSON | 실시간 스트리밍 대화 |

---

## 4가지 AI 서비스

| 서비스 | Phase | 크레딧 | 상태 |
|--------|-------|--------|------|
| AI Chat Session | 1 (MVP) | 5 | 인프라 연결 완료, 통합 테스트 대기 |
| AI Auto Report (프리미엄 사주) | 2 | 주문 기반 | ✅ 상용 가능 (110초 e2e 검증 완료, 2026-04-22) |
| AI Coaching Journey | 3 | 구독 | 계획 |
| AI Decision Tool | 4 | 8 | 계획 |

### Phase 2 자동화 파이프라인 (상용 가동 중)

```
결제 → confirm-payment Edge Function (CAS 원자성)
     → generate-premium-report Edge Function (HMAC 서명)
     → n8n 워크플로 (NAS Docker, webhook.fortunetab.com)
       ├── 5 Sonnet 병렬 섹션 생성 + 1 Haiku 교정
       ├── pdf-server (Puppeteer + Chromium)
       ├── NAS 저장 (/reports/<uuid>_<token>.pdf, 32일 만료)
       └── send-report-email (Resend) → 사용자
```
- 평균 110초 end-to-end, ~$0.15/주문, PDF ~700KB (7 pages)
- 공개 URL: `reports.fortunetab.com/r/<order_id>_<access_token>.pdf` (capability 토큰 인증)

---

## 기술 스택

| 항목 | 선택 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| CSS | Tailwind CSS v4 |
| DB/Auth | Supabase (PostgreSQL + Auth + RLS) |
| AI | Claude Sonnet 4.6 (대화) / Haiku (Phase 4) |
| 결제 | 토스페이먼츠 (국내) + Lemon Squeezy (글로벌, 계획) |
| 배포 | Cloudflare Pages (@opennextjs/cloudflare) |
| 상태관리 | Zustand |
| PDF | jsPDF (플래너, 클라이언트 생성) + @react-pdf/renderer (세션 리포트) + Puppeteer/pdf-server (프리미엄 사주 리포트, NAS Docker) |
| 자동화 | n8n (NAS Docker, webhook.fortunetab.com) — Phase 2 리포트 파이프라인 |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx            # 랜딩
│   ├── layout.tsx          # 루트 레이아웃
│   ├── admin/              # 관리자
│   ├── auth/               # 인증
│   ├── cart/               # 장바구니
│   ├── checkout/           # 결제 (success, fail 페이지)
│   ├── contact/            # 문의
│   ├── dashboard/          # 대시보드
│   ├── download/           # PDF 다운로드
│   ├── fortune/            # 운세 결과
│   ├── history/            # 히스토리
│   ├── pricing/            # 가격 페이지
│   ├── products/           # 상품 목록
│   ├── saju/               # 사주 입력
│   ├── session/            # AI 세션
│   ├── settings/           # 설정
│   └── (정적 페이지)       # privacy, terms, refund
│
│   ⚠ `app/api/*` Route Handler는 next.config.ts의 `output: 'export'`와
│      호환 불가. 모든 서버 로직은 supabase/functions/*/index.ts (Deno
│      Edge Runtime)에 배치한다.
├── components/
│   ├── cart/               # CartDrawer
│   ├── chat/               # ChatWindow, MessageBubble, ChatInput
│   ├── checkout/           # PaymentWidget, PayPalPaymentWidget
│   ├── credits/            # CreditBalance, CreditPackages
│   ├── fortune/            # BirthDataForm, FortuneSnapshot
│   ├── home/               # PlannerPreviewSection, SansuBackground
│   ├── layout/             # Header, Footer, Disclaimer
│   ├── planner/            # PlannerPreviewCanvas
│   ├── product/            # ProductCard, ProductGallery
│   ├── session/            # SessionResultPDF
│   └── ui/                 # Button, Card, Input, Modal, Toast
├── lib/
│   ├── fortune/            # ★ Fortune Engine v2
│   │   ├── types.ts        # 공통 타입
│   │   ├── constants.ts    # 천간/지지/오행/점성술 상수
│   │   ├── saju-core.ts    # 4주8자 계산 (JDN, 절기 테이블)
│   │   ├── saju-advanced.ts # 십신/신살/대운
│   │   ├── western-astrology.ts # Sun/Moon/Rising Sign
│   │   ├── composite-score.ts   # 통합 Fortune Score
│   │   └── engine.ts       # 엔트리포인트
│   ├── ai/                 # Claude API + 프롬프트
│   ├── i18n/               # 다국어 (config, server, client, dictionaries)
│   ├── stores/             # Zustand 스토어
│   ├── __tests__/          # 테스트
│   ├── pdf-generator.ts    # PDF 생성 코어
│   ├── pdf-pages.ts        # PDF 페이지 레이아웃
│   ├── pdf-pages-extras.ts # 추가 페이지
│   ├── pdf-themes.ts       # PDF 테마 (7종)
│   ├── pdf-utils.ts        # PDF 유틸리티
│   ├── products.ts         # 상품 카탈로그
│   ├── promotions.ts       # 프로모션
│   ├── tier-gate.ts        # 티어 게이트
│   ├── biorhythm.ts        # 바이오리듬 (v1 재사용)
│   ├── supabase.ts         # DB 클라이언트
│   ├── supabase-server.ts  # 서버 클라이언트
│   ├── rate-limit.ts       # Rate limiting
│   ├── analytics.ts        # 분석
│   └── lemonsqueezy.ts     # Lemon Squeezy API (글로벌 결제)
pdf-server/                 # Node.js + Puppeteer PDF 렌더러 (NAS Docker, 상용 사용)
pdf_server/                 # (레거시 Python WeasyPrint 보조용, 로컬 개발 전용)
pdf-planner/                # PDF 플래너 로직 (jsPDF 기반, 클라이언트 사이드)
n8n/                        # n8n 워크플로 정의 (workflow.json, hmac-verify.js, claude-prompts.js)
supabase/
├── migrations/             # DB 스키마 + RLS (00001~00009)
└── functions/              # Deno Edge Functions (서버 로직의 유일한 자리)
    ├── _shared/              # 공통 헬퍼 (CORS whitelist 등)
    ├── chat/                 # AI Chat SSE 스트리밍 (Phase 1)
    ├── generate/             # 3역할 JSON 생성 (명발굴 세션)
    ├── generate-premium-report/  # Phase 2 리포트 파이프라인 진입점
    ├── checkout/             # Lemon Squeezy 체크아웃
    ├── confirm-payment/      # Toss 결제 승인 (CAS 원자성)
    ├── send-order-email/     # 주문 안내 이메일
    └── send-report-email/    # 리포트 발송 이메일
```

---

## Fortune Engine v2

동양 사주 + 서양 점성술 융합. `BirthData → CompositeFortuneProfile`.

```
Birth Data (date, time, location, gender)
    ├── Eastern Engine (saju-core + saju-advanced)
    │   → SajuResult, SipsinMap, Sinsal, Daeun
    ├── Western Engine (western-astrology)
    │   → SunSign, MoonSign, RisingSign
    └── Composite (biorhythm + daun + western)
        → FortuneScore (-1~1), Grade, Percent
```

**v1 대비 개선:**
- 태양절기 테이블 (입춘 날짜 연도별 정확도 향상)
- 시간 입력: 숫자(0~23) 통일 (기존 '자시'~'해시' 문자열 제거)
- null 사용 (기존 stemIdx=-1 센티널 제거)
- 영문 라벨 포함 (글로벌 대응)
- 서양 점성술 3종 (Sun + Moon + Rising) 추가

---

## 크레딧 시스템

| 패키지 | 크레딧 | KRW | USD |
|--------|--------|-----|-----|
| Starter | 10 | 4,900 | $3.99 |
| Standard | 30 | 9,900 | $7.99 |
| Plus | 80 | 19,900 | $15.99 |
| Pro Monthly | 100/월 | 14,900/월 | $11.99/월 |
| Pro Yearly | 100/월 | 119,000/년 | $99.99/년 |

- 신규 가입: 무료 5크레딧
- 일회성: 6개월 만료 / 구독: 매월 리셋

---

## 코딩 규칙

### 필수
- Git: **main 브랜치만 사용** (새 브랜치 생성 금지)
- 결론 먼저 / 불확실하면 추측 금지
- 코드에 테스트법 + 예상오류 3개 포함
- AI 면책조항 항상 표시: "AI 분석은 참고 용도이며 전문 상담을 대체하지 않습니다"

### 저작권 — 절대 사용 금지
- "퓨처매핑" / "Future Mapping"
- "면역맵" / "Immunity Map"
- "120% 행복" / "120% happy"
- STEP 1~6 (원저작물 표현)

### FortuneTab 독자 용어 (사용 가능)
- Fortune Score, GROW 4법, 발굴 세션, 운명 흐름
- 수확 장면, 지금 목소리, 실행 브레이크, 첫 싹(First Sprout)

### 전문가 프레임 — 내부 로직에서만 (UI 노출 금지)
- 간다 마사노리, 필립 코틀러, 러셀 브런슨 등

---

## 공통 작업

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm test             # 테스트 (vitest)
npm run test:watch   # 테스트 감시 모드
npm run deploy       # Cloudflare 배포
```
