# Fix: Audio section invisible on mobile in student quizzes

## Root cause (verified in browser)

Logging in as a real student (NAIF, section `d1ad8e0d`) and opening the listening quiz "Tourism - Listening" works correctly on **desktop**: the "Listening Audio" card, native `<audio controls>` player, "Plays used: 0/2" indicator, "Start listening" button, and the transcript all render. The signed audio URL is fetched successfully (verified in network logs).

The bug is **not** in the quiz logic, the edge function, the listening data, or permissions. It is a **mobile layout bug** in `src/components/student/StudentLayout.tsx`:

- The student sidebar is rendered as a fixed-width column (`w-64` expanded, `w-16` collapsed) inside a flex row.
- On a 390 px viewport (iPhone), the sidebar eats 256 px and leaves ~134 px for the entire main content. The "Listening Audio" card is squeezed to a column that's too narrow to fit the native audio control bar — only a tiny dot/strip of it is visible, which is exactly what the user describes as "the audio section is not available".
- The same screen at desktop width renders fine, which is why the bug only reproduces on phones (and on a laptop with a very narrow window).

The teacher dashboard does not use this layout, so it is not affected.

## Fix

Refactor `StudentLayout.tsx` so the sidebar behaves responsively:

- Mobile (`<` `md`, i.e. < 768 px):
  - Sidebar is hidden by default and overlays the page when opened (off-canvas drawer with a backdrop).
  - A small hamburger button appears in the top-left of the main content to open it.
  - Tapping a nav link or the backdrop closes the drawer.
  - Main content uses the **full viewport width** so the `<audio controls>` player and quiz cards have room to render.
- Desktop (`md+`):
  - Existing collapsible sidebar behavior is preserved exactly (`w-64` / `w-16`, chevron toggle, theme toggle, logout — unchanged).

Implementation notes:

- Use `useIsMobile()` from `src/hooks/use-mobile.tsx` to branch behavior.
- On mobile, render the `<aside>` as `fixed inset-y-0 left-0 z-50` translated off-screen, toggled by a state flag. Add a translucent backdrop (`fixed inset-0 z-40 bg-background/60`) when open.
- Keep the existing nav items, student-info block, theme toggle, and logout button — only the wrapper positioning changes.
- The `<main>` becomes `flex-1 w-full overflow-auto` with no left padding on mobile (drawer overlays it).

No other files need to change. No backend, RLS, or edge-function changes are required. The audio fetching flow in `StudentQuizzes.tsx` is already correct.

## Verification

1. Open `/student-portal/quizzes` on a 390 px viewport, log in as a student in a section that has a listening quiz, and open the listening quiz.
2. Confirm the "Listening Audio" card spans the full width and the native audio controls (play, scrubber, time, volume) are fully visible and usable.
3. Confirm the hamburger opens the sidebar as an overlay, the backdrop closes it, and tapping a nav link navigates and closes it.
4. Confirm desktop (>= 768 px) behavior is unchanged: sidebar visible, chevron collapses to `w-16`, all existing styling intact.
