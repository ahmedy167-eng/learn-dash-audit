-- Allow admins to view all students
CREATE POLICY "Admins can view all students"
ON public.students FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all sections
CREATE POLICY "Admins can view all sections"
ON public.sections FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all virtual audits
CREATE POLICY "Admins can view all virtual_audits"
ON public.virtual_audits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all cover class audits
CREATE POLICY "Admins can view all cover_class_audits"
ON public.cover_class_audits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all lesson plans
CREATE POLICY "Admins can view all lesson_plans"
ON public.lesson_plans FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all schedules
CREATE POLICY "Admins can view all schedules"
ON public.schedules FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all tasks
CREATE POLICY "Admins can view all tasks"
ON public.tasks FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));