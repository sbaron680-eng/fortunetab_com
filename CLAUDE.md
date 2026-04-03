# FortuneTab — Claude 작업 가이드

## 프로젝트 개요
사주·운세 기반 **PDF 플래너 판매 + 명발굴(命發掘) 세션** 융합 서비스.
기존 PDF 플래너 이커머스에 바이오리듬×사주 Fortune Score 기반 발굴 세션을 추가.

- **URL**: fortunetab.com (Cloudflare Pages 배포)
- **GitHub**: sbaron680-eng/fortunetab_com (main 브랜치 → 자동 배포)
- **팀**: 1인 개발 (박성준)
- **슬로건**: 막혔을 때, 내 안의 답을 꺼냅니다

> **세부 가이드 문서**
> - [`docs/CLAUDE-planner.md`](docs/CLAUDE-planner.md) — PDF 생성기, 테마, fortune/practice 모드
> - [`docs/CLAUDE-products.md`](docs/CLAUDE-products.md) — 상품 카탈로그, PLANNER_YEAR, 추가 체크리스트
> - [`docs/CLAUDE-philosophy.md`](docs/CLAUDE-philosophy.md) — 4가지 철학 원문, 페이지별 적용 위치

---

## 두 축 융합

### 축 1: PDF 플래너 (구현 완료)
- 사주 기반 PDF 플래너 생성/판매 (7테마, 4철학, fortune/practice 모드)
- jsPDF + HTML5 Canvas 2D API (브라우저 전용)
- 4가지 상품: 무료 공통 / 사주 기본 / 사주 프리미엄 / 실천 플래너

### 축 2: 명발굴 세션 (Phase 1 구현 예정)
- 바이오리듬 × 사주 대운 Fortune Score + 7단계 발굴 위저드
- Claude Sonnet 4.6 API 3역할 병렬 호출
- biz(1인 사업가) / gen(일반인) 모드 자동 분기
- GROW 4법 행동 프레임워크

---

## 기술 스택

| 항목 | 현재 (구현됨) | Phase 1 추가 |
|------|-------------|-------------|
| Framework | Next.js 16 (App Router, SSG/Static Export) | Edge Runtime 전환 (@cloudflare/next-on-pages) |
| Language | TypeScript | — |
| CSS | Tailwind CSS v4 | — |
| PDF (플래너) | jsPDF + HTML5 Canvas 2D API | — |
| PDF (세션 결과) | — | @react-pdf/renderer (클라이언트, 서버비 0원) |
| 결제 (국내) | 토스페이먼츠 | — |
| 결제 (글로벌) | — | Lemon Squeezy (MoR, 사업자 심사 없음) |
| AI | — | Claude Sonnet 4.6 (Edge Runtime) |
| 인증/DB | Supabase (Auth + PostgreSQL) | — |
| 배포 | Cloudflare Pages (Static Export) | @cloudflare/next-on-pages (Edge) |
| 상태관리 | Zustand | — |

---

## 파일 구조

### 현재 (구현됨)
```
src/
├── app/
│   ├── auth/                     ← 로그인/회원가입/콜백
│   ├── checkout/                 ← 결제 + 완료 콜백
│   ├── dashboard/page.tsx        ← 사용자 대시보드
│   ├── download/page.tsx         ← PDF 생성 UI
│   ├── fortune/page.tsx          ← 월별 운세 조회
│   ├── products/[slug]/page.tsx  ← 상품 상세
│   └── saju/page.tsx             ← 사주 계산기
├── components/
│   ├── planner/
│   │   └── PlannerPreviewCanvas.tsx  ← 범용 캔버스 미리보기
│   └── product/
│       └── PlannerProductPreview.tsx ← 상품 페이지 5페이지 갤러리
├── lib/
│   ├── pdf-generator.ts          ← PDF/미리보기 핵심 엔진 (v4)
│   ├── pdf-themes.ts             ← 7가지 컬러 테마
│   ├── planner-philosophy.ts     ← 4가지 플래너 철학 데이터
│   ├── korean-holidays.ts        ← 공휴일 2025-2027
│   ├── products.ts               ← 상품 카탈로그 + PLANNER_YEAR
│   ├── saju.ts                   ← 사주팔자 엔진 (천간/지지/오행/용신/십신/대운)
│   ├── zodiac-fortune.ts         ← 12동물 띠 + 월별 Fortune Score
│   ├── fortune-text.ts           ← 운세 텍스트 템플릿
│   ├── store.ts                  ← Zustand (cart/auth/saju)
│   └── supabase.ts               ← Supabase 클라이언트
docs/
├── CLAUDE-planner.md
├── CLAUDE-products.md
└── CLAUDE-philosophy.md
```

