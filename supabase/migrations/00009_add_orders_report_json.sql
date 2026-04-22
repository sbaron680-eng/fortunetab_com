-- ============================================================================
-- Migration 00009: orders.report_json JSONB 컬럼 추가
-- ============================================================================
-- 목적: n8n 파이프라인이 Claude로 생성한 5개 섹션(사주코어/연간/월별/행동가이드/
--       하이라이트) JSON을 DB에 영구 저장. 이후 재발송/재렌더 시 Claude 재호출 없이
--       기존 JSON으로 HTML→PDF만 다시 생성할 수 있게 한다.
--
-- 스키마:
--   report_json JSONB NULL
--     { saju_core: {...}, annual_outlook: {...}, monthly_seun: {...},
--       action_guide: {...}, insight_highlight: {...}, meta: {...} }
--
-- 주의: orders RLS는 user_id 기반 SELECT 제한이 이미 있음. report_json은 추가 노출
--       없이 server-side(service_role)만 읽는다. get_my_orders RPC에는 포함하지 않음.
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS report_json JSONB;

COMMENT ON COLUMN public.orders.report_json IS
  'Claude가 생성한 심층 리포트 섹션 JSON. n8n 재발송/재렌더 용도. client(RPC) 미노출.';
