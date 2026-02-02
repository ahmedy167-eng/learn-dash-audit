

# Fix Stage Tab Overlap and Create Consistent Design

## Problem Identified

The current TabsList has a fixed height of `h-10` (40px), but the code tries to stack the stage label AND deadline date vertically inside each tab. This causes:
1. **Overlap**: The date ("Mar 1") overlaps with "Ideas" label
2. **Inconsistency**: Some projects show dates, others don't, creating visual inconsistency

## Solution Approach

Create a cleaner, more creative design that:
1. Shows only the stage name + submission status (checkmark) in the tabs
2. Moves deadline information to a more prominent location outside the tabs
3. Adds visual polish for a modern look

## Design Changes

### 1. Simplified Tab Design

Each tab will show:
- Short stage name (Ideas, First, Second, Final)
- Green checkmark icon if submitted (inline, not stacked)

No deadline date inside the tab - this eliminates the overlap entirely.

### 2. Enhanced TabsList Styling

Update the TabsList to have better visual appearance:
- Increase height slightly for better touch targets
- Add consistent spacing and rounded corners
- Active tab gets a distinct highlight color

### 3. Deadline Display Moved to Tab Content

The deadline badge will appear prominently at the top of each TabsContent area (already exists at line 327-338), keeping the tabs clean and the deadline info visible.

---

## Technical Changes

### File: `src/pages/student/StudentCAProjects.tsx`

**Lines 295-318 - Simplify TabsTrigger content:**

Current (problematic):
```tsx
<TabsTrigger key={stage.value} value={stage.value} className="relative flex flex-col gap-0.5 py-2">
  <div className="flex items-center gap-1">
    <span className="text-xs sm:text-sm">{stage.label.split(' ')[0]}</span>
    {submission && (
      <CheckCircle className="h-3 w-3 text-green-500" />
    )}
  </div>
  {deadlineStatus && (
    <span className={cn("text-[10px] flex items-center gap-0.5", deadlineStatus.className)}>
      <Calendar className="h-2.5 w-2.5" />
      {deadlineStatus.text}
    </span>
  )}
</TabsTrigger>
```

New (clean inline design):
```tsx
<TabsTrigger 
  key={stage.value} 
  value={stage.value} 
  className="flex items-center gap-1.5 px-4 py-2"
>
  <span className="text-xs sm:text-sm font-medium">{stage.label.split(' ')[0]}</span>
  {submission && (
    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
  )}
</TabsTrigger>
```

**Lines 295 - Update TabsList for better styling:**

Current:
```tsx
<TabsList className="grid w-full grid-cols-4">
```

New:
```tsx
<TabsList className="grid w-full grid-cols-4 h-auto p-1.5 gap-1">
```

This allows the tabs to auto-size properly and adds spacing between tabs.

---

## Visual Result

Before:
```text
┌──────────────────────────────────────────────────┐
│  Ideas    │   First   │  Second   │   Final     │ ← Overlap!
│  Mar 1    │           │           │             │
└──────────────────────────────────────────────────┘
```

After:
```text
┌──────────────────────────────────────────────────────┐
│ Ideas ✓  │  First ✓  │  Second ✓  │  Final ✓        │ ← Clean!
└──────────────────────────────────────────────────────┘

📅 Deadline: March 1st, 2026                            ← Clear deadline below
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/student/StudentCAProjects.tsx` | Simplify TabsTrigger content - remove stacked deadline, keep inline label + checkmark |

---

## Summary

- Remove deadline date from inside the tabs (no more overlap)
- Keep the stage label + checkmark in a single horizontal line
- The deadline banner already exists in the TabContent area (lines 327-338) and will remain as the primary deadline indicator
- Result: Clean, consistent design matching the better-looking screenshot (#2)

