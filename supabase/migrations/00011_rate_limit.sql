-- ============================================================
-- Migration 00011: user_rate_limits — 단순 카운터 기반 레이트 리미터
-- ============================================================
-- 2차 보안 감사 HIGH: chat Edge Function에 분당 요청 제한 없어 Claude 과금
-- 공격(봇팜)이 가능. 인증 계정 하나로 분당 수백 SSE 연결 → 토큰 폭주.
--
-- 정책
-- - 사용자×시간창 단위로 카운터 1개 행. window_start 분 단위 롤업.
-- - check_and_consume RPC가 원자적으로 증가·검사 (SELECT FOR UPDATE 필요 없이
--   INSERT ON CONFLICT ... UPDATE로 단일 쿼리).
-- - 과거 레코드는 cron으로 주기 청소 (분리 마이그레이션 불필요, 행 개수가
--   작아 방치해도 무해).
--
-- 확장: bucket 컬럼으로 서로 다른 엔드포인트(chat, generate 등) 분리 카운팅.

CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket text NOT NULL,          -- 'chat', 'generate' 등
  window_start timestamptz NOT NULL,  -- 분 단위 rounddown
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket, window_start)
);

CREATE INDEX IF NOT EXISTS user_rate_limits_window_idx
  ON public.user_rate_limits(window_start);

ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;
-- 사용자는 자기 카운터만 조회 가능 (UI에서 잔여 요청 표시할 때 사용)
CREATE POLICY "Users can view own rate limits"
  ON public.user_rate_limits FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- RPC: check_and_consume_rate_limit
-- ============================================================
-- 1분 단위 windowed counter.
-- 반환: {ok, count, limit}
-- - ok=false: count가 limit에 도달. 호출 측은 429 반환.
CREATE OR REPLACE FUNCTION public.check_and_consume_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window timestamptz := date_trunc('minute', now());
  v_count int;
BEGIN
  INSERT INTO public.user_rate_limits(user_id, bucket, window_start, count)
  VALUES (p_user_id, p_bucket, v_window, 1)
  ON CONFLICT (user_id, bucket, window_start) DO UPDATE
    SET count = public.user_rate_limits.count + 1
  RETURNING count INTO v_count;

  IF v_count > p_limit THEN
    RETURN jsonb_build_object('ok', false, 'count', v_count, 'limit', p_limit, 'retry_after_sec', 60);
  END IF;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'limit', p_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_consume_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_consume_rate_limit TO service_role;
