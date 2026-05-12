DROP INDEX IF EXISTS public.idx_sections_only_one_guest;

CREATE UNIQUE INDEX idx_sections_one_guest_per_user
  ON public.sections (user_id) WHERE is_guest_section = true;

ALTER TABLE public.guest_students
  ADD COLUMN IF NOT EXISTS assigned_teacher_id uuid;

CREATE INDEX IF NOT EXISTS idx_guest_students_assigned_teacher
  ON public.guest_students(assigned_teacher_id);