-- Corrects 00015: column-level REVOKE was ineffective because a table-level
-- UPDATE grant to anon/authenticated implicitly includes every column.
-- Postgres rule: column-level REVOKE has no effect while the table-level GRANT remains.
--
-- Correct pattern: revoke the table-level UPDATE, then grant only user-editable
-- columns back to authenticated. anon gets nothing (RLS would block anyway,
-- but GRANT-level denial is defense in depth).

REVOKE UPDATE ON public.profiles FROM anon, authenticated;

GRANT UPDATE (name, birth_date, birth_hour, gender, mode, daun_phase)
  ON public.profiles
  TO authenticated;