### Phase 1 추가 (목표 구조)
```
src/
├── app/
│   ├── session/
│   │   ├── page.tsx              ← 세션 시작 (모드 선택 biz/gen)
│   │   ├── [step]/page.tsx       ← 7단계 위저드
│   │   └── result/[id]/page.tsx  ← 결과 페이지
│   ├── history/page.tsx          ← 세션 히스토리
│   ├── pricing/page.tsx          ← 요금제 (플래너 + 세션)
│   └── api/
│       ├── generate/route.ts     ← Claude API 3역할 호출 (Edge)
│       ├── fortune/
│       │   └── score/route.ts    ← Fortune Score (Solodesk도 호출)
│       ├── saju/route.ts         ← 사주 대운 계산
│       └── payments/
│           ├── checkout/route.ts ← Lemon Squeezy Checkout URL
│           └── webhook/route.ts  ← Lemon Squeezy Webhook
├── lib/
│   ├── biorhythm.ts              ← 바이오리듬 4사이클
│   └── lemonsqueezy.ts           ← Lemon Squeezy 헬퍼
```

---

## 명발굴(命發掘) 세션

### 방법론
FortuneTab 독자 개발. 논리로 풀리지 않는 막힘 앞에서 잠재의식 스토리로 돌파구 발굴.

### 타겟 2종 (모드 자동 분기)
| 모드 | 타겟 | 진입 맥락 |
|------|------|----------|
| `biz` | 1인 사업가·프리랜서·부업 | "사업에서 막혔을 때" |
| `gen` | 직장인·학생·취준생·퇴직자 | "이 길이 맞는지 모르겠을 때" |

### 발굴 세션 7단계
```
Step 0  Fortune Score 타이밍 진단 (바이오리듬 × 사주 대운)
Step 1  막힘 진단      (지금 어디서 막혔는가)
Step 2  수확 장면      (이 막힘이 해결된 미래 묘사)
Step 3  지금 목소리    (현재 솔직한 감정·불안)
Step 4  운명 흐름      (AI가 3구간 스토리 생성)
Step 5  실행 브레이크  (성장목표/브레이크행동/숨겨진이유/핵심믿음)
Step 6  뿌리 행동      (GROW 4법 행동 + 첫 싹 선언)
```

### GROW 4법 (독자 행동 프레임워크)
```
G (Ground) — 지금 바로 땅에 심을 수 있는 행동
R (Root)   — 뿌리를 내리는 꾸준한 행동
O (Open)   — 새로운 가능성을 여는 행동
W (Water)  — 지속적으로 물주는 습관
```

### 질문 세트 (모드별 분기)

**막힘 진단**
- biz: "사업에서 지금 어느 부분이 보이지 않나요?"
- gen: "요즘 혼자 있을 때 자꾸 머릿속을 맴도는 생각이 있나요?"

**수확 장면**
- biz: "이 막힘이 해결된 후, 사업은 어떤 모습일까요?"
- gen: "이 고민이 해결됐을 때, 나는 어디서 무엇을 하고 있나요?"

**지금 목소리**
- biz: "사업하면서 밤에 혼자 있을 때 문득 나오는 두려움은?"
- gen: "아무도 없을 때 혼자 중얼거리는 걱정이나 불안의 말은?"

**실행 브레이크**
- biz: "해야 한다는 걸 알면서도 계속 미루는 것은?"
- gen: "하고 싶은데 시작하지 못한 것은?"

