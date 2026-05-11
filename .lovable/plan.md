# Reading Comprehension Quiz

A new quiz type where the teacher writes one reading passage, picks how many questions (10–25), Lovable AI drafts MCQs from the passage, the teacher reviews/edits, then students view the passage with all questions on a single page.

## Teacher flow (Quizzes page)

1. "New Quiz" gets a type toggle: **Standard** vs **Reading Comprehension**.
2. Reading mode form:
   - Title, Section, Description (existing fields).
   - Large **Reading Passage** textarea (required, ~100–3000 words).
   - **Number of questions** slider/select (10–25, default 10).
   - **Generate questions with AI** button → calls a new edge function `generate-reading-questions` that returns N MCQs (question, A/B/C/D, correct answer, short explanation) grounded in the passage.
3. Draft questions appear in an editable list (reuse current question editor UI). Teacher can edit text/options/correct answer, delete, add manual ones, then **Save Quiz**.
4. On save, the passage is stored once on the quiz, and questions are inserted without per-question passage duplication.

## Student flow (Student Quizzes page)

- Reading quizzes are labeled with a "Reading" badge in the list.
- Opening one shows the **passage at the top** (clean typography, scrollable), then all N questions below on the same page with radio-group answers and a single Submit button.
- Existing scoring + results view is reused; results screen shows the passage above the question review.

## Database changes

- `quizzes` table: add `quiz_type text not null default 'standard'` (`'standard' | 'reading'`) and `reading_passage text`.
- Keep `quiz_questions.reading_passage` for backward compatibility but stop writing to it in reading mode.
- No RLS changes needed (existing policies cover the new columns).

## Edge function: `generate-reading-questions`

- Auth: standard staff JWT (verify with SUPABASE_JWKS like other staff functions).
- Input (zod-validated): `{ passage: string (200–15000 chars), count: number (10–25) }`.
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a structured-output tool schema returning an array of `{ question_text, option_a, option_b, option_c, option_d, correct_answer ('A'|'B'|'C'|'D'), explanation }`.
- 60s AbortController timeout; returns 429/402 passthrough like `diary-ai`.

## Student edge function update (`student-auth`)

- `get-data` for `quizzes` already returns the row — include the new `quiz_type` and `reading_passage` fields so the student UI can render the passage once.

## Files to add / edit

**New**
- `supabase/functions/generate-reading-questions/index.ts`
- `src/components/quizzes/ReadingQuizForm.tsx` (passage + count + AI draft + editable list)
- migration: add `quiz_type`, `reading_passage` columns to `quizzes`

**Edit**
- `src/pages/Quizzes.tsx` — add type toggle, mount ReadingQuizForm, save logic for reading quizzes, "Reading" badge in list.
- `src/pages/student/StudentQuizzes.tsx` — render passage block once when `quiz_type='reading'`; suppress per-question passage display in that case.
- `supabase/functions/student-auth/index.ts` — include new quiz columns in the `quizzes` projection.

## Out of scope

- No timer, no question shuffling, no image passages, no PDF upload of passage (text only).
- No regeneration of a single question (full re-draft only); teacher edits manually for individual fixes.
