-- Block anonymous access to profiles explicitly
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Ensure anon role has no privileges on sensitive views
REVOKE ALL ON public.teacher_public_info FROM anon, PUBLIC;
REVOKE ALL ON public.user_sessions_safe FROM anon, PUBLIC;
REVOKE ALL ON public.profiles FROM anon, PUBLIC;

GRANT SELECT ON public.teacher_public_info TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO authenticated;