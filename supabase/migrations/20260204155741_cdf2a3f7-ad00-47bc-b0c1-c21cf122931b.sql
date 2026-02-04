-- Add session_token and expires_at columns to user_sessions for secure student sessions
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS session_token text,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Create index for fast session token lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token) WHERE session_token IS NOT NULL;

-- Remove public read access from students table (was needed for client-side login)
DROP POLICY IF EXISTS "Allow public read for student login" ON public.students;

-- Students table: Only teachers can access their own students, admins can see all
-- No public access needed anymore since login goes through edge function

-- Remove public access policies from student-related tables
DROP POLICY IF EXISTS "Anyone can view notices" ON public.student_notices;
DROP POLICY IF EXISTS "Anyone can update notice read status" ON public.student_notices;

-- Remove overly permissive policies from messages
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;

-- Remove public access from CA submissions
DROP POLICY IF EXISTS "Students can view own submissions" ON public.ca_submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.ca_submissions;
DROP POLICY IF EXISTS "Students can submit their own work" ON public.ca_submissions;

-- Remove public access from quiz tables
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Anyone can view quiz submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Anyone can insert quiz submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Students can view quizzes for their section" ON public.quizzes;

-- Remove public access from LMS progress
DROP POLICY IF EXISTS "Anyone can view lms progress" ON public.lms_progress;

-- Remove public access from sections (student lookup now goes through edge function)
DROP POLICY IF EXISTS "Allow public read for student section lookup" ON public.sections;

-- Remove public access from CA projects
DROP POLICY IF EXISTS "Students can view ca projects for their section" ON public.ca_projects;

-- Remove public insert on activity_logs and user_sessions (edge function handles these now)
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.user_sessions;

-- Create restricted policies for authenticated teachers/admins only

-- Student notices: only teachers who posted them can manage, admins can manage all
CREATE POLICY "Teachers can view notices they posted"
ON public.student_notices FOR SELECT
USING (auth.uid() = posted_by);

CREATE POLICY "Teachers can update notices they posted"
ON public.student_notices FOR UPDATE
USING (auth.uid() = posted_by);

CREATE POLICY "Teachers can insert notices"
ON public.student_notices FOR INSERT
WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Teachers can delete notices they posted"
ON public.student_notices FOR DELETE
USING (auth.uid() = posted_by);

-- Messages: only authenticated users can send, view their own messages
CREATE POLICY "Authenticated users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Users can mark their received messages as read"
ON public.messages FOR UPDATE
USING (auth.uid() = recipient_user_id);

-- CA submissions: only project owners/admins can access
-- (Students access through edge function)

-- Quiz questions: only quiz owners can manage
-- (Students access through edge function)

-- Quiz submissions: only quiz owners can view
CREATE POLICY "Teachers can view submissions for their quizzes"
ON public.quiz_submissions FOR SELECT
USING (
  question_id IN (
    SELECT qq.id FROM quiz_questions qq
    JOIN quizzes q ON qq.quiz_id = q.id
    WHERE q.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Quizzes: only owners can view/manage
-- (Students access through edge function)

-- LMS progress: teachers can view for their students
CREATE POLICY "Teachers can view lms progress for their students"
ON public.lms_progress FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers can manage lms progress for their students"
ON public.lms_progress FOR ALL
USING (
  student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Activity logs: only authenticated users can insert their own logs
CREATE POLICY "Authenticated users can insert their own activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- User sessions: only authenticated users can insert their own sessions
CREATE POLICY "Authenticated users can insert their own sessions"
ON public.user_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
