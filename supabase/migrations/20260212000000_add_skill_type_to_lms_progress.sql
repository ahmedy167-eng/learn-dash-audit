-- Add skill_type column to lms_progress table
ALTER TABLE public.lms_progress ADD COLUMN skill_type TEXT;

-- Add check constraint to ensure valid skill types
ALTER TABLE public.lms_progress ADD CONSTRAINT lms_progress_skill_type_check 
CHECK (skill_type IN ('reading-writing', 'listening', 'speaking'));

-- Create index on skill_type for better query performance
CREATE INDEX idx_lms_progress_skill_type ON public.lms_progress (skill_type);
