# Prospective Students — Section Assignment

## Goal
Let the admin organize 2026/2027 prospective students into sections (e.g. 6490, 87691). Sections are managed by the admin inside the registry, each prospective student can belong to one section, and many students can be selected and transferred to a section at once.

## Database (one migration)

- New table `public.prospective_sections`:
  - `id` uuid primary key default gen_random_uuid()
  - `section_number` text not null unique
  - `label` text (optional friendly name)
  - `created_by` uuid references auth.users(id) not null
  - `created_at` / `updated_at` timestamptz not null default now()
- Seed the two existing sections: `6490` and `87691`.
- Alter `public.prospective_students`: add `section_id` uuid null references `public.prospective_sections(id)` on delete set null.
- GRANT SELECT/INSERT/UPDATE/DELETE to authenticated and ALL to service_role on the new table; enable RLS; admin-only policies using `public.has_role(auth.uid(), 'admin')` (same pattern as `prospective_students`).
- `updated_at` trigger via existing `public.update_updated_at_column()`.

## Admin UI — `src/components/admin/ProspectiveStudentsManagement.tsx`

1. **Manage Sections dialog** (new "Sections" button in the card header):
   - Lists all sections with their student counts.
   - Add a section (number + optional label), delete a section (students in it become Unassigned, not deleted).
2. **Add/Edit Student form**: new "Section" dropdown populated from `prospective_sections`, with an "Unassigned" option.
3. **Table**:
   - New "Section" column showing a badge with the section number (or "—").
   - Checkbox column: per-row checkbox + header "select all" (applies to the currently filtered rows).
4. **Bulk assign bar**: when one or more rows are selected, a bar appears above the table showing "N selected", a section dropdown, an "Assign" button, and a "Clear section" option. Applies the change to all selected records in one update and clears the selection.
5. **Filter**: a section filter dropdown next to search (All sections / Unassigned / each section).
6. **Excel import**: optional `Section` column — if the value matches an existing section number the student is assigned to it; unknown values are left Unassigned (reported in the summary toast). Template download updated with the `Section` column.

## Types
- Update `src/integrations/supabase/types.ts` for the new table and column (regenerated after migration approval).

## Security & access
- Admin-only everywhere: UI only renders on the Admin dashboard; RLS enforces `has_role(auth.uid(), 'admin')` server-side.
- Deleting a section never deletes students (FK is `ON DELETE SET NULL`).

## Acceptance criteria
- Admin can create/delete sections (6490 and 87691 pre-seeded).
- Add/Edit student form includes a Section dropdown.
- Admin can tick checkboxes for several students and assign them all to a section in one action.
- Table shows each student's section and can be filtered by section.
- Excel import respects an optional Section column.
- Non-admin users see neither the UI nor the data.
