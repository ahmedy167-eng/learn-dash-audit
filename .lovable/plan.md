

# Enhance Virtual Audit with Downloads, Search, and Cover Class Option

## Overview
This plan enhances the Virtual Audit page with the following features:

1. Add search functionality to filter previous audits
2. Add Save button to the audit history section (for editing existing audits)
3. Add PDF and Word document download options with professional tables
4. Add a new "Cover Class Virtual Audit" option as a separate form

---

## What Will Change

### 1. Audit History Enhancements

**Search Bar:**
- Add a search input above the audit history table
- Filter audits by teacher name, campus, course, section number, week, or ELSD ID

**Download Buttons:**
- Add PDF and Word download buttons for each audit record
- Both formats will include professional tables with all audit information

**Edit/Save Capability:**
- Each audit row will have an Edit button
- Clicking Edit opens the form with the audit data pre-filled
- A prominent "Save Changes" button allows updating the audit

### 2. Document Exports with Tables

**Word Document Structure:**
```text
+----------------------------------+
|       VIRTUAL AUDIT RECORD       |
|        [Date of Teaching]        |
+----------------------------------+

+------------------+---------------+
| Teacher Name     | [Value]       |
+------------------+---------------+
| ELSD ID          | [Value]       |
+------------------+---------------+
| Campus           | [Value]       |
+------------------+---------------+
| Section Number   | [Value]       |
+------------------+---------------+
| Week             | [Value]       |
+------------------+---------------+
| Date of Teaching | [Value]       |
+------------------+---------------+
| Teaching Mode    | [Value]       |
+------------------+---------------+
| Course           | [Value]       |
+------------------+---------------+
| Book             | [Value]       |
+------------------+---------------+
| Unit             | [Value]       |
+------------------+---------------+
| Page             | [Value]       |
+------------------+---------------+
| No. of Students  | [Value]       |
+------------------+---------------+
| Comments         | [Value]       |
+------------------+---------------+
```

**PDF Document:**
- Same table structure as Word document
- Professional styling with headers and grid borders

### 3. Cover Class Virtual Audit

A new toggle at the top of the page will allow users to choose between:
- **Virtual Audit** (current form)
- **Cover Class Virtual Audit** (new form with similar fields)

**Database:**
- New table: `cover_class_audits` with fields:
  - id, user_id, teacher_name, elsd_id
  - original_teacher_name (who was being covered)
  - campus, section_number, week
  - date_of_teaching, teaching_mode
  - course, book, unit, page
  - number_of_students, comments
  - created_at, updated_at

**Cover Class Form:**
- Similar fields as Virtual Audit
- Additional field: "Original Teacher Name" (the teacher being covered)
- Separate history tab showing only cover class audits

---

## Technical Details

### Database Migration
Create new table `cover_class_audits`:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| user_id | uuid | Yes | Foreign key to auth.users |
| teacher_name | text | Yes | Cover teacher's name |
| original_teacher_name | text | Yes | Teacher being covered |
| elsd_id | text | Yes | ELSD identifier |
| campus | text | Yes | Campus location |
| section_number | text | Yes | Section number |
| week | text | Yes | Week number |
| date_of_teaching | date | Yes | Teaching date |
| teaching_mode | text | Yes | Face to Face / Virtual |
| course | text | Yes | Course code |
| book | text | Yes | Book name |
| unit | text | Yes | Unit number |
| page | text | No | Page number |
| number_of_students | integer | No | Student count |
| comments | text | No | Additional comments |
| created_at | timestamp | Yes | Record creation time |
| updated_at | timestamp | Yes | Last update time |

### File Changes: `src/pages/VirtualAudit.tsx`

**New Imports:**
- Add `Document`, `Packer`, `Paragraph`, `TextRun`, `Table`, `TableRow`, `TableCell`, `WidthType`, `BorderStyle`, `AlignmentType` from docx
- Add `saveAs` from file-saver
- Add `jsPDF` from jspdf
- Add `autoTable` from jspdf-autotable
- Add `Search`, `Pencil`, `FileText`, `Download` icons

**New State Variables:**
- `searchQuery` - for filtering audits
- `filteredAudits` - filtered list based on search
- `editingId` - ID of audit being edited (null for new)
- `auditType` - 'virtual' | 'cover' to toggle between forms
- `coverAudits` - array of cover class audits
- `originalTeacherName` - additional field for cover class form

**New Functions:**
1. `filterAudits()` - Filter audits based on search query
2. `downloadAuditWord(audit)` - Generate Word document with tables
3. `downloadAuditPdf(audit)` - Generate PDF document with tables
4. `editAudit(audit)` - Load audit data into form for editing
5. `handleUpdateAudit()` - Update existing audit record
6. `fetchCoverAudits()` - Fetch cover class audits
7. `handleCoverSubmit()` - Submit new cover class audit

**UI Changes:**
1. Add toggle buttons at top: "Virtual Audit" | "Cover Class Audit"
2. Add search bar in Audit History tab
3. Add Edit, PDF, Word buttons to each table row
4. Update form with Save/Update button logic
5. Create separate tabs for cover class history

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Create `cover_class_audits` table with RLS policies |
| `src/pages/VirtualAudit.tsx` | Add search, downloads, edit, and cover class functionality |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

---

## UI Layout Preview

**Top Section (Toggle):**
```text
+--------------------------------------------------+
| [Virtual Audit] [Cover Class Virtual Audit]      |
+--------------------------------------------------+
```

**Audit History Tab:**
```text
+--------------------------------------------------+
| Search: [________________________] 🔍            |
+--------------------------------------------------+
| Date    | Teacher | Campus | Course | Actions    |
|---------|---------|--------|--------|------------|
| Jan 29  | Name    | Olaysha| ENGL101| ✏️ PDF Word|
| Jan 28  | Name    | Diriyah| ENGL102| ✏️ PDF Word|
+--------------------------------------------------+
```

---

## Search Functionality

The search will filter audits by matching any of these fields:
- Teacher name
- ELSD ID  
- Campus
- Section number
- Course
- Week
- Book
- Comments

---

## Cover Class Audit Fields

Same as Virtual Audit, plus:
- **Original Teacher Name** - The teacher whose class is being covered

This allows tracking who covered which class and provides complete audit trail for cover classes separately from regular virtual audits.

