-- ============================================================
-- Migration 00010: decrement_message_count RPC
-- ============================================================
-- Chat Edge Function에서 Claude 호출 실패 시 사전 증가된 message_count를
-- 롤백하기 위한 보조 함수.
--
-- 정책:
-- - 0 미만으로 내려가지 않음 (GREATEST 가드)
-- - user_id 매칭 필수 (다른 유저 세션 조작 차단)
-- - SECURITY DEFINER: service_role만 호출

CREATE OR REPLACE FUNCTION public.decrement_message_count(
  p_session_id uuid,
  p_user_id uuid,
  p_decrement int DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count int;
BEGIN
  UPDATE public.chat_sessions
  SET message_count = GREATEST(0, message_count - p_decrement)
  WHERE id = p_session_id AND user_id = p_user_id
  RETURNING message_count INTO v_new_count;

  IF v_new_count IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'message_count', v_new_count);
END;
$$;

-- service_role만 호출 (Edge Function에서 사용)
REVOKE ALL ON FUNCTION public.decrement_message_count FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_message_count TO service_role;
