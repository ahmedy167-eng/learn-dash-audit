-- Allow students (anonymous users) to read sections for teacher lookup
CREATE POLICY "Allow public read for student section lookup"
ON public.sections
FOR SELECT
USING (true);

-- Allow students (anonymous users) to read profiles for teacher name lookup
CREATE POLICY "Allow public read for teacher lookup"
ON public.profiles
FOR SELECT
USING (true);