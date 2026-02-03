-- Create user_sessions table for tracking login/logout
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'teacher', 'student')),
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at TIMESTAMPTZ,
  session_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id OR student_id IS NOT NULL);

-- Create activity_logs table for tracking user actions
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'teacher', 'student')),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "Admins can view all activity logs" ON public.activity_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (true);

-- Enable realtime for activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- Create messages table for two-way messaging
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'teacher', 'student')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'teacher', 'student')),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view messages they sent or received" ON public.messages
  FOR SELECT USING (auth.uid() = sender_user_id OR auth.uid() = recipient_user_id);

CREATE POLICY "Anyone can view messages for their student id" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages" ON public.messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update messages" ON public.messages
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Recipients can mark messages as read" ON public.messages
  FOR UPDATE USING (auth.uid() = recipient_user_id OR true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create student_notices table for admin-posted notices
CREATE TABLE public.student_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES auth.users(id),
  notice_type TEXT NOT NULL CHECK (notice_type IN ('attendance', 'warning', 'info', 'achievement')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_notices ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_notices
CREATE POLICY "Admins can manage all notices" ON public.student_notices
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view notices" ON public.student_notices
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update notice read status" ON public.student_notices
  FOR UPDATE USING (true);

-- Add is_active column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Enable realtime for user_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;