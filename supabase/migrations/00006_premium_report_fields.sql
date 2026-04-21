-- ============================================================================
-- 00006: 프리미엄 사주 리포트 수동 발송 파이프라인 지원
-- ============================================================================
-- Option C 전략: 플래너는 결제 직후 즉시 다운로드, 사주 심층 리포트는 관리자가
--   수동 생성 후 별도 이메일로 발송 (SLA 2주). n8n 워크플로로 진행 상태 추적.
--
-- 1. orders 테이블에 리포트 전용 필드 3개 추가
-- 2. RLS 정책: 본인 주문의 리포트 상태만 조회 가능
-- 3. RPC: 프리미엄 대기 주문 목록 (관리자 전용) — n8n polling용
-- ============================================================================

-- ── 1. 리포트 필드 추가 ─────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS report_status TEXT DEFAULT 'not_applicable'
    CHECK (report_status IN ('not_applicable', 'pending', 'preparing', 'sent', 'skipped')),
  ADD COLUMN IF NOT EXISTS report_file_url TEXT,
  ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS report_admin_memo TEXT;

COMMENT ON COLUMN orders.report_status IS 'not_applicable=리포트 대상 아님, pending=결제 완료 대기, preparing=관리자 작업 중, sent=발송 완료, skipped=발송 취소';
COMMENT ON COLUMN orders.report_file_url IS '관리자가 업로드한 사주 리포트 PDF URL (Supabase Storage)';
COMMENT ON COLUMN orders.report_sent_at IS 'send-report-email Edge Function이 발송 성공 시 기록';
COMMENT ON COLUMN orders.report_admin_memo IS '관리자 내부 메모 (발송 지연 사유 등)';

-- ── 2. 프리미엄 주문 결제 완료 시 자동으로 report_status='pending' 세팅 ──
-- (confirm-payment Edge Function에서 수동으로 UPDATE해도 되지만 DB 트리거로 보장)

CREATE OR REPLACE FUNCTION set_report_status_on_premium_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- 결제 상태가 'paid'로 전환될 때만 동작
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
    -- 해당 주문에 saju-planner-premium 상품이 있는지 확인
    IF EXISTS (
      SELECT 1 FROM order_items
      WHERE order_id = NEW.id
        AND product_id = 'saju-planner-premium'
    ) THEN
      NEW.report_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_report_status ON orders;
CREATE TRIGGER trg_set_report_status
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_report_status_on_premium_paid();

-- ── 3. 관리자용 RPC: 리포트 발송 대기 주문 목록 ─────────────────────────────

CREATE OR REPLACE FUNCTION get_pending_reports_admin()
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  saju_data JSONB,
  report_status TEXT,
  paid_at TIMESTAMPTZ,
  days_since_paid INT,
  admin_memo TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    o.id AS order_id,
    o.order_number,
    o.user_id,
    (SELECT email FROM auth.users WHERE id = o.user_id) AS user_email,
    (SELECT name FROM profiles WHERE id = o.user_id) AS user_name,
    o.saju_data,
    o.report_status,
    o.created_at AS paid_at,
    EXTRACT(DAY FROM (NOW() - o.created_at))::INT AS days_since_paid,
    o.report_admin_memo AS admin_memo
  FROM orders o
  WHERE o.report_status IN ('pending', 'preparing')
    AND o.status IN ('paid', 'completed')
  ORDER BY o.created_at ASC; -- 가장 오래된 주문이 먼저
$$;

-- 관리자만 호출 가능 (app_metadata.role = 'admin' 체크는 호출 측에서)
GRANT EXECUTE ON FUNCTION get_pending_reports_admin() TO authenticated;
