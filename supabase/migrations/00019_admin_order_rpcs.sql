-- 00019_admin_order_rpcs.sql
-- S1-2: Move admin order mutations off the anon client onto SECURITY DEFINER RPCs.
-- Defense-in-depth: even if RLS is misconfigured the RPC refuses non-admin callers.

CREATE OR REPLACE FUNCTION public.admin_set_order_file_url(
  p_order_id uuid,
  p_file_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_file_url IS NULL OR length(btrim(p_file_url)) = 0 THEN
    RAISE EXCEPTION 'INVALID_FILE_URL' USING ERRCODE = '22023';
  END IF;

  UPDATE public.orders
  SET file_url = p_file_url,
      status = 'completed'
  WHERE id = p_order_id;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_order_file_url(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_order_file_url(uuid, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('pending','paid','processing','completed','cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = '22023';
  END IF;

  UPDATE public.orders
  SET status = p_status
  WHERE id = p_order_id;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_update_order_memo(
  p_order_id uuid,
  p_memo text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
  SET admin_memo = p_memo
  WHERE id = p_order_id;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_memo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_memo(uuid, text) TO authenticated;
