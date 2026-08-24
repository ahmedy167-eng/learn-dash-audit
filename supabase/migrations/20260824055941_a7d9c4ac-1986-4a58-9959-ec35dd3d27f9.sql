CREATE TABLE public.prospective_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_number text NOT NULL UNIQUE,
  label text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospective_sections TO authenticated;
GRANT ALL ON public.prospective_sections TO service_role;

ALTER TABLE public.prospective_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prospective sections"
ON public.prospective_sections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.prospective_students
ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.prospective_sections(id) ON DELETE SET NULL;

INSERT INTO public.prospective_sections (section_number, created_by)
SELECT v.section_number, admin_user.user_id
FROM (VALUES ('6490'), ('87691')) AS v(section_number)
CROSS JOIN (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1) AS admin_user
ON CONFLICT (section_number) DO NOTHING;

CREATE TRIGGER update_prospective_sections_updated_at
BEFORE UPDATE ON public.prospective_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();