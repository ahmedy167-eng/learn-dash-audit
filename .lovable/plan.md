

# Enhance Lesson Plan with Save Button, Validation, and Document Downloads

## Overview
This plan addresses the reported issues with the lesson plan feature and adds new capabilities:

1. Add a clear "Save" button that's always visible
2. Fix data persistence so edited information is retained properly
3. Fix Word document export to include all entered data
4. Add required field validation (all fields must be filled)
5. Add tables to the Word document for better formatting
6. Add PDF download option alongside Word document

---

## Issues to Fix

### Current Problems Identified
1. The form has a submit button at the bottom labeled "Create Plan" or "Update Plan" - but users may not see it as a clear "Save" action
2. Word document download uses `plan` data from the database record, not the current form state - if the data wasn't saved properly, the download shows nothing
3. No validation requiring users to fill all fields before saving
4. Word document uses simple paragraphs instead of structured tables

---

## What Will Change

### 1. Save Button Improvements
- Make the Save button more prominent and always visible
- Add a sticky footer with the Save button at the bottom of the form
- Clear labeling: "Save Lesson Plan" instead of "Create/Update Plan"

### 2. Required Field Validation
All fields will be required before saving:
- Title, Course, Week
- Section Number, Building, Class Room
- Lesson Date
- Lesson Skill
- Aim (Main and Subsidiary)
- Objectives
- Lead-in & Presentation
- Practice Exercises
- Productive Activities
- Reflection

Show validation errors for any empty fields.

### 3. Word Document with Tables
The exported Word document will have a professional format with tables:

```text
+----------------------------------+
|        LESSON PLAN               |
|     [Title - Date]               |
+----------------------------------+

+---------------+------------------+
| Course        | [Course Value]   |
+---------------+------------------+
| Week          | [Week Value]     |
+---------------+------------------+
| Section       | [Section Value]  |
+---------------+------------------+
| Building      | [Building Value] |
+---------------+------------------+
| Room          | [Room Value]     |
+---------------+------------------+
| Date          | [Date Value]     |
+---------------+------------------+

+----------------------------------+
| LESSON CONTENT                   |
+----------------------------------+
| Lesson Skill: [Content]          |
| Aim (Main): [Content]            |
| Aim (Subsidiary): [Content]      |
| Objectives: [Content]            |
| Lead-in: [Content]               |
| Practice: [Content]              |
| Activities: [Content]            |
| Reflection: [Content]            |
+----------------------------------+
```

### 4. PDF Download Option
Add a second download button for PDF format using jsPDF with tables.

### 5. Dual Download Buttons on Cards
Each lesson plan card will show:
- "PDF" button - downloads as PDF with tables
- "Word" button - downloads as Word doc with tables

---

## Technical Details

### File: `src/pages/LessonPlan.tsx`

**1. Add Validation Function**
Create a `validateForm()` function that checks all required fields and returns error messages.

**2. Update handleSubmit**
- Call `validateForm()` before saving
- Show toast errors for each missing field
- Prevent submission if validation fails

**3. Update downloadWord Function**
Import `Table`, `TableRow`, `TableCell`, `WidthType` from docx library and create:
- Header table with title and date
- Details table with course, week, location info
- Content table with lesson plan sections

**4. Add downloadPdf Function**
Using jsPDF with autoTable plugin:
- Create professional PDF layout with tables
- Include all lesson plan information
- Format with proper styling

**5. Update Form UI**
- Add `required` markers to all field labels
- Make submit button more prominent with sticky positioning
- Add validation feedback on blur for empty fields

**6. Update Card Download Buttons**
Replace single download button with two buttons:
- PDF download button
- Word download button

**7. Dependencies**
Need to install `jspdf-autotable` for PDF table support (jspdf is already installed).

---

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add `jspdf-autotable` dependency |
| `src/pages/LessonPlan.tsx` | Add validation, fix Word tables, add PDF download |

---

## Validation Rules

All fields will be required with user-friendly error messages:

| Field | Error Message |
|-------|---------------|
| Title | "Title is required" |
| Course | "Please select a course" |
| Week | "Please select a week" |
| Section Number | "Section number is required" |
| Building | "Building is required" |
| Room | "Class room is required" |
| Lesson Date | "Please select a lesson date" |
| Lesson Skill | "Lesson skill is required" |
| Aim (Main) | "Main aim is required" |
| Aim (Subsidiary) | "Subsidiary aim is required" |
| Objectives | "Objectives are required" |
| Lead-in & Presentation | "Lead-in & presentation is required" |
| Practice Exercises | "Practice exercises are required" |
| Productive Activities | "Productive activities are required" |
| Reflection | "Reflection is required" |

---

## Download Format Examples

### Word Document Structure
- Professional header with title and date
- Details table with course, location, and timing info
- Content sections with clear headers and text
- Proper spacing and formatting

### PDF Document Structure
- Similar layout to Word document
- Tables for details and content sections
- Professional styling with borders and shading

