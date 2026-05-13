## Problem

Some students (e.g. NAIF SAEED, ID 447101567) exist as multiple active rows in `students`, each tied to a different section. Login currently picks the wrong duplicate, so the student lands in a stale section and sees test/empty quizzes instead of the real listening quiz that was published in the active section.

The previous tiebreaker (active → has section → newest) still picks the wrong row when the older duplicate is the one with real content.

## Fix

Update `supabase/functions/student-auth/index.ts` login lookup to score each duplicate by the freshness of content actually published to its section, and log in the student into the highest‑scoring record.

For each candidate row (whitespace‑normalized name match + studentId, `is_active = true`):

1. Look up the most recent activity timestamp across:
   - `quizzes.created_at` / `updated_at` where `section_id` matches and `is_active = true`
   - `ca_projects.updated_at` where `section_id` matches
   - `lms_progress.updated_at` where `student_id` matches that specific row
2. Take the max of those as a `last_content_at` for the row.
3. Sort candidates by:
   1. `section_id IS NOT NULL` first (skip rows with no section if any other has one)
   2. `last_content_at DESC` (rows whose section actually has content win)
   3. `students.created_at DESC` as a final tiebreaker
4. Use the winning row to create the session.

If no row has any content at all, fall back to the current behavior (newest active row with a section).

No schema changes. No client changes. Only the edge function login handler is touched.

## Verification

- Re-run the existing `[student-auth] Login attempt` flow for `447101567` and confirm the resolved `student.id` is `726a38b2…` (section `d1ad…`, the listening‑quiz section), not `f2c5c01d…`.
- Spot‑check 1–2 other duplicate students via `supabase--read_query` to make sure they route to a section that has real published content.
- Confirm Quizzes page now shows the listening quiz with the audio card after re‑login.

## Out of scope

- Admin tooling to merge/deactivate duplicate student rows (can be a follow‑up).
- Letting students choose a section at login.
