
# Plan: Fix Quiz Panel Alignment and Equal Sizing

## Problem Identified

Looking at the Quizzes page layout, the two main panels (Quiz List on the left and Questions Panel on the right) have inconsistent heights and visual balance:

1. The left panel uses a 2-column span while the right uses 3-column span
2. Empty state placeholders have inconsistent padding (py-16 vs py-20)
3. The panels don't visually align at the same height despite having the same ScrollArea height

## Solution

Make both panels visually balanced with equal heights using consistent Card wrappers and matching internal dimensions.

---

## Technical Changes

### File: `src/pages/Quizzes.tsx`

**1. Wrap both panels in Card containers for visual consistency**
- Add a parent Card wrapper around each panel's content
- This ensures both sides have matching borders and backgrounds

**2. Standardize empty state padding**
- Change left panel empty state from `py-16` to `py-20`
- Ensures both empty states have identical visual weight

**3. Use flex layout with equal height containers**
- Apply `flex flex-col` to the grid children
- Use `flex-1` on the ScrollArea containers to fill available space equally

**4. Add minimum height to both panels**
- Apply `min-h-[600px]` to both panel cards
- Ensures consistent sizing regardless of content

---

## Code Changes Summary

```text
Lines 441-520 (Left Panel):
- Wrap content in a Card with min-h-[600px]
- Change empty state from py-16 to py-20
- Add flex layout for proper stretching

Lines 522-682 (Right Panel):  
- Wrap content in a matching Card with min-h-[600px]
- Keep py-20 for empty states (already consistent)
- Add flex layout for proper stretching
```

## Visual Outcome

After these changes:
- Both panels will have equal visual weight
- The border styling will be consistent on both sides
- Empty states will align perfectly
- Content areas will stretch to fill the same height
