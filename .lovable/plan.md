# Guest Student Portal — Plan

Allow anyone to self-register with a username + password, log in, and take quizzes you assign to a dedicated "Guest" section. Their results are tracked so you see them alongside regular students. Accounts persist until you delete them.

## What you (admin) get

- A new **"Guest Section"** concept: pick (or create) one section in your existing Sections page and mark it as the **Guest section**. Any quiz you publish to that section becomes available to all guest accounts.
- A new admin tab **"Guest Students"** under your existing Students/Admin area to view, search, deactivate, or delete guest accounts and view their quiz results.
- Guests appear in your Quiz results dashboard like normal students (clearly tagged as "Guest").

## What guests get

- New page **`/guest-signup`** — username + password + display name → creates account.
- New page **`/guest-login`** — username + password → logs in.
- After login, they land on a stripped-down student portal with **only the Quizzes tab** visible. Dashboard, Chat, LMS, CA Projects are hidden.
- They only see quizzes attached to the Guest section.
- They can take quizzes, see results, and retake — exactly like real students.

## How it works (technical section)

### Database
- New table `guest_students` — `id`, `username` (unique, lowercased), `password_hash`, `display_name`, `is_active`, `created_at`, `last_login_at`.
- New table `guest_sessions` — `id`, `guest_id`, `session_token` (uuid), `expires_at` (24h), `created_at`. Same lifetime model as current student sessions.
- Add nullable `guest_id uuid` column to `quiz_submissions` so guest answers can be tracked. Existing `student_id` becomes nullable; a check constraint enforces "exactly one of student_id / guest_id".
- Add a flag for the guest section. Two options — recommend **(a)** add `is_guest_section boolean default false` to `sections` (admin marks one section). Single-section enforced via partial unique index.
- All new tables: RLS enabled with deny-all to `anon` and `authenticated`; access only through edge functions (mirrors current student model).

### Edge Functions
- New **`guest-auth`** edge function (`verify_jwt = false`) handling actions:
  - `signup` — validates username (regex `^[a-z0-9_]{3,30}$`), password (min 8 chars, optional HIBP check), hashes with bcrypt, inserts row, returns session.
  - `login` — verifies password, creates session row, returns `{ guestId, displayName, sessionToken, expiresAt }`. Reuses existing `login_rate_limits` table (5 attempts / 15 min per IP).
  - `logout` — deletes session.
  - `list_quizzes` — returns active quizzes where `section_id = <the guest section>`.
  - `get_quiz` / `submit_answer` / `retake_quiz` — same shape as `student-auth` but writes `guest_id` instead of `student_id`.
- All requests authenticated by `sessionToken` header, validated against `guest_sessions.expires_at`.

### Frontend
- New `useGuestAuth` hook + `GuestAuthProvider` (mirrors `useStudentAuth`), stores token in `sessionStorage` under separate keys.
- New `useGuestApi` hook (mirrors `useStudentApi`) — direct fetch to `guest-auth` with `apikey` header + 10s timeout.
- New pages: `GuestSignup.tsx`, `GuestLogin.tsx`, `GuestPortal.tsx` (wraps existing `StudentQuizzes` UI but feeds it `useGuestApi`).
- `StudentQuizzes` is refactored slightly to accept the API hook via prop/context so it can be reused for both real students and guests with no duplication.
- New route group `/guest/*` with `GuestLayout` (sidebar shows only Quizzes + Logout, branded "Guest Portal").
- Add a small **"Guest access"** link on the public landing/student-login page so guests can find it.

### Admin UI
- In **Sections** page: add a "Mark as Guest section" toggle (only one allowed at a time).
- New **Guest Students** admin page listing all `guest_students` with: username, signup date, last login, # quizzes taken, average score, Activate/Deactivate, Delete.
- In **Quizzes** results panel: guest submissions render with a "Guest" badge.

### Security
- Guest passwords hashed server-side with bcrypt (Deno `bcrypt`).
- `guest-auth` validates all inputs with Zod.
- Same brute-force protection as student/staff login (`login_rate_limits`).
- RLS deny-all on `guest_students` and `guest_sessions`; only the edge function (service role) reads/writes.
- Guests cannot access any other student data, sections, messages, CA projects, or LMS — enforced both in UI (no routes/links) and in `guest-auth` (only quiz actions exist).

## Out of scope (confirm if you want any of these added)
- Email verification or password reset for guests.
- Guest profile pictures / display name editing.
- Showing guests in the realtime presence/online users panel.

```text
Guest flow:
  /guest-signup ──► guest-auth.signup ──► session ──► /guest/quizzes
  /guest-login  ──► guest-auth.login  ──► session ──► /guest/quizzes
                                                          │
                                                          ▼
                                            quizzes WHERE section_id = guest_section
```
