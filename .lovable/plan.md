

# Student Dashboard Update Notifications

## Overview

When a teacher updates a quiz, LMS progress, or CA project PDF, students will see a clickable notification card on their dashboard. Each notification tells them what changed and links directly to the relevant page.

## How It Works

1. A new `student_content_updates` table tracks content changes relevant to each student
2. When teachers create/update quizzes, LMS progress, or CA projects, a database trigger automatically generates update records for affected students
3. Students see these updates in a new "Recent Updates" panel on their dashboard, between the Notices panel and Quick Access cards
4. Clicking an update navigates to the relevant page (Quizzes, LMS, or CA Projects) and marks it as read
5. Read updates fade visually; unread ones are highlighted

## What Students Will See

Each update card shows:
- An icon matching the content type (clipboard for quizzes, book for LMS, folder for CA projects)
- A short description (e.g., "A new quiz has been published", "Your LMS progress was updated", "CA Project documents were updated")
- A timestamp ("2 hours ago")
- A "NEW" badge for unread items
- Clicking the card navigates to the appropriate page

## Technical Details

### 1. New Database Table: `student_content_updates`

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| student_id | uuid (FK -> students) | Target student |
| update_type | text | 'quiz', 'lms', or 'ca_project' |
| title | text | Short description of the update |
| reference_id | uuid | ID of the quiz/lms_progress/ca_project |
| is_read | boolean | Default false |
| created_at | timestamptz | When the update was created |

- RLS disabled (accessed via edge function only, using service role)
- Realtime enabled for live push to student dashboard

### 2. Database Triggers (3 functions)

- **on quiz insert/update** (on `quizzes` table): When a quiz is created or updated, look up all students in that quiz's section and insert an update record for each
- **on LMS progress insert/update** (on `lms_progress` table): Insert an update record for the specific student whose progress changed
- **on CA project insert/update** (on `ca_projects` table): Look up all students in that project's section and insert an update record for each

### 3. Edge Function Changes (`student-auth`)

- Add `'content_updates'` as a new valid `dataType` in the get-data endpoint
- Query `student_content_updates` filtered by student_id, ordered by created_at descending, limited to recent 20
- Add `'mark_update_read'` as a new valid action to mark individual updates as read
- Add `'mark_all_updates_read'` action to mark all updates as read

### 4. Frontend Hook Update (`useStudentApi.tsx`)

- Add `'content_updates'` to the `DataType` union
- Add `'mark_update_read'` and `'mark_all_updates_read'` to the `ActionType` union

### 5. New Component: `StudentUpdatesPanel`

Located at `src/components/student/StudentUpdatesPanel.tsx`:
- Fetches content updates via the student API
- Displays as a card list similar to NoticesPanel
- Each item is clickable and uses `react-router-dom`'s `useNavigate` to go to the target page
- Maps update_type to route: quiz -> `/student-portal/quizzes`, lms -> `/student-portal/lms`, ca_project -> `/student-portal/ca-projects`
- Marks clicked updates as read
- Polls every 30 seconds (matching NoticesPanel pattern)
- Shows unread count badge in header

### 6. Student Portal Page Update (`StudentPortal.tsx`)

- Import and render `StudentUpdatesPanel` between the Notices panel and Quick Access section

