## Goal
Add a difficulty level (Easy / Intermediate / Advanced) to quizzes, and make sure the question count is hard-locked between 10 and 25 — including on Update Quiz.

## Changes

### 1. Database
Add a `difficulty` column to `quizzes`:
- Type: `text`, NOT NULL, default `'intermediate'`
- Validation trigger restricts values to `easy | intermediate | advanced`

(No RLS changes — existing teacher-owned policies already cover it.)

### 2. Quizzes admin UI (`src/pages/Quizzes.tsx`)
- Add a `formDifficulty` state (`'easy' | 'intermediate' | 'advanced'`, default `intermediate`).
- Add a Select dropdown labeled **Difficulty** in:
  - Create Quiz dialog
  - Edit Quiz dialog
  - Reading questions section (so regeneration uses it too)
- Pre-fill `formDifficulty` from `editingQuiz.difficulty` when opening Edit.
- Persist `difficulty` on create insert and on `handleUpdateQuiz`.
- Clamp question count to `[10, 25]` on submit for both create and update (defensive — sliders already enforce, but typed input could bypass).
- Pass `difficulty` to the two AI generation calls (`generate-listening-quiz`, `generate-reading-questions`) in the request body.
- Show the difficulty as a small badge on each quiz card in the list.

### 3. Edge functions
- `generate-listening-quiz/index.ts` and `generate-reading-questions/index.ts`:
  - Extend Zod schema with `difficulty: z.enum(['easy','intermediate','advanced']).default('intermediate')`.
  - Inject the difficulty into the AI system prompt, e.g.:
    - **easy** → simple vocabulary, mostly literal/detail questions
    - **intermediate** → mix of detail, inference, vocabulary
    - **advanced** → heavy inference, nuanced vocabulary, author's purpose, distractors closely plausible
  - Keep the existing `count` validation `min(10).max(25)`.

### Out of scope
- No changes to the student-side quiz UI (difficulty is metadata for generation only; can be surfaced later if you want).
- No retroactive difficulty tagging of existing quizzes — they default to `intermediate`.