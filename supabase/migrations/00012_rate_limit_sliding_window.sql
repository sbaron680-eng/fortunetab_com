-- ============================================================
-- Migration 00012: check_and_consume_rate_limit → sliding window
-- ============================================================
-- 3차 보안 감사 HIGH: 기존 fixed window(date_trunc('minute'))는 분 경계에서
-- 상한의 2배까지 허용(59초에 N회 + 00초에 N회). Claude 과금 공격을 절반만 차단.
--
-- 수정: 직전 60초 동안 다른 모든 window의 count를 합산한 값으로 판단.
-- - 카운터는 여전히 분 단위 버킷에 저장 (DB 행 폭발 방지)
-- - 검사는 "지금부터 60초 이전 이후의 모든 버킷 합"으로
-- - 경계 시간대(12:00:00)에 있을 때 11:59·12:00 두 버킷 모두 합산
--
-- 부작용: 평균 2개 버킷 스캔 (인덱스 (user_id, bucket, window_start)로 빠름).
-- 과거 버킷은 사용자별·bucket별로만 증가하므로 cron 청소는 선택적.

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
  v_now timestamptz := now();
  v_window timestamptz := date_trunc('minute', v_now);
  v_since timestamptz := v_now - interval '60 seconds';
  v_prior_count int;
  v_after_count int;
BEGIN
  -- 1) 지금 기준 직전 60초 구간에 해당하는 버킷들의 합산
  --    (현재 window 외에 직전 window도 포함될 수 있음)
  SELECT COALESCE(SUM(count), 0) INTO v_prior_count
  FROM public.user_rate_limits
  WHERE user_id = p_user_id
    AND bucket = p_bucket
    AND window_start >= date_trunc('minute', v_since);

  IF v_prior_count >= p_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'count', v_prior_count,
      'limit', p_limit,
      'retry_after_sec', 60
    );
  END IF;

  -- 2) 현재 window에 +1 (원자적 upsert)
  INSERT INTO public.user_rate_limits(user_id, bucket, window_start, count)
  VALUES (p_user_id, p_bucket, v_window, 1)
  ON CONFLICT (user_id, bucket, window_start) DO UPDATE
    SET count = public.user_rate_limits.count + 1
  RETURNING count INTO v_after_count;

  RETURN jsonb_build_object(
    'ok', true,
    'count', v_prior_count + 1,
    'limit', p_limit
  );
END;
$$;

-- 권한 재확인
REVOKE ALL ON FUNCTION public.check_and_consume_rate_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_consume_rate_limit FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_and_consume_rate_limit TO service_role;
