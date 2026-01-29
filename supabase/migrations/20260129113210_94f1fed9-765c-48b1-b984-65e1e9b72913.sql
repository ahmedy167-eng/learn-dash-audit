-- Add new lesson plan fields
ALTER TABLE public.lesson_plans 
ADD COLUMN lesson_skill text,
ADD COLUMN aim_main text,
ADD COLUMN aim_subsidiary text,
ADD COLUMN lead_in_presentation text,
ADD COLUMN practice_exercises text,
ADD COLUMN productive_activities text,
ADD COLUMN reflection text;