import express from 'express';
import { generatePDF } from './generate.js';

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

const PORT = process.env.PDF_SERVER_PORT || 4001;
app.listen(PORT, () => {
  console.log(`\n🖨️  PDF 서비스 실행 중: http://localhost:${PORT}`);
  console.log('   POST /generate — PDF 생성');
  console.log('   GET  /health   — 상태 확인\n');
});