---

## 핵심 알고리즘

### 바이오리듬 (`src/lib/biorhythm.ts` — Phase 1 구현)
```ts
value = Math.sin(2 * Math.PI * elapsedDays / period)

// 4사이클
신체: period=23, weight=0.30
감성: period=28, weight=0.30
지성: period=33, weight=0.20
직관: period=38, weight=0.20

bioScore = Σ(cycleValue × weight)  // -1 ~ 1
toPercent = (score + 1) / 2 * 100  // 0 ~ 100%
```

### Fortune Score (`src/lib/saju.ts` — Phase 1 확장)
```ts
daunBonus = { 상승기: +0.22, 안정기: +0.05, 전환기: -0.08, 하강기: -0.18 }
fortuneScore = clamp(bioScore + daunBonus, -1, 1)

// 발굴 추천 등급
> 0.40  → optimal  "발굴 최적"
> 0.10  → good     "좋은 흐름"
> -0.15 → neutral  "중립"
≤ -0.15 → rest     "충전"
```

### 기존 Fortune Score (`src/lib/zodiac-fortune.ts` — 구현됨)
- 12동물 띠 + 오행 관계 점수 (0~100)
- 등급: 대길(75+) / 길(60+) / 평(45+) / 주의(30+) / 어려움(0-29)

### Claude API (`src/app/api/generate/route.ts` — Phase 1 구현)
```ts
export const runtime = 'edge'

const [story, actions, brake] = await Promise.all([
  generateStory(body),    // ① 수확 묘사 + 3구간 스토리
  generateActions(body),  // ② GROW 4법 기반 행동
  generateBrake(body),    // ③ 실행 브레이크 진단
])

// 모델: claude-sonnet-4-6
// System: "반드시 순수 JSON만 응답, 마크다운 코드블록 금지"
// 건당 비용: ~$0.003
```

---

## 요금제

### PDF 플래너 (기존)
- 무료 공통 플래너: ₩0
- 사주 기본 / 프리미엄 / 실천 플래너: 토스페이먼츠 결제

### 명발굴 세션 (Phase 1 추가)
| 타입 | 가격 | 내용 |
|------|------|------|
| 단건 | 3,900원/1세션 | PDF 다운로드, 히스토리 없음 |
| 포인트 | 9,900원/5포인트 | 유효 6개월, 히스토리 30일 |
| 구독 월 | 9,900원/월 | 무제한, 사주 연간 리포트 |
| 구독 연 | 79,000원/연 | 위 동일 + 2개월 무료 |

---

## Supabase 스키마

### 기존 (구현됨)
- `orders`: 주문 (user_id, product_id, payment_key, status)
- `profiles`: 사용자 프로필

### Phase 1 추가
```sql
users (
  id uuid PK, email text UNIQUE, mode text DEFAULT 'gen',
  birth_date date, birth_time text, daun_phase text DEFAULT '안정기'
)

credits (
  user_id uuid FK, service text, balance int, expires_at timestamptz
)

subscriptions (
  user_id uuid FK, service text, plan text,
  status text, ls_subscription_id text UNIQUE, current_period_end timestamptz
)

ft_sessions (
  user_id uuid FK, mode text, fortune_score float, daun_phase text,
  answers jsonb, result jsonb, payment_type text
)
```

MCP 서버: `.mcp.json` → `cwnzezlgtcqkmnyojhbd` 프로젝트

---

## Solodesk 연동
- `/api/fortune/score` 엔드포인트를 Solodesk가 호출
- 공통 Supabase DB + Auth (SSO)
- Solodesk 결정 세션에 타이밍 진단 자동 포함

---

## 배포

```bash
git push origin main   # → Cloudflare Pages 자동 빌드/배포
```

### 현재 (SSG)
```bash
npx tsc --noEmit        # 타입 오류 확인
npx next build          # static export → out/
```

### Phase 1 이후 (Edge)
```
Build command    : npx @cloudflare/next-on-pages@1
Output directory : .vercel/output/static
```

