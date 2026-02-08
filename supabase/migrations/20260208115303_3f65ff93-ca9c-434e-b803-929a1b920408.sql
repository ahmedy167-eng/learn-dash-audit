
-- ==============================================
-- FIX 1: Harden messages table policies with TO authenticated
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can update messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can mark their received messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;

-- Recreate with explicit TO authenticated
CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Users can view messages they sent or received"
  ON public.messages FOR SELECT TO authenticated
  USING ((auth.uid() = sender_user_id) OR (auth.uid() = recipient_user_id));

CREATE POLICY "Users can mark their received messages as read"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_user_id);

-- ==============================================
-- FIX 2: Create safe view for user_sessions excluding session_token
-- ==============================================

CREATE VIEW public.user_sessions_safe
WITH (security_invoker = on) AS
  SELECT 
    id,
    user_id,
    student_id,
    user_type,
    login_at,
    logout_at,
    is_active,
    session_duration_minutes,
    expires_at,
    created_at
  FROM public.user_sessions;
  -- Intentionally excludes session_token
