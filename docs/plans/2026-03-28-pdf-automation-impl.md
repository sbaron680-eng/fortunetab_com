# FortuneTab PDF 자동 생성 시스템 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 유료 사주 플래너 결제 완료 후, n8n이 자동으로 PDF를 생성하고 Gmail로 발송하는 파이프라인 구축

**Architecture:** Supabase 주문 DB 폴링 → n8n 워크플로우 → 로컬 PDF 서비스(Express+Puppeteer) → Gmail SMTP 발송. checkout에서 사주 입력 데이터를 orders.saju_data에 JSONB로 저장.

**Tech Stack:** Express, Puppeteer, n8n, Supabase (PostgreSQL), Gmail SMTP, 기존 jsPDF+Canvas 코드 재활용

---

## Task 1: Supabase 스키마 변경 — orders에 saju_data 컬럼 추가

**Files:**
- Modify: Supabase DB (SQL 실행)

**Step 1: Supabase SQL Editor에서 실행**

Supabase 대시보드 → SQL Editor에서:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS saju_data JSONB DEFAULT NULL;

COMMENT ON COLUMN orders.saju_data IS '사주 플래너용 입력 데이터: birthDate, birthTime, birthGender, theme, orientation, notes';
```

**Step 2: 검증**

```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'saju_data';
```

Expected: `saju_data | jsonb`

---

## Task 2: Checkout에서 saju_data 저장하도록 수정

**Files:**
- Modify: `src/lib/orders.ts`
- Modify: `src/app/checkout/page.tsx`

**Step 1: `createOrder()` 함수에 sajuData 파라미터 추가**

`src/lib/orders.ts:13` — 함수 시그니처 변경:

```typescript
export async function createOrder(
  userId: string,
  items: CartItem[],
  total: number,
  sajuData?: {
    birthDate: string;
    birthTime: string;
    birthGender: string;
    theme: string;
    orientation: string;
    notes: string;
  }
): Promise<{ orderNumber: string; orderId: string } | null> {
```

`src/lib/orders.ts:20-28` — insert에 saju_data 추가:

```typescript
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_number: orderNumber,
      status: 'pending',
      total,
      ...(sajuData ? { saju_data: sajuData } : {}),
    })
    .select('id')
    .single();
```

**Step 2: checkout에서 createOrder 호출 시 sajuData 전달**

`src/app/checkout/page.tsx` — 무료 상품 주문 (line 131):

```typescript
const result = await createOrder(user.id, items, 0, hasSajuProduct ? {
  birthDate: form.birthDate,
  birthTime: form.birthTime,
  birthGender: form.birthGender,
  theme: 'navy',  // 기본 테마
  orientation: 'portrait',
  notes: form.notes,
} : undefined);
```

`src/app/checkout/success/page.tsx` — 유료 상품 주문에서도 동일하게 sajuData 전달. (checkout/success에서 createOrder 호출 시 localStorage 등에서 form 데이터를 읽어야 함)

**주의**: checkout success 페이지는 Toss 리디렉트 후 도착하므로, form 데이터가 사라집니다. `sessionStorage`에 form을 임시 저장하고 success 페이지에서 읽도록 수정:

checkout/page.tsx의 handlePayment (line 142 전):
```typescript
// 토스 리디렉트 전에 폼 데이터 저장
sessionStorage.setItem('checkout-form', JSON.stringify(form));
```

checkout/success/page.tsx에서:
```typescript
const savedForm = JSON.parse(sessionStorage.getItem('checkout-form') || '{}');
const sajuData = savedForm.birthDate ? {
  birthDate: savedForm.birthDate,
  birthTime: savedForm.birthTime,
  birthGender: savedForm.birthGender,
  theme: 'navy',
  orientation: 'portrait',
  notes: savedForm.notes || '',
} : undefined;

