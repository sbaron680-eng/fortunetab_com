-- ============================================================
-- Migration 00013: 내부 RPC 권한 정리 — authenticated/anon 차단
-- ============================================================
-- 3차 보안 감사 MED: increment_message_count 등 내부 전용 RPC가 기본 authenticated
-- 역할에게 노출된 상태라면, 사용자가 PostgREST `/rpc/increment_message_count`로
-- 자기 세션 message_count를 임의로 늘려 쿼터 DoS 가능.
--
-- 이 마이그레이션은 모든 내부 RPC에 REVOKE EXECUTE FROM authenticated, anon을
-- 명시적으로 적용 (이미 적용된 경우 idempotent).

REVOKE ALL ON FUNCTION public.increment_message_count(uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_message_count(uuid, uuid, int) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_message_count(uuid, uuid, int) TO service_role;

REVOKE ALL ON FUNCTION public.extend_session_messages(uuid, uuid, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extend_session_messages(uuid, uuid, int, int) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.extend_session_messages(uuid, uuid, int, int) TO service_role;

REVOKE ALL ON FUNCTION public.spend_credits(uuid, int, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spend_credits(uuid, int, text, uuid, text) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, int, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.add_credits(uuid, int, text, uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_credits(uuid, int, text, uuid, text, timestamptz) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, int, text, uuid, text, timestamptz) TO service_role;

-- get_my_orders / get_pending_reports_admin은 authenticated가 호출해야 하므로
-- 기존 GRANT TO authenticated 유지 (SECURITY DEFINER 내부에서 auth.uid() 검증).
