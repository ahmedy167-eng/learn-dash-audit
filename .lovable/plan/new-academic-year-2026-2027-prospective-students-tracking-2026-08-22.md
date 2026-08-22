New Academic Year 2026/2027 Prospective Students Tracking

Goal
Add a dedicated admin-only registry where the Super Admin can record students expected for the 2026/2027 academic year. Each record stores the student's full name, student ID, a free-text track number, and a per-week status for weeks 1-15. The feature is separate from the active Students table so the current year is not polluted until students are formally enrolled.

What we will build

Database
- New table `public.prospective_students`:
  - `id` uuid primary key default gen_random_uuid()
  - `full_name` text not null
  - `student_id` text not null
  - `track_number` text
  - `academic_year` text not null default '2026/2027'
  - `weeks` jsonb not null default '{}'::jsonb
  - `status` text not null default 'Pending' -- e.g., Pending, Confirmed, Withdrawn, Enrolled
  - `notes` text
  - `created_by` uuid references auth.users(id) not null
  - `created_at` timestamptz not null default now()
  - `updated_at` timestamptz not null default now()
  - unique (`student_id`, `academic_year`)
- GRANT SELECT, INSERT, UPDATE, DELETE to authenticated; GRANT ALL to service_role.
- Enable RLS and add an admin-only policy using `public.has_role(auth.uid(), 'admin')`.
- Add a trigger to update `updated_at` on row update.
- Update `supabase/integrations/supabase/types.ts` generated types to include the new table.

Admin UI
- New component `src/components/admin/ProspectiveStudentsManagement.tsx`.
- Insert it into `src/pages/Admin.tsx` below the Guest Students card (only rendered for `isAdmin`).
- The component includes:
  - Header with count, academic year filter, and an export/refresh toolbar.
  - Search by name, student ID, or track number.
  - Table columns: Full Name, Student ID, Track Number, Status, Weeks 1-15 (compact badges), Notes, Actions.
  - Add/Edit dialog with fields: Full Name, Student ID, Track Number, Status, Notes, and a 15-week grid of small status dropdowns.
  - Inline status chips on the table for quick viewing.
  - Delete with confirmation.
- Use existing shadcn/ui components (Card, Table, Dialog, Select, Input, Button, Badge) to match the current admin design.

Bulk import
- Add an "Import from Excel" button in the prospective-students component that opens a file upload dialog.
- Use the already-installed `exceljs` library to parse the uploaded file.
- Required columns: `Full Name`, `Student ID`. Optional: `Track Number`, `Status`, `Notes`, and `Week 1` through `Week 15`.
- Validate rows before inserting; show a summary toast: created count, skipped count, and any duplicate student IDs.
- After import, refresh the list.
- Provide a "Download template" link so the admin can fill the correct format before uploading.

Security & access
- Visible only to Super Admin (`isAdmin` from `usePermissions`).
- No teacher access; no student access.
- Row-level security enforced server-side via `has_role`.
- `created_by` stores the admin user for audit purposes.

Out of scope
- Converting a prospective student into an active student automatically (can be added later).
- Exposing this list to teachers or students.
- Email / notification workflows.
- Multiple academic years beyond selecting a filter.

Acceptance criteria
- Admin sees a "2026/2027 Prospective Students" card on the Admin dashboard.
- Admin can add a prospective student manually with name, ID, track number, status, notes, and week-by-week status.
- Admin can upload an Excel file with the required columns and import many students at once.
- Admin can edit or delete prospective records.
- Duplicate `student_id` values for the same academic year are rejected.
- Non-admin users do not see the feature or the data.
