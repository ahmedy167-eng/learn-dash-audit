-- Add new columns to students table
ALTER TABLE public.students 
ADD COLUMN section_number text,
ADD COLUMN category text DEFAULT 'regular',
ADD COLUMN course text,
ADD COLUMN class text,
ADD COLUMN room text,
ADD COLUMN building text,
ADD COLUMN start_class_time time,
ADD COLUMN finish_class_time time,
ADD COLUMN teaching_days text[] DEFAULT '{}',
ADD COLUMN off_days date[] DEFAULT '{}',
ADD COLUMN notes text,
ADD COLUMN present_count integer DEFAULT 0,
ADD COLUMN late_count integer DEFAULT 0,
ADD COLUMN absent_count integer DEFAULT 0;

-- Drop unused columns
ALTER TABLE public.students 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone_number,
DROP COLUMN IF EXISTS enrollment_date;