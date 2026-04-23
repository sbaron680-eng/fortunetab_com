-- CRITICAL fix: prevent privilege escalation via direct UPDATE on profiles.is_admin
-- Context: RLS policy "본인 프로필 수정" (auth.uid() = id) validates row ownership but
-- does NOT restrict which columns the user may modify. Column-level GRANT to anon and
-- authenticated included is_admin, id, created_at, and birth_data_expires_at, any of
-- which an attacker could set via supabase.from('profiles').update({...}).
--
-- Admin toggle goes through set_admin_status() SECURITY DEFINER RPC, so REVOKE does not
-- break any legitimate flow (verified: zero client-side .update({is_admin}) call sites).

REVOKE UPDATE (is_admin, id, created_at, birth_data_expires_at)
  ON public.profiles
  FROM anon, authenticated;

COMMENT ON COLUMN public.profiles.is_admin IS
  'Admin flag. Writable only via set_admin_status() RPC (SECURITY DEFINER). Direct UPDATE denied at GRANT level.';
