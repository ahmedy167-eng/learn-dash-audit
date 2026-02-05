-- Add explanation column to quiz_questions for answer explanations
ALTER TABLE quiz_questions 
ADD COLUMN explanation text;