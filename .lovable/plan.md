

# Add Location Details and Date Picker to Lesson Plan Form

## Overview
This plan adds new fields to the lesson plan creation form and removes the day dropdown, replacing it with a calendar date picker.

---

## What Will Change

### Form Changes
The "Create New Lesson Plan" dialog will be updated with:

1. **New Fields Added:**
   - Section Number - Text input for the section identifier
   - Building Number - Text input for the building location  
   - Class Room - Text input for the room number/name
   - Lesson Date - A calendar date picker (displayed in dd/MM/yyyy format like 29/1/2026)

2. **Removed:**
   - Day dropdown (Sunday-Thursday selector)

3. **Existing Features (Already Working):**
   - Word document download - Already implemented
   - Search for previous lesson plans - Already implemented with search bar

### Form Layout (After Changes)
```text
+------------------------------------------+
| Title *                                  |
+------------------------------------------+
| Course        | Week                     |
+------------------------------------------+
| Section Number | Building | Class Room   |
+------------------------------------------+
| Lesson Date [Calendar Picker]            |
+------------------------------------------+
| Lesson Skill                             |
+------------------------------------------+
| ... (remaining fields unchanged)         |
+------------------------------------------+
```

### Word Document Updates
The downloaded Word document will include the new location and date information:
- Section Number
- Building  
- Class Room
- Lesson Date (formatted as dd/MM/yyyy)

### Search Updates
The search functionality will be extended to also search by:
- Section number
- Building
- Room

---

## Technical Details

### 1. Database Migration
Add four new columns to the `lesson_plans` table:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `section_number` | text | Yes | Section identifier |
| `building` | text | Yes | Building number/name |
| `room` | text | Yes | Classroom number |
| `lesson_date` | date | Yes | Specific lesson date |

### 2. Update LessonPlan.tsx

**Import Changes:**
- Add `Calendar` component
- Add `Popover`, `PopoverContent`, `PopoverTrigger` components
- Add `CalendarIcon` from lucide-react

**New State Variables:**
- `sectionNumber` - for section number input
- `building` - for building number input
- `room` - for class room input
- `lessonDate` - for the selected date (Date | undefined)

**Form Structure Updates:**
- Remove the Day dropdown Select component
- Change Course/Week grid from 3 columns to 2 columns
- Add new row with Section Number, Building, Room inputs (3 columns)
- Add date picker using Popover + Calendar with format "dd/MM/yyyy"

**Data Handling Updates:**
- Include new fields in `planData` object when saving
- Load new fields in `editPlan` function when editing
- Clear new fields in `resetForm` function
- Add new fields to Word document generation

**Search Updates:**
- Add section_number, building, room to search filter

### 3. Update Calendar Component
Add `pointer-events-auto` class to ensure the calendar works correctly inside the dialog.

### 4. Code Cleanup
- Remove `DAYS` constant (line 20)
- Remove `day` state variable and its usage in form

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Add columns: `section_number`, `building`, `room`, `lesson_date` |
| `src/pages/LessonPlan.tsx` | Remove day dropdown, add new fields, update form layout |
| `src/components/ui/calendar.tsx` | Add `pointer-events-auto` for dialog compatibility |

---

## Visual Preview

After implementation, the form will look like:

**Course/Week Row (2 columns):**
- Course dropdown
- Week dropdown

**Location Row (3 columns):**
- Section Number input
- Building input
- Class Room input

**Date Row:**
- Date picker button showing selected date (e.g., "29/1/2026") or "Pick a date"

