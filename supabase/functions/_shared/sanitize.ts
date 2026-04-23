// ============================================================
// fortune_snapshot sanitize — Edge Function + Vitest 공유 가능한 순수 함수
// ============================================================
// 2차/3차 보안 감사 대응으로 chat/index.ts에 인라인 정의돼 있던 함수를 추출.
// 외부 의존 없이 독립 실행 가능하므로 Deno/Node 양쪽에서 import 가능.
//
// 정책 (3차 감사 H2 반영):
// 1. NFKC 정규화 — smart quote·combining character 등 유사 문자 통합
// 2. Unicode 범용 category \p{Cc,Cf,Zl,Zp} + ASCII 백틱·따옴표·백슬래시 제거
//    - Cc: control (tab, NUL, CR, LF 등)
//    - Cf: format (ZWJ, BiDi marks)
//    - Zl: line separator (U+2028)
//    - Zp: paragraph separator (U+2029)
// 3. 허용 8개 키만 whitelist로 발췌 — 입력에 임의 키가 있어도 무시
//
// 이 설계는 prompt injection 방어가 목적. 사용자 입력이 아닌 서버가 계산한
// fortune_snapshot을 다루지만, 관리자 UI나 미래 경로에서 임의 텍스트가 흘러들
// 가능성에 대비.

export interface FortuneSnapshotLike {
  fortuneScore?: number | string | null;
  grade?: string | null;
  dayElem?: string | null;
  yongsin?: string | null;
  daunPhase?: string | null;
  sunSign?: string | null;
  moonSign?: string | null;
  risingSign?: string | null;
  [key: string]: unknown;
}

function safeField(v: unknown, maxLen = 30): string {
  if (v === null || v === undefined) return '';
  const raw = typeof v === 'number' ? String(v) : String(v ?? '');
  return raw
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}`"'\\]/gu, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * fortune_snapshot 객체를 안전한 키-값 리스트 문자열로 변환.
 *
 * @param snapshot jsonb 컬럼에서 읽은 임의 객체
 * @returns system prompt에 삽입 안전한 멀티라인 문자열
 */
export function sanitizeFortuneSnapshot(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== 'object') return '(운세 스냅샷 없음)';
  const s = snapshot as FortuneSnapshotLike;

  const entries: Array<[string, string]> = [
    ['fortuneScore', safeField(s.fortuneScore, 10)],
    ['grade',        safeField(s.grade, 20)],
    ['dayElem',      safeField(s.dayElem, 10)],
    ['yongsin',      safeField(s.yongsin, 10)],
    ['daunPhase',    safeField(s.daunPhase, 20)],
    ['sunSign',      safeField(s.sunSign, 20)],
    ['moonSign',     safeField(s.moonSign, 20)],
    ['risingSign',   safeField(s.risingSign, 20)],
  ];
  const lines = entries.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`);
  return lines.length > 0 ? lines.join('\n') : '(운세 스냅샷 없음)';
}
