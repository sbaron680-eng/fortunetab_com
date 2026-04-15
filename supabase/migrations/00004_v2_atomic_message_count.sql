-- ============================================================
-- Migration 00004: Atomic Message Count Increment
-- ============================================================
--
-- message_count를 원자적으로 증가시키고 한도를 동시에 체크합니다.
-- TOCTOU 레이스 조건 방지: SELECT FOR UPDATE로 행 잠금 후 비교/갱신.
--
-- 반환값:
--   ok: true/false
--   message_count: 갱신된 카운트
--   max_messages: 현재 한도
--   needs_extension: true이면 클라이언트가 크레딧 결제 후 extend 호출 필요

CREATE OR REPLACE FUNCTION public.increment_message_count(
  p_session_id uuid,
  p_user_id uuid,
  p_increment int DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_count int;
  v_max_messages int;
  v_new_count int;
  v_status text;
BEGIN
  -- 행 잠금으로 동시성 안전 보장
  SELECT message_count, max_messages, status
  INTO v_message_count, v_max_messages, v_status
  FROM public.chat_sessions
  WHERE id = p_session_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_message_count IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  IF v_status != 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_active');
  END IF;

  -- 한도 체크: 현재 카운트 + 1(유저 메시지) > max이면 확장 필요
  IF v_message_count + 1 > v_max_messages THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'needs_extension',
      'message_count', v_message_count,
      'max_messages', v_max_messages,
      'needs_extension', true
    );
  END IF;

  -- 원자적 증가
  v_new_count := v_message_count + p_increment;
  UPDATE public.chat_sessions
  SET message_count = v_new_count,
      last_message_at = now()
  WHERE id = p_session_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'message_count', v_new_count,
    'max_messages', v_max_messages
  );
END;
$$;

-- extend_session_messages: 크레딧 결제 후 max_messages 확장 (원자적)
CREATE OR REPLACE FUNCTION public.extend_session_messages(
  p_session_id uuid,
  p_user_id uuid,
  p_extra_messages int,
  p_extra_cost int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_max int;
  v_new_spent int;
BEGIN
  UPDATE public.chat_sessions
  SET max_messages = max_messages + p_extra_messages,
      credits_spent = credits_spent + p_extra_cost
  WHERE id = p_session_id AND user_id = p_user_id
  RETURNING max_messages, credits_spent INTO v_new_max, v_new_spent;

  IF v_new_max IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'max_messages', v_new_max,
    'credits_spent', v_new_spent
  );
END;
$$;
