# FortuneTab PDF 자동 생성 시스템 디자인

> 2026-03-28 | 결제 후 사주 맞춤 PDF 플래너를 n8n으로 자동 생성 + Gmail 발송

## 목표

유료 사주 플래너 구매 시, 관리자 수동 작업 없이 **결제 → PDF 생성 → 이메일 발송**까지 완전 자동화.

## 현재 상태

- 무료 플래너: 클라이언트 jsPDF+Canvas로 즉시 생성
- 유료 사주 플래너: 관리자가 수동으로 PDF 제작 → 이메일 발송 (1~2일 소요)
- checkout에서 수집하는 생년월일/시간/성별이 DB에 저장되지 않음

---

## 아키텍처

```
결제 완료 → Supabase orders INSERT (status='pending', saju_data=JSON)
  ↓ (n8n 2분 폴링)
n8n 워크플로우: 새 주문 감지
  ↓
PDF 서비스 (localhost:4001): Puppeteer + Canvas + jsPDF
  ├─ 사주 계산 (birthDate/Time/Gender → SajuData)
  ├─ Canvas 2D 렌더링 (기존 pdf-generator.ts 로직)
  └─ PDF 파일 저장 (로컬 output/)
  ↓
n8n: Gmail SMTP로 PDF 첨부 발송
  ↓
n8n: orders.status = 'completed' 업데이트
```

---

## 컴포넌트

### 1. PDF 서비스 (`fortunetab_com/pdf-server/`)

Express + Puppeteer 독립 서비스.

```
pdf-server/
├── package.json
├── server.ts          ← Express (port 4001)
├── generate.ts        ← Puppeteer PDF 생성 핵심 로직
├── saju.ts            ← 사주 계산 (src/lib/saju.ts에서 복사)
├── template.html      ← Puppeteer가 로드하는 HTML (Canvas 렌더링용)
└── output/            ← 생성된 PDF 저장
```

**API**: `POST /generate`

Request:
```json
{
  "orderId": "uuid",
  "name": "홍길동",
  "email": "user@example.com",
  "birthDate": "1990-05-15",
  "birthTime": "인시",
  "birthGender": "male",
  "theme": "navy",
  "orientation": "portrait",
  "mode": "fortune"
}
```

Response:
```json
{
  "success": true,
  "filePath": "output/FT-20260328-1234.pdf",
  "fileName": "fortunetab_2026_saju_planner_navy.pdf"
}
```

### 2. n8n 워크플로우: "FortuneTab 사주 플래너 자동 생성"

| 노드 | 타입 | 동작 |
|------|------|------|
| Schedule Trigger | 크론 | 2분 간격 |
| Supabase 조회 | HTTP Request | `status='pending' AND saju_data IS NOT NULL` |
| 주문 있음? | IF | 분기 |
| PDF 생성 | HTTP Request | `POST localhost:4001/generate` |
| Gmail 발송 | Gmail SMTP | PDF 첨부 + 안내 메일 |
| 상태 업데이트 | HTTP Request | Supabase `status='completed'` |
| 에러 처리 | Code | `status='failed'` + error_message |

### 3. Supabase 스키마 변경

```sql
ALTER TABLE orders ADD COLUMN saju_data JSONB DEFAULT NULL;
```

`saju_data` 예시:
```json
{
  "birthDate": "1990-05-15",
  "birthTime": "인시",
  "birthGender": "male",
  "theme": "navy",
  "orientation": "portrait",
  "notes": "특별 요청사항"
}
```

### 4. Checkout 수정

`src/lib/orders.ts`의 `createOrder()`에서 `saju_data` 컬럼에 JSON 저장.

---

## 이메일

- **발송**: Gmail SMTP (n8n 내장 노드)
- **제목**: `[FortuneTab] 2026년 사주 맞춤 플래너가 준비되었습니다`
- **본문**: 주문번호, 고객명, 상품명, 다운로드 안내
- **첨부**: PDF 파일

---

## 검증 방법

1. pdf-server 단독 테스트: `curl -X POST localhost:4001/generate -d '...'`
2. n8n 워크플로우 수동 실행
3. 테스트 주문 생성 → PDF 생성 → 이메일 수신 확인
