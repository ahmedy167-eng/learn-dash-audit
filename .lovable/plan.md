

# Excel Import/Export for Student Register

## Overview

This feature adds two capabilities to the Register page:
1. **Download Template** - Download an Excel file with the correct column headers (Full Name, Student ID) for a specific section
2. **Upload & Import** - Upload an Excel file to bulk-add students to the selected section

Students can then use their Full Name + Student ID from the imported data to log in to the Student Portal.

---

## How It Will Work

### For Admin (Register Page)

**Step 1: Download Template**
- Select a section from the dropdown
- Click "Download Template" button
- An Excel file downloads with:
  - Pre-filled headers: `Full Name`, `Student ID`
  - Sheet named after the section (e.g., "Class A")
  - Empty rows ready for data entry

**Step 2: Fill in the Excel**
- Open the downloaded file in Excel/Google Sheets
- Enter student names and IDs in each row
- Save the file

**Step 3: Upload & Import**
- Click "Import from Excel" button
- Select the filled Excel file
- System reads the file and shows a preview of students to be added
- Confirm to import all students into the selected section

**Step 4: Students Can Login**
- Students go to Student Login page
- Enter their Full Name and Student ID exactly as imported
- They gain access to their Student Portal with quizzes, LMS, and CA Projects

---

## Technical Implementation

### New Dependency Required

Add the `xlsx` package (SheetJS) for reading and writing Excel files:
```bash
npm install xlsx
```

### File: `src/pages/Register.tsx`

**New Imports:**
```typescript
import * as XLSX from 'xlsx';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
```

**New State Variables:**
```typescript
const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
const [importPreview, setImportPreview] = useState<{full_name: string; student_id: string}[]>([]);
const [isImporting, setIsImporting] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

**New Function: Download Template**
```typescript
const downloadTemplate = () => {
  if (!selectedSection) return;
  
  // Create workbook with headers
  const ws = XLSX.utils.aoa_to_sheet([
    ['Full Name', 'Student ID'],
    ['', ''], // Empty row as example
  ]);
  
  // Set column widths
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, selectedSection.name);
  
  // Download file
  XLSX.writeFile(wb, `${selectedSection.name}_Student_Template.xlsx`);
  toast.success('Template downloaded!');
};
```

**New Function: Handle File Upload**
```typescript
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const data = new Uint8Array(event.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON (skip header row)
    const jsonData = XLSX.utils.sheet_to_json<{[key: string]: string}>(worksheet);
    
    // Map to our format (handle different column name variations)
    const students = jsonData.map(row => ({
      full_name: row['Full Name'] || row['full_name'] || row['Name'] || '',
      student_id: row['Student ID'] || row['student_id'] || row['ID'] || '',
    })).filter(s => s.full_name.trim() && s.student_id.trim());
    
    if (students.length === 0) {
      toast.error('No valid student data found. Make sure columns are "Full Name" and "Student ID"');
      return;
    }
    
    setImportPreview(students);
    setIsImportDialogOpen(true);
  };
  
  reader.readAsArrayBuffer(file);
  e.target.value = ''; // Reset input
};
```

**New Function: Confirm Import**
```typescript
const confirmImport = async () => {
  if (!selectedSectionId || importPreview.length === 0) return;
  
  setIsImporting(true);
  
  try {
    // Prepare student records
    const studentsToInsert = importPreview.map(s => ({
      user_id: user?.id,
      full_name: s.full_name.trim(),
      student_id: s.student_id.trim(),
      section_id: selectedSectionId,
      present_count: 0,
      late_count: 0,
      absent_count: 0,
    }));
    
    const { error } = await supabase
      .from('students')
      .insert(studentsToInsert);
    
    if (error) throw error;
    
    toast.success(`Successfully imported ${importPreview.length} students!`);
    setIsImportDialogOpen(false);
    setImportPreview([]);
    fetchStudentsForSection(selectedSectionId);
  } catch (error: any) {
    console.error('Import error:', error);
    toast.error(error.message || 'Failed to import students');
  } finally {
    setIsImporting(false);
  }
};
```

**UI Changes - Add Buttons Next to "Add Student":**

Location: Lines 356-405 (inside the CardHeader actions area)

```tsx
<div className="flex gap-2">
  {/* Download Template Button */}
  <Button variant="outline" onClick={downloadTemplate}>
    <Download className="mr-2 h-4 w-4" />
    Download Template
  </Button>
  
  {/* Import from Excel Button */}
  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
    <Upload className="mr-2 h-4 w-4" />
    Import Excel
  </Button>
  
  {/* Hidden file input */}
  <input
    ref={fileInputRef}
    type="file"
    accept=".xlsx,.xls"
    className="hidden"
    onChange={handleFileUpload}
  />
  
  {/* Existing Add Student Dialog */}
  <Dialog>...</Dialog>
</div>
```

**New Dialog: Import Preview**
```tsx
<Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
  <DialogContent className="max-w-2xl max-h-[80vh]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5" />
        Import Students Preview
      </DialogTitle>
      <DialogDescription>
        Review the students to be added to {selectedSection?.name}. 
        These students will use their Full Name and Student ID to login.
      </DialogDescription>
    </DialogHeader>
    
    <div className="max-h-[400px] overflow-y-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Student ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {importPreview.map((student, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{student.full_name}</TableCell>
              <TableCell>{student.student_id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    
    <DialogFooter>
      <div className="flex items-center justify-between w-full">
        <span className="text-sm text-muted-foreground">
          {importPreview.length} student(s) will be added
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmImport} disabled={isImporting}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import All
          </Button>
        </div>
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## User Flow Summary

```text
ADMIN WORKFLOW:
┌─────────────────────────────────────────────────────────────────┐
│  1. Select Section → "Class A"                                   │
├─────────────────────────────────────────────────────────────────┤
│  2. Click "Download Template"                                    │
│     → Downloads: Class_A_Student_Template.xlsx                   │
├─────────────────────────────────────────────────────────────────┤
│  3. Fill in Excel:                                               │
│     | Full Name      | Student ID |                              │
│     | Ahmed Ali      | 12345      |                              │
│     | Kevin Smith    | 12346      |                              │
│     | Sarah Johnson  | 12347      |                              │
├─────────────────────────────────────────────────────────────────┤
│  4. Click "Import Excel" → Select filled file                   │
│     → Preview shows 3 students                                   │
├─────────────────────────────────────────────────────────────────┤
│  5. Click "Import All"                                           │
│     → "Successfully imported 3 students!"                        │
│     → Table refreshes with new students                          │
└─────────────────────────────────────────────────────────────────┘

STUDENT LOGIN:
┌─────────────────────────────────────────────────────────────────┐
│  Student goes to /student-login                                  │
│  Enters: Full Name = "Ahmed Ali"                                 │
│          Student ID = "12345"                                    │
│  → Logged in! Can access quizzes, LMS, CA Projects              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Update

| File | Changes |
|------|---------|
| `package.json` | Add `xlsx` dependency |
| `src/pages/Register.tsx` | Add download template + import Excel functionality |

---

## Dependencies

```bash
npm install xlsx
```

This package is well-maintained (SheetJS) and handles both reading and writing Excel files in the browser.