const result = await createOrder(user.id, items, amount, sajuData);
sessionStorage.removeItem('checkout-form');
```

**Step 3: typecheck**

```bash
npx tsc --noEmit
```

**Step 4: 커밋**

```bash
git add src/lib/orders.ts src/app/checkout/page.tsx src/app/checkout/success/page.tsx
git commit -m "feat: save saju input data to orders.saju_data on checkout"
```

---

## Task 3: PDF 서비스 프로젝트 초기화

**Files:**
- Create: `pdf-server/package.json`
- Create: `pdf-server/tsconfig.json`
- Create: `pdf-server/.gitignore`

**Step 1: `pdf-server/package.json`**

```json
{
  "name": "fortunetab-pdf-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch server.ts",
    "start": "tsx server.ts"
  },
  "dependencies": {
    "express": "^4.21.0",
    "puppeteer": "^24.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

**Step 2: `pdf-server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["*.ts"]
}
```

**Step 3: `pdf-server/.gitignore`**

```
node_modules/
dist/
output/*.pdf
```

**Step 4: 설치**

```bash
cd pdf-server && npm install
```

**Step 5: output 디렉토리 생성**

```bash
mkdir -p pdf-server/output
touch pdf-server/output/.gitkeep
```

**Step 6: 커밋**

```bash
git add pdf-server/package.json pdf-server/tsconfig.json pdf-server/.gitignore pdf-server/output/.gitkeep
git commit -m "chore: initialize pdf-server project (Express + Puppeteer)"
```

---

## Task 4: PDF 서비스 — Express 서버 + 생성 API

**Files:**
- Create: `pdf-server/server.ts`
- Create: `pdf-server/generate.ts`

**Step 1: `pdf-server/server.ts`**

```typescript
import express from 'express';
import { generatePDF } from './generate';

const app = express();
app.use(express.json());

let generating = false;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', generating });
});

app.post('/generate', async (req, res) => {
  if (generating) {
    res.status(409).json({ error: 'PDF 생성이 진행 중입니다.' });
    return;
  }

  const { orderId, name, email, birthDate, birthTime, birthGender, theme, orientation, mode } = req.body;

  if (!orderId || !birthDate) {
    res.status(400).json({ error: 'orderId, birthDate 필수' });
    return;
  }

  generating = true;
  try {
    const result = await generatePDF({
      orderId,
      name: name || '사용자',
      birthDate,
      birthTime: birthTime || '',
      birthGender: birthGender || 'male',
      theme: theme || 'navy',
      orientation: orientation || 'portrait',
      mode: mode || 'fortune',
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[PDF] 생성 실패:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    generating = false;
  }
});

const PORT = process.env.PDF_SERVER_PORT || 4001;
app.listen(PORT, () => {
  console.log(`PDF 서비스 실행 중: http://localhost:${PORT}`);
});
```

**Step 2: `pdf-server/generate.ts`**

이 파일은 Puppeteer를 사용하여 headless Chrome에서 기존 PDF 생성 코드를 실행합니다.

핵심 전략: `pdf-server/template.html`을 Puppeteer로 로드하고, 해당 HTML 안에서 기존 `pdf-generator.ts`의 번들된 버전을 실행하여 PDF를 생성합니다.

```typescript
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

interface GenerateInput {
  orderId: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthGender: string;
  theme: string;
  orientation: string;
  mode: string;
}

