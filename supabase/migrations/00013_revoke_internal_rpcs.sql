-- ============================================================
-- Migration 00013: 내부 RPC 권한 정리 — authenticated/anon 차단
-- ============================================================
-- 3차 보안 감사 MED: 내부 전용 RPC가 authenticated/anon에 암묵 노출된 상태면
-- 사용자가 PostgREST /rpc/ 경로로 직접 호출해 자기 쿼터를 임의 증가시키는 등
-- DoS/권한 우회 창구가 됨.
--
-- 4개 내부 RPC(increment_message_count, extend_session_messages, spend_credits,
-- add_credits)에 REVOKE EXECUTE FROM authenticated, anon 적용.
--
-- 주의: CREATE OR REPLACE FUNCTION은 ACL을 유지하지 않으므로, 이 마이그레이션이
-- 00002/00004 이후에 순서대로 실행돼야 함 (prefix 숫자로 보장).

REVOKE ALL ON FUNCTION public.increment_message_count(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_message_count(uuid, uuid, integer) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_message_count(uuid, uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.extend_session_messages(uuid, uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extend_session_messages(uuid, uuid, integer, integer) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.extend_session_messages(uuid, uuid, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.spend_credits(uuid, integer, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spend_credits(uuid, integer, text, uuid, text) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.add_credits(uuid, integer, text, uuid, text, timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_credits(uuid, integer, text, uuid, text, timestamp with time zone) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, uuid, text, timestamp with time zone) TO service_role;

-- decrement_message_count: 00010에서 REVOKE했지만 마이그레이션 재적용 시 ACL
-- 리셋될 수 있어 여기에도 중복 적용(멱등성).
REVOKE ALL ON FUNCTION public.decrement_message_count(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_message_count(uuid, uuid, integer) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.decrement_message_count(uuid, uuid, integer) TO service_role;

-- 참고: check_and_consume_rate_limit(00011/00012)는 각자 마이그레이션에서 처리됨.
-- get_my_orders / get_pending_reports_admin은 authenticated가 호출해야 하므로 제외.
