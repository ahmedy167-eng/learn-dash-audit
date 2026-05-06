## Goal
Make the CA Projects feedback loop work end-to-end:
1. Teacher annotates a student's submission (any stage).
2. Student instantly sees the highlighted mistakes + comments.
3. Student edits the same stage to fix the mistakes and resubmits.
4. Teacher instantly sees the corrected version, with the previous round's annotations preserved as reference.

## What's already in place
- Teacher annotation UI exists on `/ca-projects` (`AnnotatableText`).
- Student sees `AnnotatedView` panel inside each stage tab.
- Annotations are saved as HTML in `ca_submissions.feedback_html`.
- Student page reloads via 30-second polling.

## Gaps to close

### 1. Instant updates (both sides)
- **Student side**: replace 30-second polling with Supabase realtime on `ca_submissions` filtered by `student_id`. When `feedback_html` changes, refresh that submission and show a toast "Teacher left new feedback on {stage}".
- **Teacher side**: subscribe to `ca_submissions` for the currently open project. When a student updates `content`, refresh the submissions list and badge the stage tab as "Updated".

### 2. Revision history (keep previous round)
Add a new table `ca_submission_revisions` to snapshot each round so nothing is lost:

```text
ca_submission_revisions
  id, submission_id, round_number,
  content_snapshot       -- student's text at time of teacher review
  feedback_html_snapshot -- teacher annotations for that round
  created_at
```

Flow:
- When the **teacher saves an annotation** (`saveFeedbackHtml`), if the current `content` differs from the latest snapshot, create a new revision row capturing the content + new annotations.
- When the **student resubmits** new content for a stage that already has `feedback_html`, the existing annotations are moved into a revision (current `content` + current `feedback_html` snapshot), then `feedback_html` is cleared on the live row so the next round starts fresh on the new text. Student keeps seeing prior rounds in a "Previous feedback" accordion.

### 3. UI additions
- **Student stage tab**: above the editor, an accordion "Previous feedback (Round 1, Round 2…)" listing each revision rendered with `AnnotatedView`. The current live `feedback_html` (latest round) stays in the existing "Teacher Annotations" panel. A small "New feedback" pill appears on a stage tab when the teacher saves an annotation the student hasn't viewed yet (tracked via a simple `last_viewed_at` in localStorage keyed by submission id).
- **Teacher stage view**: a "Resubmitted {date}" badge appears when `ca_submissions.updated_at > feedback_html last save`. A "Revisions" toggle shows past rounds inline (read-only AnnotatedView) so the teacher can compare.
- Use `student_content_updates` notification trigger so the student's bell also pings on new annotations (extend the existing trigger or add one for `ca_submissions` updates of `feedback_html`).

## Technical details
- **Migration**: create `ca_submission_revisions` with RLS — teacher can read/write revisions for their own projects (via `ca_projects.user_id`); students read only their own via the existing `student-auth` edge function (add a `getRevisions` action).
- **Edge function `student-auth`**:
  - Add `get_ca_revisions` action returning revisions for the student's submissions.
  - Update `update_ca` action: if the submission already has `feedback_html`, snapshot it into `ca_submission_revisions` before clearing it on the live row.
- **Realtime**: enable replica identity FULL and add `ca_submissions` to `supabase_realtime` publication. Student page subscribes filtered by `student_id` (via the edge function returning a fresh fetch on the channel event — channel itself uses anon key, payload is just the id; the row body is then re-fetched through `student-auth`).
- **Notifications**: extend the existing `student_content_updates` trigger or add a new trigger on `ca_submissions` UPDATE where `feedback_html` changed → insert update row of type `ca_feedback`.
- Frontend changes limited to `src/pages/CAProjects.tsx`, `src/pages/student/StudentCAProjects.tsx`, `src/components/ca/AnnotatedView.tsx`, plus a new `RevisionHistory` component.

## Out of scope
- Reworking annotation toolbar (already fixed last turn).
- Changing the abbreviation list.
- Per-word diffing between rounds (kept simple: full snapshots).
