
-- Fix 1: Add explicit deny-all RLS policies to login_rate_limits
-- This table is only accessed by edge functions via service role (which bypasses RLS).
-- These policies make the deny-all intent explicit and prevent any client-side access.

CREATE POLICY "Deny all select on login_rate_limits"
  ON public.login_rate_limits
  FOR SELECT
  TO authenticated, anon
  USING (false);

CREATE POLICY "Deny all insert on login_rate_limits"
  ON public.login_rate_limits
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Deny all update on login_rate_limits"
  ON public.login_rate_limits
  FOR UPDATE
  TO authenticated, anon
  USING (false);

CREATE POLICY "Deny all delete on login_rate_limits"
  ON public.login_rate_limits
  FOR DELETE
  TO authenticated, anon
  USING (false);

-- Fix 2: Restrict teacher_public_info view access
-- This is a VIEW (not a table), so RLS cannot be applied.
-- Security is enforced via GRANT permissions instead.
-- Revoke all access from anon role; only authenticated users can query it.

REVOKE ALL ON public.teacher_public_info FROM anon;
GRANT SELECT ON public.teacher_public_info TO authenticated;
