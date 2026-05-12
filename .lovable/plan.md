## Problem
Listening quizzes don't play audio in the guest portal. The `quiz-audio` storage bucket is private, but `guest-auth` returns the raw storage path as `audio_url`, and `GuestPortal.tsx` binds it directly to the `<audio>` element. Without a signed URL, the browser can't fetch the file, so playback fails silently (the Play/Pause button toggles but no sound plays).

The student portal already solves this via a `get-audio-url` action in `student-auth` that calls `storage.from('quiz-audio').createSignedUrl(...)`. The guest path needs the same treatment.

## Changes

1. **`supabase/functions/guest-auth/index.ts`**
   - Stop returning the raw `audio_url` in `list-quizzes` (avoid leaking storage paths). Return only a boolean like `has_audio` instead, keeping the existing `audio_script` / `transcript_visibility` logic.
   - Add a new `get-audio-url` action: validates the guest session, looks up the quiz, confirms it belongs to the active guest section and is active, then returns a 1-hour signed URL from the `quiz-audio` bucket.

2. **`src/pages/GuestPortal.tsx`**
   - Track an `audioUrl` state (and a loading flag) for the selected quiz.
   - When a listening quiz is selected, call the new `get-audio-url` action and store the resulting signed URL.
   - Bind `<audio src={audioUrl}>` instead of `selected.audio_url`. Show a small loader / disabled Play button while the URL is being fetched. Clear it when the quiz changes or on unmount.
   - Keep existing play-count, transcript-visibility, and submission logic untouched.

No database changes, no UI redesign — only the audio-source plumbing.