export async function generatePDF(input: GenerateInput) {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const fileName = `fortunetab_2026_saju_planner_${input.theme}.pdf`;
  const filePath = path.join(outputDir, `${input.orderId}_${fileName}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // 기존 Next.js 빌드의 download 페이지를 로드하거나,
    // 전용 template.html을 로드
    const templatePath = path.join(__dirname, 'template.html');
    await page.goto(`file://${templatePath}`, { waitUntil: 'networkidle0' });

    // 페이지 내에서 PDF 생성 함수를 호출하고 결과를 받아옴
    const pdfBase64 = await page.evaluate(async (opts) => {
      // template.html에 window.generatePlannerPDF가 정의되어 있다고 가정
      // @ts-ignore
      return await window.generateAndReturnPDF(opts);
    }, {
      orientation: input.orientation,
      year: 2026,
      name: input.name,
      theme: input.theme,
      mode: input.mode,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthGender: input.birthGender,
    });

    // base64 → 파일 저장
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    fs.writeFileSync(filePath, pdfBuffer);

    console.log(`[PDF] 생성 완료: ${filePath} (${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

    return { filePath, fileName };
  } finally {
    await browser.close();
  }
}
```

**Step 3: 커밋**

```bash
git add pdf-server/server.ts pdf-server/generate.ts
git commit -m "feat: add PDF generation Express server with Puppeteer"
```

---

## Task 5: PDF 서비스 — template.html (Canvas 렌더링 환경)

**Files:**
- Create: `pdf-server/template.html`
- Create: `pdf-server/build-bundle.sh`

**Step 1: template.html 구조**

기존 `pdf-generator.ts`, `pdf-themes.ts`, `pdf-utils.ts`, `planner-philosophy.ts`, `korean-holidays.ts`, `saju.ts` 코드를 하나의 브라우저 번들로 만들어 template.html에서 로드합니다.

esbuild를 사용하여 번들 생성:

```bash
# pdf-server/build-bundle.sh
npx esbuild ../src/lib/pdf-generator.ts \
  ../src/lib/saju.ts \
  --bundle --outfile=bundle.js \
  --format=iife --global-name=FortunePDF \
  --platform=browser \
  --external:jspdf
```

`template.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"></script>
  <script src="bundle.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
<script>
  window.generateAndReturnPDF = async function(opts) {
    // 폰트 로드 대기
    await document.fonts.ready;

    // 사주 계산
    const sajuData = FortunePDF.calculateSaju(
      opts.birthDate, opts.birthTime, opts.birthGender
    );

    // PDF 생성
    const pdfBlob = await FortunePDF.generatePlannerPDF({
      orientation: opts.orientation || 'portrait',
      year: opts.year || 2026,
      name: opts.name || '',
      pages: ['cover', 'year-index', 'monthly', 'weekly', 'daily'],
      theme: opts.theme || 'navy',
      mode: opts.mode || 'fortune',
      saju: sajuData,
    });

    // Blob → base64
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(pdfBlob);
    });
  };
</script>
</body>
</html>
```

**주의**: 기존 `generatePlannerPDF`가 Blob이 아닌 직접 다운로드(`doc.save()`)를 호출할 수 있으므로, Blob 반환 모드를 추가해야 합니다. `pdf-generator.ts`에서 `doc.output('blob')` 호출로 변경하거나, `doc.output('datauristring')`에서 base64를 추출합니다.

esbuild 번들링 시 기존 코드의 import 경로(`@/lib/...`)를 resolve하기 위한 설정이 필요합니다. 이는 Task 실행 시 조정합니다.

**Step 2: 커밋**

```bash
git add pdf-server/template.html pdf-server/build-bundle.sh
git commit -m "feat: add template.html and esbuild bundle script for PDF rendering"
```

---

## Task 6: pdf-generator.ts에 Blob 반환 모드 추가

**Files:**
- Modify: `src/lib/pdf-generator.ts`

**Step 1: generatePlannerPDF 함수 수정**

현재 함수 끝에서 `doc.save(fileName)`을 호출합니다. `returnBlob` 옵션을 추가하여 Blob을 반환할 수 있게 합니다.

`PlannerOptions` 인터페이스에 추가:
```typescript
returnBlob?: boolean;  // true면 다운로드 대신 Blob 반환
```

함수 끝에서:
```typescript
if (opts.returnBlob) {
  return doc.output('blob');
}
doc.save(fileName);
return null;
```

반환 타입을 `Promise<Blob | null>`로 변경.

**Step 2: 커밋**

```bash
git add src/lib/pdf-generator.ts src/lib/pdf-utils.ts
git commit -m "feat: add returnBlob mode to generatePlannerPDF for server-side use"
```

---

## Task 7: esbuild 번들 생성 및 테스트

**Files:**
- Modify: `pdf-server/package.json` (esbuild 추가)

**Step 1: esbuild 설치 및 번들 스크립트**

```bash
cd pdf-server && npm install --save-dev esbuild
```

package.json scripts에 추가:
```json
"bundle": "esbuild ../src/lib/pdf-generator.ts ../src/lib/saju.ts --bundle --outfile=bundle.js --format=iife --global-name=FortunePDF --platform=browser --external:jspdf --alias:@/lib=../src/lib"
```

**Step 2: 번들 생성**

```bash
cd pdf-server && npm run bundle
```

**Step 3: PDF 서버 테스트**

```bash
cd pdf-server && npm run dev
# 다른 터미널에서:
curl -X POST http://localhost:4001/generate \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"test-001","name":"테스트","birthDate":"1990-05-15","birthTime":"인시","birthGender":"male","theme":"navy"}'
```

Expected: `{"success":true,"filePath":"output/test-001_fortunetab_2026_saju_planner_navy.pdf","fileName":"..."}`

**Step 4: 커밋**

```bash
git add pdf-server/
git commit -m "feat: working PDF generation service with esbuild bundle"
```

---

## Task 8: n8n 워크플로우 생성 — FortuneTab 사주 플래너 자동 생성

**Files:**
- Create: n8n 워크플로우 (n8n UI에서 생성)
- Export: `workflows/fortunetab-pdf-generator.json`

**Step 1: n8n UI에서 새 워크플로우 생성**

이름: `FortuneTab 사주 플래너 자동 생성`

**노드 구성:**

1. **Schedule Trigger** — 2분 간격
2. **Supabase 주문 조회** (Code 노드):
   ```javascript
   const SUPABASE_URL = 'https://cwnzezlgtcqkmnyojhbd.supabase.co';
   const SUPABASE_KEY = '<anon_key>';

   const res = await this.helpers.httpRequest({
     method: 'GET',
     url: `${SUPABASE_URL}/rest/v1/orders?status=eq.pending&saju_data=not.is.null&limit=1&order=created_at.asc`,
     headers: {
       'apikey': SUPABASE_KEY,
       'Authorization': `Bearer ${SUPABASE_KEY}`,
     },
   });
   const orders = typeof res === 'string' ? JSON.parse(res) : res;
   const order = orders[0] || null;
   return [{ json: { hasOrder: !!order, order } }];
   ```

3. **IF 분기** — `{{ $json.hasOrder }}` === true
4. **PDF 생성** (HTTP Request 노드):
   - Method: POST
   - URL: `http://localhost:4001/generate`
   - Body (JSON):
     ```
     {
       "orderId": "{{ $json.order.order_number }}",
       "name": "{{ $json.order.saju_data.name || '고객' }}",
       "email": "{{ $json.order.saju_data.email || '' }}",
       "birthDate": "{{ $json.order.saju_data.birthDate }}",
       "birthTime": "{{ $json.order.saju_data.birthTime }}",
       "birthGender": "{{ $json.order.saju_data.birthGender }}",
       "theme": "{{ $json.order.saju_data.theme || 'navy' }}",
       "orientation": "{{ $json.order.saju_data.orientation || 'portrait' }}",
       "mode": "fortune"
     }
     ```

5. **Gmail 발송** (Gmail 노드):
   - To: 주문자 이메일
   - Subject: `[FortuneTab] 2026년 사주 맞춤 플래너가 준비되었습니다`
   - Body: 주문 안내 HTML
   - Attachments: PDF 파일 (filePath에서 읽기)

6. **주문 상태 업데이트** (Code 노드):
   ```javascript
   // Supabase PATCH: status = 'completed'
   await this.helpers.httpRequest({
     method: 'PATCH',
     url: `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
     headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
     body: JSON.stringify({ status: 'completed' }),
   });
   ```

7. **에러 처리** — 실패 시 `status = 'failed'`

**Step 2: n8n에서 워크플로우 export → `workflows/fortunetab-pdf-generator.json`에 저장**

**Step 3: 커밋**

```bash
git add workflows/
git commit -m "feat: add n8n workflow for automatic saju planner PDF generation"
```

---

## Task 9: Gmail SMTP 설정 및 이메일 첨부 연동

**Step 1: Gmail에서 앱 비밀번호 생성**
- Google 계정 → 보안 → 2단계 인증 활성화 → 앱 비밀번호 생성

**Step 2: n8n에서 Gmail Credential 설정**
- n8n → Credentials → New → Gmail (SMTP)
- Email: sbaron680@gmail.com
- App Password: (생성한 앱 비밀번호)

**Step 3: Gmail 노드에서 PDF 파일 첨부**
- n8n의 "Read Binary File" 노드로 PDF 파일 읽기
- Gmail 노드의 Attachments에 바이너리 데이터 연결

---

## Task 10: 전체 통합 테스트

**Step 1: PDF 서비스 실행**
```bash
cd pdf-server && npm run dev
```

**Step 2: 테스트 주문 생성 (Supabase SQL)**
```sql
INSERT INTO orders (user_id, order_number, status, total, saju_data) VALUES (
  '<test-user-id>',
  'FT-TEST-001',
  'pending',
  19000,
  '{"birthDate":"1990-05-15","birthTime":"인시","birthGender":"male","theme":"navy","orientation":"portrait","notes":""}'
);
```

**Step 3: n8n 워크플로우 수동 실행**
- n8n UI에서 워크플로우 "Test" 실행
- 2분 내 주문 감지 → PDF 생성 → 이메일 발송 확인

**Step 4: 확인사항**
- [ ] orders.status가 'completed'로 변경됨
- [ ] 이메일에 PDF 파일이 첨부되어 수신됨
- [ ] PDF 내용이 올바른 사주 데이터를 포함함

---

## 요약

| Task | 내용 | 수정 대상 |
|------|------|----------|
| 1 | Supabase에 saju_data 컬럼 추가 | DB |
| 2 | Checkout에서 saju_data 저장 | orders.ts, checkout/page.tsx, success/page.tsx |
| 3 | pdf-server 프로젝트 초기화 | pdf-server/ |
| 4 | Express 서버 + Puppeteer 생성 API | pdf-server/server.ts, generate.ts |
| 5 | template.html (Canvas 렌더링 환경) | pdf-server/template.html |
| 6 | pdf-generator.ts에 Blob 반환 모드 | src/lib/pdf-generator.ts |
| 7 | esbuild 번들 + 테스트 | pdf-server/ |
| 8 | n8n 워크플로우 생성 | n8n UI |
| 9 | Gmail SMTP 설정 | n8n Credentials |
| 10 | 전체 통합 테스트 | 전체 |
