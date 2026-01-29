-- Add new columns for location details and lesson date
ALTER TABLE public.lesson_plans 
ADD COLUMN section_number text,
ADD COLUMN building text,
ADD COLUMN room text,
ADD COLUMN lesson_date date;