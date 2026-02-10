-- Revoke anon access to user_sessions_safe view
REVOKE ALL ON public.user_sessions_safe FROM anon;

-- Ensure authenticated users can still access it
GRANT SELECT ON public.user_sessions_safe TO authenticated;