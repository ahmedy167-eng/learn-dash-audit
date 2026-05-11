# Admin-controlled transcript visibility for Listening quizzes

Today, listening-quiz students hear the audio but never see the script. You want to control — per quiz — whether (and when) the audio script is shown.

## What changes

### 1. New per-quiz setting: "Show transcript to students"
A dropdown in the quiz create/edit form (Listening type only) with three choices:

- **Never** — students only hear audio. (current behavior, default)
- **After audio finishes** — script appears once the audio reaches the end at least once.
- **Always** — script visible from the start, alongside the player.

### 2. Database
- Add column `transcript_visibility text` to `quizzes` (allowed values: `never` | `after_audio` | `always`, default `never`).
- Validation trigger to reject other values.
- No RLS changes — column is read-only to students via existing `student-auth` quiz fetch.

### 3. Staff page (`src/pages/Quizzes.tsx`)
- New `<Select>` in the listening section of the form (right under Max plays).
- Wire into create + update flows.
- Show a small badge ("Transcript: After audio") on the quiz detail panel.

### 4. Student page (`src/pages/student/StudentQuizzes.tsx`)
- Read `transcript_visibility` + `audio_script` from the quiz payload.
- Render a collapsible "Transcript" panel under the audio player based on the setting:
  - `never` → not rendered.
  - `always` → visible immediately.
  - `after_audio` → hidden until the `<audio>` element fires `onEnded` once (track with local state). Shown for the rest of the attempt.
- Style: muted card with monospace-friendly text, scrollable, "Transcript" header.

### 5. Edge function (`student-auth`)
- Confirm the quiz fetch already returns `audio_script` and add `transcript_visibility` to the selected fields. If `transcript_visibility = 'never'`, strip `audio_script` from the response so it isn't exposed in the client at all.

## Out of scope
- Per-question reveal timing.
- Highlighting/karaoke-style sync with audio.
- Translations of the transcript.

Approve and I'll implement.