# Rebuild Sections from the 2026/2027 Prospective Students

## Goal
Clear out the old class sections and their students, then rebuild the section list from the 2026/2027 prospective registry (sections 6490 and 87691) and enroll the prospective students into them as real students.

## Current state (verified)
- Main Sections list holds 10 sections. Three of them still have students: Level B (19), English level A (19), french (2). The rest are empty.
- Prospective registry has 2 sections: 6490 (21 students) and 87691 (22 students). 44 prospective students total, 43 assigned to a section, 1 unassigned.

## What will happen

### 1. Remove the old data
- Delete all 10 existing sections.
- Delete the 40 students attached to them, together with everything tied to those students (attendance counters, LMS progress, CA submissions, notices, messages, quiz submissions, notification rows, session records).
- Content that pointed at the old sections (quizzes, CA projects) is removed with them.

This is permanent and cannot be undone.

### 2. Create the new sections
- Create two sections named after the prospective sections: **6490** and **87691**.
- They will be owned by the admin account so they appear on the admin's Sections page, and can be handed to a teacher later by editing the section.
- Course/room/times are left blank for now and can be filled in from the Sections page.

### 3. Enroll the prospective students
- For each prospective student with a section, create a student record in the matching new section using their full name and student ID.
- Track number is carried over into the student's notes field.
- The 1 unassigned prospective student is skipped (they stay in the registry until a section is chosen).
- The prospective registry itself is left untouched, so the 2026/2027 card keeps its full list and week grid.

## Technical notes
- One data script: delete dependent rows for the affected students, then the students, then the sections; insert the two new `sections` rows; insert 43 `students` rows mapped by `prospective_students.section_id`.
- New students get `is_active = true` and `academic_year`-agnostic defaults; `student_id` is copied verbatim so student-portal login keeps working.
- No schema changes and no UI changes are required.

## Acceptance criteria
- Sections page shows exactly two sections: 6490 and 87691.
- 6490 has 21 students, 87691 has 22 students, matching the prospective registry.
- No leftover students from the old sections remain anywhere in the app.
- The 2026/2027 Prospective Students card still shows all 44 records.
