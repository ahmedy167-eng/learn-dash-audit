
# Fix Student Login & Add Bulk Delete Feature

## Overview

This plan addresses two issues:
1. **Student login failure** due to duplicate student records in the database
2. **Bulk delete feature** with a Select All/Unselect All toggle button

---

## Part 1: Fix Student Login Issue

### Problem

The student login fails with "Failed to verify credentials" because:
- Multiple students exist with the same name + ID (registered by different teachers)
- The query uses `.maybeSingle()` which throws an error when multiple rows match
- The error is caught and returns a generic failure message

### Solution

Change the query in `useStudentAuth.tsx` to handle multiple matches gracefully by using `.limit(1)` instead of `.maybeSingle()`.

### File: `src/hooks/useStudentAuth.tsx`

**Current code (lines 116-121):**
```typescript
const { data, error } = await supabase
  .from('students')
  .select('id, full_name, student_id, section_id, section_number, course, is_active')
  .ilike('full_name', name.trim())
  .eq('student_id', studentId.trim())
  .maybeSingle();
```

**New code:**
```typescript
const { data: students, error } = await supabase
  .from('students')
  .select('id, full_name, student_id, section_id, section_number, course, is_active')
  .ilike('full_name', name.trim())
  .eq('student_id', studentId.trim())
  .eq('is_active', true)
  .limit(1);

// Get first matching active student
const data = students?.[0] || null;
```

---

## Part 2: Bulk Delete Feature

### Feature Design

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  [Select All / Unselect All]                     [Delete Selected (3)]   │
├──────────────────────────────────────────────────────────────────────────┤
│ [✓] │ # │ Full Name         │ Student ID │ ... │ Actions               │
├──────────────────────────────────────────────────────────────────────────┤
│ [✓] │ 1 │ Ahmed Ali         │ 447102413  │ ... │ [Edit] [Delete]       │
│ [✓] │ 2 │ Mohammed Saleh    │ 447100945  │ ... │ [Edit] [Delete]       │
│ [ ] │ 3 │ Fahad Alotaibi    │ 447101234  │ ... │ [Edit] [Delete]       │
└──────────────────────────────────────────────────────────────────────────┘
```

### File: `src/pages/Register.tsx`

### Changes Required:

#### 1. Add New Imports
```typescript
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Square } from 'lucide-react';
```

#### 2. Add Selection State Variables
```typescript
// New state for bulk selection
const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
const [isBulkDeleting, setIsBulkDeleting] = useState(false);
```

#### 3. Add Selection Handler Functions

```typescript
// Toggle single student selection
const toggleStudentSelection = (studentId: string) => {
  setSelectedStudents(prev => {
    const newSet = new Set(prev);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    return newSet;
  });
};

// Toggle select all / unselect all
const toggleSelectAll = () => {
  if (selectedStudents.size === filteredStudents.length) {
    // All selected -> unselect all
    setSelectedStudents(new Set());
  } else {
    // Select all
    setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
  }
};

// Check if all students are selected
const allSelected = filteredStudents.length > 0 && 
  selectedStudents.size === filteredStudents.length;
```

#### 4. Clear Selection When Section Changes

```typescript
// In existing useEffect for selectedSectionId, add:
useEffect(() => {
  if (selectedSectionId) {
    fetchStudentsForSection(selectedSectionId);
  } else {
    setStudents([]);
  }
  // Clear selection when section changes
  setSelectedStudents(new Set());
}, [selectedSectionId]);
```

#### 5. Add Bulk Delete Function

```typescript
const bulkDeleteStudents = async () => {
  if (selectedStudents.size === 0) return;
  
  setIsBulkDeleting(true);
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .in('id', Array.from(selectedStudents));

    if (error) throw error;
    
    toast.success(`Successfully removed ${selectedStudents.size} student(s)`);
    setSelectedStudents(new Set());
    
    if (selectedSectionId) {
      fetchStudentsForSection(selectedSectionId);
    }
  } catch (error) {
    console.error('Error bulk deleting students:', error);
    toast.error('Failed to delete students');
  } finally {
    setIsBulkDeleting(false);
  }
};
```

#### 6. Add Bulk Actions Toolbar (Above Table)

Insert this above the `<Table>` component (around line 609):

```typescript
{filteredStudents.length > 0 && (
  <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSelectAll}
        className="gap-2"
      >
        {allSelected ? (
          <>
            <Square className="h-4 w-4" />
            Unselect All
          </>
        ) : (
          <>
            <CheckSquare className="h-4 w-4" />
            Select All
          </>
        )}
      </Button>
      <span className="text-sm text-muted-foreground">
        {selectedStudents.size > 0 
          ? `${selectedStudents.size} of ${filteredStudents.length} selected`
          : `${filteredStudents.length} students`}
      </span>
    </div>
    
    {selectedStudents.size > 0 && (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedStudents.size})
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedStudents.size} Students?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedStudents.size} student(s) from this section. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={bulkDeleteStudents}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedStudents.size} Students`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
  </div>
)}
```

#### 7. Add Checkbox Column to Table

**Update TableHeader (line 610-619):**
```typescript
<TableHeader>
  <TableRow>
    <TableHead className="w-[40px]">
      <Checkbox
        checked={allSelected}
        onCheckedChange={toggleSelectAll}
      />
    </TableHead>
    <TableHead>#</TableHead>
    <TableHead>Full Name</TableHead>
    <TableHead>Student ID</TableHead>
    <TableHead>Attendance</TableHead>
    <TableHead>Absence %</TableHead>
    <TableHead>Comments</TableHead>
    <TableHead className="text-right">Actions</TableHead>
  </TableRow>
</TableHeader>
```

**Update TableRow (line 622-698):**
Add checkbox as first cell in each row:
```typescript
<TableRow key={student.id}>
  <TableCell>
    <Checkbox
      checked={selectedStudents.has(student.id)}
      onCheckedChange={() => toggleStudentSelection(student.id)}
    />
  </TableCell>
  <TableCell className="font-medium">{index + 1}</TableCell>
  {/* ... rest of cells remain the same */}
</TableRow>
```

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useStudentAuth.tsx` | Modify | Fix duplicate student login issue by using `.limit(1)` instead of `.maybeSingle()` |
| `src/pages/Register.tsx` | Modify | Add bulk delete with Select All/Unselect All toggle button |

---

## User Experience

1. **Student Login**: Now works even if the student is registered in multiple sections
2. **Select All Button**: One click selects all visible students in the current section
3. **Unselect All Button**: Same button toggles to unselect all when all are selected
4. **Individual Selection**: Checkboxes in each row for fine-grained selection
5. **Bulk Delete**: Red button appears showing count, with confirmation dialog
6. **Individual Delete**: Still works via the trash icon on each row (preserved)
7. **Section Change**: Selection automatically clears when switching sections
