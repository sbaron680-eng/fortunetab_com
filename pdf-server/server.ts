import dotenv from 'dotenv';
import { fileURLToPath as toPath } from 'url';
import { dirname, join } from 'path';
dotenv.config({ path: join(dirname(toPath(import.meta.url)), '.env') });
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generatePDF } from './generate.js';
import { handleFortune, type FortuneRequest } from './fortune.js';
import { handleRenderReport, handleReportHealth } from './reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// 기본 express.json() 은 100kb 제한 — 심층 리포트 페이로드는 5개 섹션 JSON 합쳐 100kb 초과 가능
app.use(express.json({ limit: '2mb' }));
app.use(cors({ origin: ['http://localhost:3000', 'https://fortunetab.com'] }));

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
    res.status(400).json({ error: 'orderId, birthDate는 필수입니다.' });
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

// n8n에서 생성된 PDF를 바이너리로 다운로드
app.get('/download/:fileName', (req, res) => {
  const fileName = path.basename(req.params.fileName); // path traversal 방지
  const filePath = path.join(__dirname, 'output', fileName);
  res.download(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }
  });
});

// ── 심층 리포트 렌더 (Phase 2: n8n → Claude 5섹션 JSON → PDF) ──
app.get('/reports/health', handleReportHealth);
app.post('/reports/render', handleRenderReport);

// ── 심층 리포트 정적 서빙 (Cloudflare Tunnel → reports.fortunetab.com/r/:id.pdf) ──
//
// 설계 원칙:
//   - n8n이 /volume1/docker/fortunetab/reports/{uuid}.pdf 에 저장한 파일을 돌려준다.
//     (이 컨테이너 관점에서는 REPORT_DIR 볼륨 마운트 = /reports)
//   - 이메일로 전달되는 링크이므로 URL 유출 전제. UUID v4는 122 bits 엔트로피라 무차별대입 불가능.
//   - 32일 후 NAS 크론으로 파일 삭제 → 404. 서명 URL까지는 오버킬.
//
// 보안 관점:
//   - path traversal (../, 절대경로, NULL byte)
//   - 확장자 위조 (.pdf.exe, .pdf/foo 등)
//   - 심볼릭 링크로 REPORT_DIR 밖 파일 탈취
//   - 디렉토리 리스팅 차단
//   - 존재 여부 노출 최소화 (타이밍/메시지)
//
// 테스트법:
//   - 정상: curl -I http://localhost:4001/r/6ea5f16e-4d53-449b-8679-06c94dff4fed.pdf → 200 application/pdf
//   - 형식 위반: curl -I http://localhost:4001/r/not-uuid.pdf → 404
//   - traversal: curl -I http://localhost:4001/r/..%2F..%2Fetc%2Fpasswd.pdf → 404
//
// 예상 오류:
//   1) REPORT_DIR 마운트 누락 → ENOENT (compose.yml에 /volume1/docker/fortunetab/reports 바인드 확인)
//   2) 한글 파일명 깨짐 → 현재 UUID만 허용하므로 불가능
//   3) Content-Disposition 없으면 브라우저가 인라인 표시 vs 다운로드 — 이메일 UX는 다운로드 선호
const REPORT_DIR = process.env.REPORT_DIR || '/reports';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Capability URL 패턴: <order_id>_<access_token>. 2026-04-23 보안 하드닝.
// 엄격한 UUID v4 검증으로 path traversal·임의 필명 차단.
// 구주문(~2026-04-22) 파일은 <order_id>.pdf 형식이라 32일 만료 전까지 이전 패턴도 유지.
const UUID_V4_WITH_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

app.get('/r/:id.pdf', (req, res) => {
  const id = req.params.id;

  if (!UUID_V4.test(id) && !UUID_V4_WITH_TOKEN.test(id)) { res.status(404).end(); return; }

  const baseDir = path.resolve(REPORT_DIR);
  const filePath = path.resolve(baseDir, `${id}.pdf`);
  if (!filePath.startsWith(baseDir + path.sep)) { res.status(404).end(); return; }

  try {
    const st = fs.lstatSync(filePath);
    if (!st.isFile() || st.isSymbolicLink()) { res.status(404).end(); return; }
  } catch { res.status(404).end(); return; }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="fortunetab_report_${id}.pdf"`);
  // no-store: capability URL — 공유 기기 히스토리·디스크 캐시로 유출되지 않도록 브라우저 캐시도 차단
  res.setHeader('Cache-Control', 'private, no-store');
  // no-referrer: PDF 내 링크 클릭 시 Referer 헤더로 capability URL이 제3자 로그에 유출되는 것을 막음
  res.setHeader('Referrer-Policy', 'no-referrer');
  // nosniff: 레거시 PDF 뷰어가 콘텐츠 타입을 재추론해 XSS로 활용되는 것을 차단
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});

// ── 토스페이먼츠 결제 승인 API ────────────────────────────────────
app.post('/payments/confirm', async (req, res) => {
  try {
    const { paymentKey, orderId, amount, paymentType } = req.body;
    if (!paymentKey || !orderId || !amount) {
      res.status(400).json({ ok: false, error: 'paymentKey, orderId, amount는 필수입니다.' });
      return;
    }

    // PayPal은 별도 MID의 시크릿키 사용
    const secretKey = paymentType === 'PAYPAL'
      ? process.env.TOSS_PAYPAL_SECRET_KEY
      : process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      const keyName = paymentType === 'PAYPAL' ? 'TOSS_PAYPAL_SECRET_KEY' : 'TOSS_SECRET_KEY';
      res.status(500).json({ ok: false, error: `${keyName}가 설정되지 않았습니다.` });
      return;
    }

    // 토스페이먼츠 결제 승인 API 호출
    const encoded = Buffer.from(`${secretKey}:`).toString('base64');
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await tossRes.json();

    if (!tossRes.ok) {
      console.error('[Payment] 승인 실패:', data);
      res.status(tossRes.status).json({
        ok: false,
        error: data.message || '결제 승인에 실패했습니다.',
        code: data.code,
      });
      return;
    }

    console.log(`[Payment] 승인 성공: ${orderId} (${paymentType === 'PAYPAL' ? `$${amount}` : `${amount}원`})`);
    res.json({ ok: true, data });
  } catch (err: any) {
    console.error('[Payment] 오류:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Fortune API (Claude 운세 분석) ──────────────────────────────
app.post('/fortune', async (req, res) => {
  try {
    const { type, input } = req.body as FortuneRequest;
    if (!type || !input) {
      res.status(400).json({ ok: false, error: 'type과 input은 필수입니다.' });
      return;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
      return;
    }
    console.log(`[Fortune] ${type} 분석 시작...`);
    const result = await handleFortune({ type, input });
    console.log(`[Fortune] ${type} 분석 완료`);
    res.json({ ok: true, data: result });
  } catch (err: any) {
    console.error('[Fortune] 오류:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PDF_SERVER_PORT || 4001;
const HOST = process.env.PDF_SERVER_HOST || '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`\n🖨️  FortuneTab 서비스: http://${HOST}:${PORT}`);
  console.log('   POST /generate  — PDF 생성');
  console.log('   POST /fortune   — AI 운세 분석');
  console.log('   GET  /health    — 상태 확인\n');
});
