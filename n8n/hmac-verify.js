/**
 * FortuneTab — n8n Webhook HMAC 검증 Code 노드
 *
 * ◆ 배치
 *   n8n 워크플로의 Webhook 노드 바로 다음에 Code 노드를 추가하고
 *   이 파일 전체를 해당 노드에 붙여넣는다.
 *
 * ◆ 전제: Webhook 노드 설정
 *   - HTTP Method: POST
 *   - Response Mode: "When last node finishes" 또는 "Response Node"
 *   - Options → Raw Body: ON  (payload 재직렬화 드리프트 방지)
 *   - Options → Binary Data: ON
 *   - (필요 시) Options → Allowed Origins: "*"
 *
 * ◆ 서명 규약 (Supabase Edge Function `generate-premium-report` 쪽 코드와 일치)
 *   body = JSON.stringify(payload)            // V8 삽입순서 유지
 *   sig  = HMAC-SHA256(body, WEBHOOK_SHARED_SECRET)
 *   header: X-Webhook-Signature: <hex lowercase>
 *
 * ◆ 환경변수
 *   n8n Settings → Variables 또는 docker compose env에
 *   `WEBHOOK_SHARED_SECRET` 값을 Supabase Secrets와 동일하게 설정.
 *
 * ◆ 출력
 *   검증 성공: 다음 노드로 파싱된 payload 전달 ($json.body가 메인 본문)
 *   검증 실패: throw → n8n workflow 실패 상태 → 401 응답
 */

const crypto = require('crypto');

// ────────────────────────────────────────────────────────────────────────────
// 1. Secret 확보
// ────────────────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET =
  $env.WEBHOOK_SHARED_SECRET ??
  $vars?.WEBHOOK_SHARED_SECRET ??
  '';

if (!WEBHOOK_SECRET) {
  throw new Error(
    'WEBHOOK_SHARED_SECRET 미설정. n8n Settings → Variables 또는 환경변수에 추가 필요.'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 2. 요청 헤더에서 서명 추출
// ────────────────────────────────────────────────────────────────────────────

const input = $input.item.json ?? {};
const headers = input.headers ?? {};

// 헤더 이름 대소문자 혼용 방어
const signature =
  headers['x-webhook-signature'] ??
  headers['X-Webhook-Signature'] ??
  headers['x-webhook-signature'.toLowerCase()] ??
  '';

if (!signature || typeof signature !== 'string') {
  throw new Error('X-Webhook-Signature 헤더 누락 또는 잘못된 형식.');
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Raw body 복원
//    - Webhook 노드에서 Raw Body: ON이면 $input.item.binary.data.data 에 base64가 있음
//    - 미설정 상태면 파싱된 body를 V8 동일 삽입순서로 재직렬화 (fallback)
// ────────────────────────────────────────────────────────────────────────────

let bodyStr;

const binary = $input.item.binary?.data;
if (binary && binary.data) {
  // Raw Body 모드: base64 디코드
  bodyStr = Buffer.from(binary.data, 'base64').toString('utf8');
} else if (typeof input.body === 'string') {
  bodyStr = input.body;
} else if (input.body && typeof input.body === 'object') {
  // 파싱된 객체 → V8 재직렬화 (Edge Function도 V8이므로 key 순서 일치)
  bodyStr = JSON.stringify(input.body);
} else {
  // Webhook body가 최상위에 오는 설정
  bodyStr = JSON.stringify(input);
}

// ────────────────────────────────────────────────────────────────────────────
// 4. HMAC 계산 + timing-safe 비교
// ────────────────────────────────────────────────────────────────────────────

const expected = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(bodyStr, 'utf8')
  .digest('hex');

const a = Buffer.from(signature, 'hex');
const b = Buffer.from(expected, 'hex');

const match = a.length === b.length && crypto.timingSafeEqual(a, b);

if (!match) {
  throw new Error(
    `HMAC 검증 실패. got=${signature.slice(0, 12)}… expected=${expected.slice(0, 12)}… ` +
      `bodyLen=${bodyStr.length}`
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 5. 정상 payload를 다음 노드로 전달
// ────────────────────────────────────────────────────────────────────────────

const payload = typeof input.body === 'object' && input.body !== null
  ? input.body
  : JSON.parse(bodyStr);

// n8n Code 노드 반환 규약
return [{ json: payload }];

/* ─── 테스트 ───────────────────────────────────────────────────────────────
 *
 * 1) 로컬 서명 재현
 *    curl https://cwnzezlgtcqkmnyojhbd.supabase.co/functions/v1/generate-premium-report \
 *      -H "Content-Type: application/json" \
 *      -d '{"order_id":"6ea5f16e-4d53-449b-8679-06c94dff4fed"}'
 *    → Edge Function이 n8n으로 POST (N8N_REPORT_WEBHOOK_URL 필요)
 *
 * 2) 단독 테스트 (Node.js)
 *    node -e '
 *      const c=require("crypto"); const s="테스트시크릿";
 *      const body=JSON.stringify({order_id:"x",order_number:"FT-123"});
 *      console.log(c.createHmac("sha256",s).update(body).digest("hex"));
 *    '
 *    → 위 hex를 X-Webhook-Signature로 curl POST 테스트
 *
 * 예상 오류:
 *   - "WEBHOOK_SHARED_SECRET 미설정"
 *       → n8n Settings → Variables에 WEBHOOK_SHARED_SECRET 추가
 *   - "HMAC 검증 실패"
 *       → Webhook 노드 Raw Body 옵션 OFF 상태에서 body가 재직렬화되어 불일치.
 *         Webhook 노드 → Options → Raw Body: ON 활성화.
 *   - "X-Webhook-Signature 헤더 누락"
 *       → Edge Function `generate-premium-report` 쪽 서명 로직 확인
 *         (WEBHOOK_SECRET 환경변수가 Edge Function에도 설정되어 있는지).
 * ──────────────────────────────────────────────────────────────────────── */
