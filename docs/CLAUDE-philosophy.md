# FortuneTab 플래너 4가지 핵심 철학

## 원문 철학

| # | 철학 원문 | 핵심 가치 |
|---|-----------|-----------|
| ① | 생각하는데로 살지 않으면, 사는데로 생각하게 된다. | 의도적 삶 / 능동성 |
| ② | 정해진 운명일지라도, 노력에 따라 운명은 바꿀수 있다. | 주체적 변화 / 성장 |
| ③ | 소원은 강하게 빌어라. 신이 감동할 만큼의 노력을 보여라. | 강한 의지 / 헌신 |
| ④ | 계획을 세우고 실천하며 원하는것을 쟁취한다. | 실행력 / 목표 달성 |

## planner-philosophy.ts 구조

```typescript
// src/lib/planner-philosophy.ts
export const PHILOSOPHIES: Philosophy[] = [
  { id: 'intent',  quote: '생각하는데로...', shortQuote: '생각하는대로 산다', intent: '...' },
  { id: 'effort',  quote: '정해진 운명일지라도...', shortQuote: '노력이 운명을 바꾼다', intent: '...' },
  { id: 'wish',    quote: '소원은 강하게...', shortQuote: '간절히 바라고, 치열히 행동한다', intent: '...' },
  { id: 'execute', quote: '계획을 세우고...', shortQuote: '계획 → 실천 → 쟁취', intent: '...' },
];

export const getMonthPhilosophy = (month: number): Philosophy => PHILOSOPHIES[month % 4];
```

## PDF 페이지별 철학 적용

| 페이지 | 위치 | 철학 | 형태 |
|--------|------|------|------|
| 커버 (portrait) | 하단 구분선 아래 | fortune: ② / practice: ④ | 14pt serif, `T.coverMid` 65% 투명도 |
| 커버 (landscape) | 제목 아래 | fortune: ② shortQuote / practice: ④ | 13pt |
| 연간 인덱스 | 헤더 우측 정렬 | fortune: ① / practice: ④ | 60% 투명도 |
| 월간 | 헤더 아래 배너 (24px) | 월 % 4 순환 | 11pt, `T.headerA` 7% 배경 |
| 일간 | 오늘의 다짐 박스 | year % 4 / practice: ④ | 26% 크기, 72% 투명도 |

## fortune vs practice 모드 상세

### fortune 모드 (기존)
- 사주·운세 데이터 연동 (`opts.saju`)
- 공휴일·절기 표시
- 12달 달력 그리드 (연간)
- 음력/절기 기반 달력 (월간)

### practice 모드 (실천 플래너)
- 사주 데이터 무시 (`saju: undefined` 강제)
- 연간: 연간 3대 목표 + Q1-Q4 분기 계획 박스
- 월간: 달력 63% + OKR 우측 패널 (목표/KR/회고)
- 일간: MIT 3가지 + 습관 체크 섹션 추가

## 다운로드 페이지 모드 UI

`src/app/download/page.tsx`에서:
1. `mode` state (`'fortune' | 'practice'`, 기본 `'fortune'`)
2. 플래너 종류 카드 UI (🔮 운세 플래너 / 🎯 실천 플래너)
3. practice 선택 시 `saju` 데이터 자동 제외
4. `generatePlannerPDF({ ..., mode })` 전달
5. `PlannerPreviewCanvas` opts에도 `mode` 포함 필수

## 마케팅 문구

- Hero 부제: "운의 흐름을 알고, 노력으로 운명을 개척하는 나만의 플래너."
- 무료 공통 플래너 subtitle: "운세 흐름 + 4가지 실천 철학이 녹아든 플래너"
- 실천 플래너 subtitle: "계획하는 사람들을 위한 목표달성 플래너"
