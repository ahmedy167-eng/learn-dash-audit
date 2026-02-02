-- Add deadline columns for each CA project stage
ALTER TABLE ca_projects
ADD COLUMN deadline_ideas timestamp with time zone,
ADD COLUMN deadline_first_draft timestamp with time zone,
ADD COLUMN deadline_second_draft timestamp with time zone,
ADD COLUMN deadline_final_draft timestamp with time zone;