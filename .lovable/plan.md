## Plan

1. **Repair the specific broken quiz record**
   - The quiz shown in the student portal is a listening quiz, but it has no stored audio path, no audio script, no voice, and no generated questions.
   - Update the existing database data for that quiz so it is no longer exposed to students until audio and questions are generated, preventing the “Audio is not available” state.

2. **Prevent this from happening again**
   - Update the student quiz list query so listening quizzes only appear to students when they are fully ready: active, assigned to the student’s section, has an audio file, and has at least one question.
   - This keeps unfinished/failed listening quiz drafts out of the student portal.

3. **Improve the student error handling**
   - Keep the audio panel from showing a vague “Audio is not available” state for incomplete staff-created listening quizzes.
   - If a quiz becomes unavailable while a student opens it, show a clear message and return them to the quiz list.

4. **Verify the fix**
   - Check the affected quiz no longer appears broken in the student portal.
   - Confirm valid listening quizzes still load audio through the existing signed-audio endpoint.

## Technical details

- The failing request is for quiz `aa377ac4-a9c0-497e-b3e7-b2410e3081da`.
- Database inspection shows:
  - `quiz_type = listening`
  - `is_active = true`
  - `audio_url = null`
  - `audio_script = null`
  - `voice_id = null`
  - `question_count = 0`
- The student backend correctly returns `404 { "error": "Audio not available" }` because the quiz is active but has no generated audio.
- This does not point to the student API key/header issue; the request is authenticated and reaching the backend successfully.