### Cloudflare Pages 환경변수
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 환경변수 (.env.local)

```bash
# 기존
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Phase 1 추가
ANTHROPIC_API_KEY=sk-ant-...

# Lemon Squeezy (Phase 1)
LS_API_KEY=...
LS_STORE_ID=...
LS_WEBHOOK_SECRET=...
LS_VARIANT_FT_SINGLE=...
LS_VARIANT_FT_POINTS=...
LS_VARIANT_FT_SUB_MONTHLY=...
LS_VARIANT_FT_SUB_YEARLY=...
```

---

## 이커머스 흐름 (기존)
```
상품 선택 → AddToCartButton → Zustand 카트 스토어
→ /checkout → 토스페이먼츠 결제창
→ 결제 완료 콜백 → Supabase orders 테이블 저장
→ 무료: /download 직접 링크 | 유료: 이메일 발송
```

---

## 저작권 규칙

### 절대 사용 금지 (코드·UI·주석 모두)
- "퓨처매핑" / "Future Mapping"
- "면역맵" / "Immunity Map"
- "120% 행복" / "120% happy"
- STEP 1~6 (원저작물 표현)

### FortuneTab 독자 용어 (사용 가능)
- 명발굴(命發掘) / 발굴 세션 / 수확 장면 / 지금 목소리 / 운명 흐름
- 실행 브레이크 진단 / Fortune Score / GROW 4법 / 첫 싹(First Sprout)

---

## 적용 전문가 프레임

> UI에 전문가 이름·프레임 명칭 절대 노출 금지.
> 프레임은 내부 로직(Claude API 프롬프트)에서만 사용.

| 전문가 | 프레임 | 적용 위치 |
|--------|--------|-----------|
| 간다 마사노리 | 스토리씽킹·PASONA·BTRNUTSS | FT 전체 |
| 세스 고딘 | 차별화 관점 | 질문 언어에 흡수 |

---

## Phase 로드맵

### Phase 1 — 명발굴 MVP (2주)
- [ ] Supabase Auth 확장 (users 테이블 + 모드 분기)
- [ ] 바이오리듬 엔진 (biorhythm.ts)
- [ ] Fortune Score 통합 (바이오리듬 + 대운)
- [ ] 발굴 세션 7단계 위저드 (biz/gen)
- [ ] Claude Sonnet API 3역할 병렬 호출
- [ ] Edge Runtime 전환 (@cloudflare/next-on-pages)
- [ ] Lemon Squeezy 단건 결제 (3,900원)
- [ ] /api/fortune/score 엔드포인트 (Solodesk 연동용)

### Phase 2 — 요금제 완성 (1개월)
- [ ] Credits 포인트 시스템
- [ ] Lemon Squeezy Subscriptions + Webhook
- [ ] 세션 히스토리 저장·조회
- [ ] Resend 이메일 자동화

---

## 코딩 컨벤션

- **TypeScript strict**: 모든 타입 명시, `any` 금지
- **Client/Server 경계**: PDF/캔버스/Zustand 코드는 `'use client'` 필수
- **Dynamic import**: `jsPDF`, `renderPreviewPage` 는 SSR 방지를 위해 `import()` 사용
- **폰트**: 제목/강조 = `Noto Serif KR` (SERIF 상수), 본문 = `Noto Sans KR` (SANS 상수)
- **에러 처리**: PDF 생성 실패는 `try/catch` + 사용자 에러 메시지 표시

---

## 자주 하는 작업

### 공휴일 추가/수정
`src/lib/korean-holidays.ts` → `HOLIDAYS` 객체에 `'YYYY-MM-DD': { name, type }` 추가

### 새 테마 추가
`src/lib/pdf-themes.ts` → `THEMES` 배열에 `ColorTheme` 객체 추가

### 상품 정보 수정
`src/lib/products.ts` → `PRODUCTS` 배열 직접 수정. 체크리스트: `docs/CLAUDE-products.md`

### PDF 페이지 수정
draw 함수 상세 규칙: `docs/CLAUDE-planner.md`
