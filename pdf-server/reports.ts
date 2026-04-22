/**
 * FortuneTab 심층 리포트 렌더 라우트 (Node.js + Puppeteer + Nunjucks)
 *
 * ◆ 계약 (n8n → pdf-server)
 *   POST /reports/render
 *   Body: {
 *     order_id, order_number,
 *     user: {name, gender, birth_date, birth_time},
 *     meta: {current_year, issued_at},
 *     saju_core, annual_outlook, monthly_seun, action_guide, insight_highlight
 *   }
 *   Response: application/pdf (binary)
 *   인증: X-Render-Secret (REPORT_RENDER_SECRET env가 설정된 경우)
 *
 * ◆ 내부 파이프라인
 *   1. Nunjucks로 templates/report.html.njk 렌더
 *   2. Puppeteer headless Chromium → PDF (A4 portrait, print backgrounds)
 *   3. Buffer 반환
 *
 * ◆ Dockerfile.pdf-server 에 필요한 것 (이미 존재)
 *   - chromium, fonts-noto-cjk, fonts-noto-cjk-extra
 *   - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true + PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
 *
 * ◆ 테스트
 *   curl -X POST http://localhost:4001/reports/render \
 *     -H "Content-Type: application/json" \
 *     -d @test-payload.json --output out.pdf
 *
 * ◆ 예상 오류
 *   1. "Template not found" → templates/report.html.njk 경로 확인
 *   2. "Failed to launch Chromium" → PUPPETEER_EXECUTABLE_PATH 확인
 *   3. 한글 깨짐 → 폰트 설치 확인: fc-list | grep -i noto
 */

import type { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import nunjucks from 'nunjucks';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, 'templates');

// Nunjucks 환경 — autoescape 활성 (XSS 방지), Jinja2 호환 태그
const env = nunjucks.configure(TEMPLATE_DIR, {
  autoescape: true,
  throwOnUndefined: false,
  trimBlocks: true,
  lstripBlocks: true,
});

const RENDER_SHARED_SECRET = process.env.REPORT_RENDER_SECRET || '';

// ─── 페이로드 타입 ─────────────────────────────────────────────────────────
export interface RenderPayload {
  order_id: string;
  order_number: string;
  user: {
    name: string;
    gender: 'male' | 'female';
    birth_date: string;
    birth_time: string;
  };
  meta: {
    current_year: number;
    issued_at: string;
  };
  saju_core: Record<string, unknown>;
  annual_outlook: Record<string, unknown>;
  monthly_seun: Record<string, unknown>;
  action_guide: Record<string, unknown>;
  insight_highlight: Record<string, unknown>;
}

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const p = body as Partial<RenderPayload>;
  const required: (keyof RenderPayload)[] = [
    'order_id', 'order_number', 'user', 'meta',
    'saju_core', 'annual_outlook', 'monthly_seun', 'action_guide', 'insight_highlight',
  ];
  for (const k of required) {
    if (!(k in p)) return `missing field: ${k}`;
  }
  if (!p.user?.birth_date) return 'user.birth_date is required';
  return null;
}

// ─── 렌더 엔진 (단위 테스트 분리용) ─────────────────────────────────────────
export function renderHtml(payload: RenderPayload): string {
  return env.render('report.html.njk', payload as unknown as object);
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: false,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── Express 핸들러 ─────────────────────────────────────────────────────────
export async function handleRenderReport(req: Request, res: Response): Promise<void> {
  // 공유 비밀 검증 (설정된 경우만)
  if (RENDER_SHARED_SECRET) {
    const got = req.header('x-render-secret') || req.header('X-Render-Secret');
    if (got !== RENDER_SHARED_SECRET) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  }

  const err = validate(req.body);
  if (err) {
    res.status(400).json({ error: err });
    return;
  }

  const payload = req.body as RenderPayload;
  console.log(`[render-report] start | order=${payload.order_number} user=${payload.user.name}`);

  let html: string;
  try {
    html = renderHtml(payload);
  } catch (e) {
    console.error('[render-report] template render failed:', e);
    res.status(400).json({ error: `template render failed: ${(e as Error).message}` });
    return;
  }

  let pdf: Buffer;
  try {
    pdf = await htmlToPdf(html);
  } catch (e) {
    console.error('[render-report] pdf conversion failed:', e);
    res.status(500).json({ error: `pdf conversion failed: ${(e as Error).message}` });
    return;
  }

  const filename = `fortunetab_report_${payload.order_number}.pdf`;
  console.log(`[render-report] done | order=${payload.order_number} bytes=${pdf.length}`);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Report-Order', payload.order_number);
  res.send(pdf);
}

// 헬스: 템플릿 로딩 + Chromium 경로 확인 (Puppeteer 기동 없이)
export function handleReportHealth(_req: Request, res: Response): void {
  const tplPath = path.join(TEMPLATE_DIR, 'report.html.njk');
  const templateExists = fs.existsSync(tplPath);
  const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';
  const chromiumExists = chromiumPath ? fs.existsSync(chromiumPath) : false;

  res.json({
    status: (templateExists && chromiumExists) ? 'ok' : 'degraded',
    template_found: templateExists,
    template_path: tplPath,
    chromium_path: chromiumPath,
    chromium_exists: chromiumExists,
    shared_secret_set: !!RENDER_SHARED_SECRET,
  });
}
