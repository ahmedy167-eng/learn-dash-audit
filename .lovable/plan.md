## Problem

When you click Edit on a listening quiz, the Audio Script field shows empty even though the quiz was created with a script. Same applies to Voice and other listening fields after edits.

Two bugs work together:

1. **The quiz row in the database actually has no audio_script.** The "Listen detail" quiz currently stores `audio_script = null`, `audio_url = null`, `voice_id = null`. The Edit dialog correctly reads from the database, so it has nothing to display.

2. **The Update Quiz handler does not save listening fields.** `handleUpdateQuiz` only updates section, title, description, active status, reading_passage and max_plays. It never writes back `audio_script`, `voice_id`, `quiz_type`, or `audio_url`. So even when you do type a script in the Edit dialog and press "Update Quiz", it is silently dropped — which explains how the script can disappear from the database after an edit.

The original creation may also have lost the script if the audio generation step crashed before the row was fully saved on the server.

## Plan

1. **Make the Update Quiz action actually save listening fields**
   - Persist `audio_script`, `voice_id`, and `quiz_type` when updating a listening quiz.
   - Keep `reading_passage` only when the quiz type is reading; clear it for other types.

2. **Regenerate audio when the script or voice changes during edit**
   - If a listening quiz is edited and the script text or voice is different from the stored values, re-run the existing audio + question generation flow so `audio_url` is refreshed and stays in sync with the new script.
   - If only non-audio fields change (title, description, max plays, active), skip regeneration.

3. **Repair the existing "Listen detail" quiz**
   - The current row has no script, no audio, and no questions, so editing it will keep showing empty. Deactivate it so it does not appear to students, and surface a clear "incomplete" badge in the staff Quizzes list so the teacher knows it must be re-created or have a script added.

4. **Guard the create flow so a script is never lost**
   - On create, if audio generation fails after the quiz row is inserted, keep the script that was already saved on the row, mark the quiz inactive, and show a clear "Audio generation failed — edit the quiz to retry" message instead of leaving a half-created quiz the teacher cannot recover.

5. **Verify**
   - Open Edit on an existing listening quiz → script, voice, and max plays are pre-filled from the database.
   - Change the script and press Update → new script is saved and new audio is generated; reopening Edit shows the new script.
   - Change only the title → no audio regeneration runs.

## Technical details

- File: `src/pages/Quizzes.tsx`
  - `handleUpdateQuiz` (around line 457): include `audio_script`, `voice_id`, `quiz_type` in the update payload (gated on `formQuizType === 'listening'`), and call `generateListeningQuiz` when script or voice changed vs `editingQuiz`.
  - `handleCreateQuiz` (around line 294): on `generateListeningQuiz` failure, leave the inserted row with the script intact (already inserted at line 318) and surface a retry message.

- File: `supabase/functions/generate-listening-quiz/index.ts`
  - On re-run for an existing quiz, the function already updates `audio_url`, `audio_script`, `voice_id` (line 219). For edits, also delete previously generated `quiz_questions` for that `quiz_id` before inserting the new set, so questions match the new script.

- Database: deactivate the broken row.
  - `UPDATE public.quizzes SET is_active = false WHERE id = 'aa377ac4-a9c0-497e-b3e7-b2410e3081da';`
