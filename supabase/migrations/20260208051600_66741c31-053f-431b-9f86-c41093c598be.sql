
-- =============================================
-- FIX: Restrict all policies on profiles, students, and messages 
-- to authenticated role only (defense-in-depth)
-- =============================================

-- ========== PROFILES TABLE ==========
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with TO authenticated
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ========== STUDENTS TABLE ==========
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
DROP POLICY IF EXISTS "Users can view their own students" ON public.students;
DROP POLICY IF EXISTS "Users can insert their own students" ON public.students;
DROP POLICY IF EXISTS "Users can update their own students" ON public.students;
DROP POLICY IF EXISTS "Users can delete their own students" ON public.students;

CREATE POLICY "Admins can view all students"
  ON public.students FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own students"
  ON public.students FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) AND has_permission(auth.uid(), 'students'::text));

CREATE POLICY "Users can insert their own students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND has_permission(auth.uid(), 'students'::text));

CREATE POLICY "Users can update their own students"
  ON public.students FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) AND has_permission(auth.uid(), 'students'::text));

CREATE POLICY "Users can delete their own students"
  ON public.students FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id) AND has_permission(auth.uid(), 'students'::text));

-- ========== MESSAGES TABLE ==========
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Teachers can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can update messages" ON public.messages;
DROP POLICY IF EXISTS "Users can mark their received messages as read" ON public.messages;

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view messages they sent or received"
  ON public.messages FOR SELECT
  TO authenticated
  USING ((auth.uid() = sender_user_id) OR (auth.uid() = recipient_user_id));

CREATE POLICY "Authenticated users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Admins can update messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can mark their received messages as read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_user_id);
