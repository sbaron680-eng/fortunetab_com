import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  const fileName = `${input.orderId}_fortunetab_2026_saju_planner_${input.theme}.pdf`;
  const outputPath = path.join(outputDir, fileName);

  console.log(`[PDF] 생성 시작: ${input.orderId} (${input.name})`);
  const startTime = Date.now();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    const templatePath = path.join(__dirname, 'template.html');
    await page.goto(`file://${templatePath.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // 폰트 로드 대기
    await page.evaluate(() => document.fonts.ready);

    // PDF 생성 실행
    const pdfBase64: string = await page.evaluate(async (opts: any) => {
      // template.html에 정의된 함수
      return await (window as any).generateAndReturnPDF(opts);
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
    fs.writeFileSync(outputPath, pdfBuffer);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const sizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(1);
    console.log(`[PDF] 생성 완료: ${outputPath} (${sizeMB}MB, ${elapsed}s)`);

    return { filePath: outputPath, fileName };
  } finally {
    await browser.close();
  }
}
