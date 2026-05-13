## Issue found
Students are not seeing listening quizzes/audio because login can match duplicate student records with the same name and student ID. The current student login query uses `limit(1)` with no ordering, so the browser may log the student into an older duplicate record in a different section. In the tested case, the student was logged into section `ac7e...`, which only has standard quizzes, while the listening quizzes are assigned to the newer active section `d1ad...`.

## Fix plan
1. Update the student login lookup in `supabase/functions/student-auth/index.ts` so duplicate matches are selected deterministically:
   - Prefer active records.
   - Prefer records with a section assigned.
   - Prefer the newest record.
2. Keep the existing duplicate-login behavior from project memory: do not fail login just because duplicates exist.
3. Add a small safety normalization around name matching if needed, so extra spaces in student names do not push students to the wrong duplicate record.
4. Verify by logging in as the affected student and confirming the Quizzes page shows the active listening quizzes and the listening audio card can request its signed audio URL.

## Technical details
- The frontend audio component is present and renders when a listening quiz is returned.
- The backend quiz query only returns quizzes for the logged-in student’s selected `section_id`.
- The root problem is session creation using the wrong duplicate `students.id`, not the Chrome/laptop audio player itself.