# Per-Teacher Guest Quizzes

Let any authorized teacher build their own guest quizzes. Admin assigns each guest student to a specific teacher; that guest only sees quizzes from their assigned teacher's guest section.

## 1. Database

- Drop the unique index `idx_sections_only_one_guest` so multiple teachers can each own a guest section.
- Per teacher, only one guest section: add `UNIQUE (user_id) WHERE is_guest_section = true`.
- `guest_students`: add `assigned_teacher_id uuid` (nullable). Until assigned, the guest sees no quizzes.

## 2. Admin UI — `GuestStudentManagement.tsx`

- Fetch list of teachers (profiles joined with `user_permissions` where `feature='quizzes'` enabled, or admins).
- Add a "Teacher" column with a dropdown per row. Changing it updates `assigned_teacher_id` and toasts.
- Show "Unassigned" when null; pending guests still need a teacher before they can be approved (warn, not block).

## 3. Teacher UI

- In `SectionForm`, the "Guest section" toggle stays. With the new per-user unique index, each teacher can have one. No new page needed — they create the section, then build quizzes against it from the existing Quizzes flow.
- On the Quizzes page, badge guest sections so teachers know those quizzes go to guests.

## 4. Edge function — `guest-auth`

Replace every `eq('is_guest_section', true).maybeSingle()` lookup with a lookup based on the signed-in guest's `assigned_teacher_id`:

```
select id from sections
 where is_guest_section = true
   and user_id = guest.assigned_teacher_id
```

If no teacher is assigned or the teacher has no guest section, return an empty quiz list / 403 on audio + submit. Applies to `list-quizzes`, `get-audio-url`, quiz fetch, and submit handlers.

The login response (`/login`) also returns `assigned_teacher_id` so the portal can show "Awaiting teacher assignment" if null.

## 5. Guest portal

- On empty quiz list, show a friendly state: "Your account has not been assigned to a teacher yet. Please contact admin."

## Technical notes

- No new permission key; teachers use their existing `quizzes` permission. Admin assignment IS the authorization.
- Existing quiz RLS (`auth.uid() = user_id`) already isolates teachers from each other — no policy changes needed.
- Existing global guest section (if any) keeps working; admin must reassign guests to whichever teacher should own them.
