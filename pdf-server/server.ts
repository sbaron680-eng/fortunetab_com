import dotenv from 'dotenv';
import { fileURLToPath as toPath } from 'url';
import { dirname, join } from 'path';
dotenv.config({ path: join(dirname(toPath(import.meta.url)), '.env') });
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePDF } from './generate.js';
import { handleFortune, type FortuneRequest } from './fortune.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
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

// ── 토스페이먼츠 결제 승인 API ────────────────────────────────────
app.post('/payments/confirm', async (req, res) => {
  try {
    const { paymentKey, orderId, amount } = req.body;
    if (!paymentKey || !orderId || !amount) {
      res.status(400).json({ ok: false, error: 'paymentKey, orderId, amount는 필수입니다.' });
      return;
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      res.status(500).json({ ok: false, error: 'TOSS_SECRET_KEY가 설정되지 않았습니다.' });
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

    console.log(`[Payment] 승인 성공: ${orderId} (${amount}원)`);
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
