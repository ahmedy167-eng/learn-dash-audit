## Goal

Fix both issues when a teacher opens the shared link in Google Chrome:

1. `/auth` can jump straight to the dashboard if that browser already has a saved staff session.
2. New teachers can reach Quizzes but may not immediately see the full Reading/Listening quiz tools.

## Plan

### 1. Add a dedicated teacher signup link

Create a new public route:

- `/teacher-signup`
- `/join` as a short alias

This page will show the teacher account creation form directly, instead of the combined sign-in/sign-up page.

If the browser is already signed in, it will not silently redirect to the dashboard. It will show a clear message like:

> You are already signed in as this account. Sign out first to create a new teacher account.

This prevents the “dashboard comes up automatically” problem when the link is opened on a browser that already has a session.

### 2. Keep `/auth` as the normal teacher sign-in page

Keep `/auth` for existing teachers who already have accounts.

After the fix, the links should be:

- Existing teacher sign in: `https://learn-dash-audit.lovable.app/auth`
- New teacher signup: `https://learn-dash-audit.lovable.app/teacher-signup`
- Short new teacher signup: `https://learn-dash-audit.lovable.app/join`

### 3. Refresh permissions after signup/sign-in

Update the permissions flow so after a teacher signs up or signs in, the app reloads their latest permissions before showing feature-gated screens.

This makes sure newly granted permissions such as `quizzes` are available immediately, without requiring the teacher to refresh the browser.

### 4. Improve Quizzes loading gate

Update the Quizzes page so it waits for both:

- the teacher account session
- the teacher permissions

before deciding whether to show the full quiz creator or the “access required” message.

This avoids a race condition where the page can render before the permissions are fully loaded.

### 5. Verify the behavior

After implementation, verify these flows:

- Opening `/auth` while logged out shows the sign-in form.
- Opening `/teacher-signup` while logged out shows the signup form.
- Opening `/teacher-signup` while already logged in does not silently redirect to dashboard; it asks the user to sign out first.
- New teacher accounts receive Quizzes permission and can see the full Standard / Reading / Listening quiz type controls.