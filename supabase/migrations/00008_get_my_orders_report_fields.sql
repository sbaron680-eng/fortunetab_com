-- ============================================================================
-- Migration 00008: get_my_orders RPC 재정의 (report_* 필드 포함)
-- ============================================================================
-- 문제: 기존 RPC(MCP로 생성됨)가 report_status, report_file_url, report_sent_at을
--       반환하지 않아 대시보드에서 프리미엄 리포트 섹션이 전혀 렌더링되지 않음.
--       또 items에 product_id가 없어 클라이언트에서 티어 판별이 어려웠음.
--
-- 수정: RPC를 명시적으로 재정의 — 모든 관련 필드 포함, items.product_id 추가.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_orders()
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  status TEXT,
  total INT,
  file_url TEXT,
  access_token UUID,
  download_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  saju_data JSONB,
  items JSONB,
  report_status TEXT,
  report_file_url TEXT,
  report_sent_at TIMESTAMPTZ,
  report_admin_memo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.status,
    o.total,
    o.file_url,
    o.access_token,
    o.download_opened_at,
    o.created_at,
    o.saju_data,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'product_id',   oi.product_id,
          'product_name', oi.product_name,
          'price',        oi.price,
          'qty',          oi.qty
        ))
        FROM public.order_items oi
        WHERE oi.order_id = o.id
      ),
      '[]'::jsonb
    ) AS items,
    o.report_status,
    o.report_file_url,
    o.report_sent_at,
    o.report_admin_memo
  FROM public.orders o
  WHERE o.user_id = auth.uid()
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;

-- ============================================================================
-- 00006 trigger 재확인: pending → paid 전환 시 saju-planner-premium 상품이면
-- report_status='pending' 자동 세팅. 만약 기존 주문에 이 trigger가 돌지 않아
-- report_status가 NULL인 경우 일회성 backfill:
-- ============================================================================

UPDATE public.orders o
SET report_status = 'pending'
WHERE (o.report_status IS NULL OR o.report_status = 'not_applicable')
  AND o.status IN ('paid', 'completed')
  AND EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = o.id
      AND oi.product_id = 'saju-planner-premium'
  );
