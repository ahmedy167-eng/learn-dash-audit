## Issue

In the diary sidebar's mini calendar, the prev/next chevron arrows appear vertically misaligned with the "May 2026" caption label. This is caused by `src/components/ui/calendar.tsx`:

- `caption` uses `pt-1`, shifting the centered label down
- `nav_button_previous` / `nav_button_next` are positioned `absolute left-1` / `right-1` with no vertical anchor, so they sit at the top of the caption row instead of being centered against the label

## Fix

Edit `src/components/ui/calendar.tsx` only — a tiny, surgical change. No other files affected.

1. Vertically center the nav buttons inside the caption row by anchoring them to the middle:
   - `nav_button_previous`: `"absolute left-1 top-1/2 -translate-y-1/2"`
   - `nav_button_next`: `"absolute right-1 top-1/2 -translate-y-1/2"`
2. Optionally remove `pt-1` from `caption` (replace with `py-1`) so the label and arrows share the same baseline.

This keeps the shadcn calendar API intact and fixes alignment everywhere the calendar is used (diary sidebar, date pickers, etc.) without visual regressions.

## Files

- `src/components/ui/calendar.tsx` — adjust `caption`, `nav_button_previous`, `nav_button_next` class strings.
