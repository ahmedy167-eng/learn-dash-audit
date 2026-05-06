# Diary / Notebook Feature

A new "Diary" page where you can write dated, time-stamped notes organised by weekday, set calendar reminders, and export to PDF or Word.

## Layout

- New sidebar item **Diary** → route `/diary`
- Left panel: 7 weekday tabs (Mon, Tue, Wed, Thu, Fri, Sat, Sun) — each acts as a notebook folder
- Right panel: list of notes for the selected weekday + editor for the selected note
- "New note" button creates an entry under the active weekday

## Note structure

Each note has:
- **Date** (date picker, defaults to today)
- **Time** (time picker)
- **Title**
- **Content** (rich text area)
- **Reminder time** (optional) — shows a 🔔 bell icon
- Belongs to one weekday folder (Mon–Sun)

## Actions per note

- ✏️ Edit / 💾 Save / 🗑️ Delete
- 📄 **Download as PDF** (single note)
- 📝 **Download as Word** (.docx, single note)
- 🔔 **Set reminder** → downloads an `.ics` calendar file the user opens in Google/Apple/Outlook Calendar (one-tap import — no Google account connection required)

## Folder-level actions

For the active weekday folder:
- 📄 **Export folder as PDF** (all notes combined, ordered by date/time)
- 📝 **Export folder as Word**

## Database

New table `diary_notes`:
- `id`, `user_id`, `weekday` (text: Monday…Sunday), `note_date` (date), `note_time` (time), `title`, `content`, `reminder_at` (timestamptz, nullable), `created_at`, `updated_at`
- RLS: users can CRUD only their own notes (`auth.uid() = user_id`), admins can view all (matching existing pattern)

## Technical details

- PDF export: `jspdf` (lightweight, already common in Lovable projects)
- Word export: `docx` package → generates `.docx` Blob, triggered with `file-saver`
- ICS file: small inline generator (no library needed) building a `VEVENT` with `DTSTART`, `SUMMARY`, `DESCRIPTION`, `VALARM` trigger 10 min before
- Files: new `src/pages/Diary.tsx`, `src/hooks/useDiary.tsx`, `src/lib/diary-export.ts` (pdf/docx/ics helpers), sidebar entry in `src/components/layout/Sidebar.tsx`, route in `src/App.tsx`
- Uses existing UI primitives (Card, Tabs, Dialog, Button, Input, Textarea)

## Out of scope

- Live Google Calendar sync (would require each user to OAuth with Google). The `.ics` download lets you add events to any calendar in one click without that setup.
