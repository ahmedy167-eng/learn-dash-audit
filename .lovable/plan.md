
# Update Comments Feature to Use Dialog Window

## Overview
Change the current inline comments display to a cleaner approach where:
1. Comments are hidden by default - only show a comment icon
2. Clicking the icon opens a dialog window to view and edit comments
3. The table remains clean without visible comment text

---

## Current Behavior
- Comments are shown inline in the table as text
- Editing happens inline with input field appearing in the table cell
- Text is visible and takes up table space

## New Behavior
- Only a comment icon (MessageSquare) is shown in the table
- Icon changes appearance based on whether comment exists:
  - Empty: muted/outline icon
  - Has comment: filled/highlighted icon with indicator
- Clicking the icon opens a Dialog with:
  - Student name in header
  - Textarea to view/edit the comment
  - Save and Cancel buttons

---

## What Will Change

### UI Layout

**Table Cell (Comments Column):**
```text
Before: "This student needs extra help..." [icon]
After:  [💬 icon only]
```

**Dialog Window:**
```text
+----------------------------------+
|  Comments for [Student Name]  X |
+----------------------------------+
| +------------------------------+ |
| |                              | |
| | [Textarea for comments]      | |
| |                              | |
| +------------------------------+ |
|                                  |
|           [Cancel] [Save]        |
+----------------------------------+
```

---

## Technical Details

### File: `src/pages/Register.tsx`

**1. Update State Variables**
- Change `editingCommentId` to `commentDialogStudent` (store the full student object or null)
- Keep `editingCommentText` for the textarea value

**2. Update Functions**
- `openCommentDialog(student)` - Open dialog and load existing comment
- `closeCommentDialog()` - Close dialog and reset state
- `saveComment()` - Save comment and close dialog (existing logic)

**3. Update Table Cell (Comments Column)**
Replace the inline editing UI with:
- A simple button/icon that opens the dialog
- Show different icon states:
  - No comment: outline MessageSquare icon
  - Has comment: filled MessageSquare icon with a small indicator dot

**4. Add Comment Dialog**
Add a new Dialog component with:
- Header showing student name
- Textarea for viewing/editing the comment
- Cancel and Save buttons in footer

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Register.tsx` | Replace inline comments with dialog-based editing |

---

## Icon Indicators

| State | Visual |
|-------|--------|
| No comment | Muted gray outline icon |
| Has comment | Blue/primary colored icon with small dot indicator |

This keeps the table clean while making it easy to see which students have comments at a glance.
