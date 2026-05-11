
# Listening Comprehension Quiz

A new quiz type alongside **Standard** and **Reading**. Teachers write a script, generate an audio file via TTS, AI drafts 25 (configurable 10–25) MCQs tagged by skill, set how many times students may replay. Students listen, complete the listen at least once, then answer all questions on one page; results group performance by skill area.

## Teacher flow (Quizzes page)

1. Quiz type toggle gains a third option: **Listening**.
2. Listening form fields:
   - Title, Section, Description (existing).
   - **Audio script** textarea (200–4000 chars).
   - **Voice** select (curated ElevenLabs voices: Sarah, Roger, George, etc.).
   - **Number of questions** slider (10–25, default 25).
   - **Max plays allowed** select (1, 2, 3, Unlimited; default 2).
   - **Generate audio + questions** button → calls new edge function `generate-listening-quiz` which:
     - Calls ElevenLabs TTS with the script → uploads MP3 to `quiz-audio` storage bucket → returns signed URL path.
     - Calls Lovable AI (`google/gemini-2.5-flash`) to draft N MCQs, each tagged with a `skill` (`main_idea` | `detail` | `inference` | `vocabulary` | `purpose`) plus `question_text`, `option_a–d`, `correct_answer`, `explanation`.
3. Draft questions appear in editable list (reuse current question editor + a Skill dropdown per question). Teacher edits, deletes, adds manual ones, then **Save Quiz**.
4. Detail panel shows audio player, script preview, and a **Regenerate audio** / **Regenerate questions** button.

## Student flow (Student Quizzes page)

- Listening quizzes get a **"Listening"** badge.
- Quiz screen layout:
  - Sticky audio player card at top with **Play** button, progress bar, and **"Plays remaining: X"** badge.
  - Questions are **hidden** until the audio finishes playing for the **first time**. After that they appear and remain visible regardless of further replays.
  - Replay button disabled when plays remaining = 0 (Unlimited skips this check).
  - All N questions on one page, single Submit button.
- Results screen:
  - Overall score (existing UI).
  - **Areas to improve** card: bar list grouped by skill tag with `correct/total` and percentage; skills under 60% highlighted as "Focus area".
  - Existing per-question review with explanations.

## Database changes

- `quizzes` table: extend `quiz_type` to allow `'listening'`; add `audio_url text`, `audio_script text`, `max_plays integer default 2` (nullable = unlimited), `voice_id text`.
- `quiz_questions` table: add `skill text` (nullable; only used by listening quizzes).
- New private storage bucket `quiz-audio` with RLS:
  - Teachers can insert/select/delete files under their own `user_id/...` prefix.
  - `student-auth` edge function generates signed URLs for students whose section owns the quiz.
- Existing `notify_students_quiz_change` trigger already covers the new type — no change needed.

## Edge functions

**New: `supabase/functions/generate-listening-quiz/index.ts`**
- Auth: staff JWT (same pattern as `generate-reading-questions`).
- Input (zod): `{ script: string (200–4000), count: int (10–25), voice_id: string, quiz_id: uuid }`.
- Step 1: Call ElevenLabs `text-to-speech/{voice_id}?output_format=mp3_44100_128` with `eleven_multilingual_v2`.
- Step 2: Upload MP3 to `quiz-audio/{user_id}/{quiz_id}.mp3` using service role client; store path on the quiz row.
- Step 3: Call Lovable AI with structured tool schema returning `questions[]` including `skill` enum.
- Returns `{ audio_path, questions }`. 90s timeout per call.

**New: `supabase/functions/get-quiz-audio/index.ts`** (or extend `student-auth`)
- Input: `{ sessionToken, quiz_id }`. Verifies the student belongs to the quiz's section, returns a 1-hour signed URL for the audio file.

**Edit: `supabase/functions/student-auth/index.ts`**
- Include new quiz columns (`audio_url`/`audio_script` excluded — script is teacher-only — but `max_plays`, `quiz_type`) in the `quizzes` projection.
- Add `get-quiz-audio` action returning a signed URL.
- Add `skill` column to `quiz_questions` projection.

## Required secret

- **`ELEVENLABS_API_KEY`** — needed before implementation. Will be requested via `add_secret` once the user confirms this plan.

## Files to add / edit

**New**
- `supabase/functions/generate-listening-quiz/index.ts`
- `src/components/quizzes/ListeningQuizForm.tsx` (script + voice + count + max plays + AI draft + editable list w/ skill dropdown)
- `src/components/quizzes/ListeningPlayer.tsx` (sticky player with play counter, gates question visibility)
- `src/components/quizzes/SkillBreakdown.tsx` (results-screen card)
- Migration: extend `quizzes` columns, add `quiz_questions.skill`, create `quiz-audio` bucket + RLS.

**Edit**
- `src/pages/Quizzes.tsx` — add Listening type toggle, mount `ListeningQuizForm`, save logic, audio preview + regenerate, "Listening" badge.
- `src/pages/student/StudentQuizzes.tsx` — branch on `quiz_type='listening'` to render `ListeningPlayer`, gate questions, render `SkillBreakdown` on results.
- `src/hooks/useStudentApi.tsx` — add `getQuizAudio(quizId)` helper.
- `supabase/functions/student-auth/index.ts` — projection + new action.

## Out of scope

- No transcript display to students (defeats the listening test).
- No per-question audio clips, no segmented audio, no playback speed control.
- No AI-generated improvement plan (skill % breakdown is the "areas to improve" view).
- No teacher-uploaded audio files (TTS-only this round).
