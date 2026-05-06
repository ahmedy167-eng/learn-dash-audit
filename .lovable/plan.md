## Problem

Clicking **Teaching**, **Meetings**, or **Research** in the sidebar shows nothing because no notes have ever been saved with those categories. Currently every new note defaults to **Personal** (or whatever filter was active) and users rarely change it manually, so all 5 existing notes are stuck on `Personal` / `Tasks` / `Ideas`.

The filter logic itself is working correctly — it's a *data* problem, not a UI bug.

## Solution: Auto-categorize notes

### 1. Auto-detect category on save (new notes)
Extend the existing `diary-ai` edge function with a lightweight `categorize` action that returns one of the 6 categories based on the note's title + content. Call it from `useDiary.update()` (debounced, only when content meaningfully changes) so each note gets an accurate category without user effort.

### 2. One-time backfill for existing notes
Add a small **"Auto-categorize all entries"** button in the sidebar (under Insights/Search tools). Clicking it loops through all the user's notes, calls the `categorize` action for each, and updates the `category` column. Shows a progress toast.

### 3. Make manual override easy
The editor already has a `CategoryChip` picker — keep it. Users can always overrule the AI choice.

## Files to change

- `supabase/functions/diary-ai/index.ts` — add `action: 'categorize'` branch returning `{ category: DiaryCategory }` from Lovable AI (`google/gemini-2.5-flash-lite`, fast + cheap).
- `src/hooks/useDiary.tsx` — new `categorize(id)` helper that invokes the function and updates the row.
- `src/pages/Diary.tsx` — new `handleBackfillCategories()` that iterates `notes` and calls `categorize` with a progress toast; also auto-call `categorize` after AI reflection / on first save when category is still the default.
- `src/components/diary/DiarySidebar.tsx` — add a small "Auto-categorize" button in the Tools section, plus an `onAutoCategorize` prop.

## Out of scope
- No database schema changes (the `category` column already exists).
- No changes to the filter logic — it's correct.
- No changes to the calendar / editor layout from previous turns.