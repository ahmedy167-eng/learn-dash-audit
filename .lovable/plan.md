## Goal
Replace the always-open inline mini-calendar in `DiarySidebar` with a clean trigger button (matching the uploaded screenshot) that opens the full calendar in a popover below.

## Root Cause of Current Misalignment
The shadcn `Calendar` caption uses absolutely-positioned prev/next buttons. Inside the narrow sidebar (`~260px`), they collide with the centered month label and the day-grid padding, so the arrows appear pushed off / overlapping. Rendering the calendar in a wider popover (auto width) fixes alignment automatically.

## Changes

### `src/components/diary/DiarySidebar.tsx`
1. Import `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover` and `CalendarIcon` from `lucide-react`.
2. Replace the current "Mini calendar" block (lines 90–120) with a Popover:
   - **Trigger**: a full-width button styled like the screenshot — left side shows current month label (e.g. `May 2026`, derived from `selectedDate ?? new Date()` via `format(d, 'MMMM yyyy')` from `date-fns`), right side shows a `CalendarIcon`. Uses the existing `glass-diary` / rounded-xl border styling so it blends with sibling cards.
   - **PopoverContent**: `align="start"`, `className="w-auto p-0 pointer-events-auto"`, contains the existing `<Calendar>` with the same `DayContent` custom renderer (mood dots preserved).
3. Keep `mode="single"`, `selected`, `onSelect` wiring unchanged so date filtering behavior is identical.

### No other files need changes
- The earlier `calendar.tsx` arrow-alignment fix stays in place and will render correctly inside the wider popover.
- No data/logic changes.

## Visual Result
- Sidebar gets a compact, premium "May 2026 [icon]" pill instead of a 280px calendar grid.
- Tapping it drops a full calendar popover below with properly aligned prev/next arrows and the existing mood-color dots.
