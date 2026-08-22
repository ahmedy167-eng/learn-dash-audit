CREATE TABLE public.prospective_students (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  student_id text NOT NULL,
  track_number text,
  academic_year text NOT NULL DEFAULT '2026/2027',
  weeks jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'Pending',
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospective_students TO authenticated;
GRANT ALL ON public.prospective_students TO service_role;

ALTER TABLE public.prospective_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prospective students"
ON public.prospective_students
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_prospective_students_updated_at
BEFORE UPDATE ON public.prospective_students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();