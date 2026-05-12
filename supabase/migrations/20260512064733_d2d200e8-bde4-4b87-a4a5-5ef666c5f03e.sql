
-- Guest students table
CREATE TABLE public.guest_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all select on guest_students"
  ON public.guest_students FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny all insert on guest_students"
  ON public.guest_students FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny all update on guest_students"
  ON public.guest_students FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "Deny all delete on guest_students"
  ON public.guest_students FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY "Admins can view all guest students"
  ON public.guest_students FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update guest students"
  ON public.guest_students FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete guest students"
  ON public.guest_students FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_guest_students_updated_at
  BEFORE UPDATE ON public.guest_students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guest sessions
CREATE TABLE public.guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guest_students(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_sessions_token ON public.guest_sessions(session_token);
CREATE INDEX idx_guest_sessions_guest_id ON public.guest_sessions(guest_id);

ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all select on guest_sessions"
  ON public.guest_sessions FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny all insert on guest_sessions"
  ON public.guest_sessions FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny all update on guest_sessions"
  ON public.guest_sessions FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "Deny all delete on guest_sessions"
  ON public.guest_sessions FOR DELETE TO anon, authenticated USING (false);

-- Mark a section as the guest section (only one allowed)
ALTER TABLE public.sections ADD COLUMN is_guest_section boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX idx_sections_only_one_guest
  ON public.sections ((true)) WHERE is_guest_section = true;

-- Allow quiz_submissions to belong to a guest instead of a student
ALTER TABLE public.quiz_submissions ADD COLUMN guest_id uuid REFERENCES public.guest_students(id) ON DELETE CASCADE;
ALTER TABLE public.quiz_submissions ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.quiz_submissions
  ADD CONSTRAINT quiz_submissions_one_owner
  CHECK ((student_id IS NOT NULL AND guest_id IS NULL) OR (student_id IS NULL AND guest_id IS NOT NULL));

CREATE INDEX idx_quiz_submissions_guest_id ON public.quiz_submissions(guest_id);
