## Goal
Remove the manual **Time** picker from the diary entry editor and replace it with an automatic, read-only timestamp.

## Where
`src/components/diary/DiaryEditor.tsx` — the meta row currently has two inputs: a `Date` picker and a `Time` picker (`note.note_time`).

## Changes
1. Delete the `Time` `<Input type="time">` block from the meta row.
2. In its place, render a small read-only timestamp chip showing when the entry was created/last updated, e.g.:
   - `Clock` icon + `format(new Date(note.created_at), 'h:mm a')`
   - Subtle muted styling (`text-xs text-muted-foreground`), no input affordance.
3. Keep the `Date` picker as-is (users still pick which day the entry belongs to).
4. Stop writing `note_time` from the editor. The field stays in the DB schema untouched (no data/logic changes), it just isn't user-editable anymore.
5. Remove `note_time` from the autosave dependency array since it's no longer edited here.

## Out of scope
- No DB migrations, no changes to `useDiary`, no changes to export logic.
- Sidebar, timeline, and PaperCard untouched.

## File to edit
- `src/components/diary/DiaryEditor.tsx`
