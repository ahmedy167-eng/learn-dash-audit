

# Enhanced CA Projects: Deadlines, Rich Text Editor, Progress Tracking & Smart Features

## Overview

This plan adds the following features to the CA Projects system:

1. **Stage Deadlines** - Admin can set a deadline for each stage (Ideas, First Draft, Second Draft, Final Draft)
2. **Rich Text Editor** - Students can format their submissions (bold, italic, text size, etc.)
3. **Enhanced Progress Tracking** - Admin can see each student's progress across all stages at a glance
4. **Smart Submission Flow** - Congratulatory popup when students submit, guiding them to the next stage
5. **Deadline Enforcement** - Show countdown/overdue status to students

---

## Database Changes

### Add deadline columns to `ca_projects` table

New columns needed:
- `deadline_ideas` (timestamp with time zone, nullable)
- `deadline_first_draft` (timestamp with time zone, nullable)
- `deadline_second_draft` (timestamp with time zone, nullable)
- `deadline_final_draft` (timestamp with time zone, nullable)

```sql
ALTER TABLE ca_projects
ADD COLUMN deadline_ideas timestamp with time zone,
ADD COLUMN deadline_first_draft timestamp with time zone,
ADD COLUMN deadline_second_draft timestamp with time zone,
ADD COLUMN deadline_final_draft timestamp with time zone;
```

---

## Feature 1: Admin Sets Deadlines for Each Stage

### File: `src/pages/CAProjects.tsx`

**Changes to Create/Edit Project Dialog:**

Add 4 date picker fields for each stage deadline:
- Ideas & Description deadline
- First Draft deadline
- Second Draft deadline
- Final Draft deadline

```text
Form Fields to Add:
- formDeadlineIdeas: Date | undefined
- formDeadlineFirstDraft: Date | undefined
- formDeadlineSecondDraft: Date | undefined
- formDeadlineFinalDraft: Date | undefined

UI Addition (inside dialog after description):
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>Ideas Deadline</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formDeadlineIdeas ? format(formDeadlineIdeas, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar 
          mode="single" 
          selected={formDeadlineIdeas} 
          onSelect={setFormDeadlineIdeas} 
        />
      </PopoverContent>
    </Popover>
  </div>
  <!-- Repeat for other 3 stages -->
</div>

Insert/Update Query Addition:
{
  deadline_ideas: formDeadlineIdeas?.toISOString() || null,
  deadline_first_draft: formDeadlineFirstDraft?.toISOString() || null,
  deadline_second_draft: formDeadlineSecondDraft?.toISOString() || null,
  deadline_final_draft: formDeadlineFinalDraft?.toISOString() || null,
}
```

**Display Deadlines on Project Cards:**
Show deadline badges under each project with color coding:
- Green: More than 3 days remaining
- Yellow: 1-3 days remaining
- Red: Overdue

---

## Feature 2: Rich Text Editor for Student Submissions

### New Dependency

Install `@tiptap/react` and extensions for a lightweight rich text editor:
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-underline`
- `@tiptap/extension-text-style`
- `@tiptap/extension-font-size` (or use custom styling)

### New Component: `src/components/ui/rich-text-editor.tsx`

A reusable rich text editor component with:
- Toolbar: Bold, Italic, Underline, Headings (H1, H2, H3), Font Size dropdown
- Content area with formatting preserved
- Outputs HTML string

```typescript
// Component structure
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="border rounded-lg">
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b">
        <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Button>
        <!-- Font size selector, heading buttons, etc. -->
      </div>
      {/* Editor content */}
      <EditorContent editor={editor} className="p-3 min-h-[150px] prose" />
    </div>
  );
};
```

### File: `src/pages/student/StudentCAProjects.tsx`

Replace `<Textarea>` with `<RichTextEditor>`:

```typescript
// Before:
<Textarea
  value={currentContent[stage.value] ?? submission?.content ?? ''}
  onChange={(e) => setCurrentContent(prev => ({ ...prev, [stage.value]: e.target.value }))}
/>

// After:
<RichTextEditor
  value={currentContent[stage.value] ?? submission?.content ?? ''}
  onChange={(value) => setCurrentContent(prev => ({ ...prev, [stage.value]: value }))}
  placeholder={`Enter your ${stage.label.toLowerCase()} here...`}
/>
```

### File: `src/pages/CAProjects.tsx` (Admin View)

Update submission content display to render HTML:

```typescript
// Before:
<p className="whitespace-pre-wrap">{submission.content}</p>

// After:
<div 
  className="prose prose-sm max-w-none" 
  dangerouslySetInnerHTML={{ __html: submission.content || '' }} 
/>
```

---

## Feature 3: Enhanced Progress Tracking for Admin

### File: `src/pages/CAProjects.tsx`

**Add Student Progress Overview Panel:**

When a project is selected, show a table/grid of all students with their progress:

| Student Name | ID | Ideas | First Draft | Second Draft | Final Draft |
|-------------|-----|-------|-------------|--------------|-------------|
| Ahmed | 12345 | ✓ | ✓ | Pending | - |
| Kevin | 12346 | ✓ | ⏳ | - | - |

```typescript
// Add this section above the stage tabs
{selectedProject && (
  <Card className="mb-4">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">Student Progress Overview</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>ID</TableHead>
            {stages.map(s => <TableHead key={s.value}>{s.label.split(' ')[0]}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {uniqueStudents.map(student => (
            <TableRow key={student.id}>
              <TableCell>{student.full_name}</TableCell>
              <TableCell>{student.student_id}</TableCell>
              {stages.map(s => {
                const sub = submissions.find(sub => 
                  sub.student_id === student.id && sub.stage === s.value
                );
                return (
                  <TableCell key={s.value}>
                    {sub ? (
                      sub.feedback ? 
                        <CheckCircle className="text-green-500" /> : 
                        <Clock className="text-yellow-500" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)}
```

---

## Feature 4: Smart Submission Flow with Congratulatory Popup

### File: `src/pages/student/StudentCAProjects.tsx`

**Add Success Dialog Component:**

When a student submits a stage, show a celebratory dialog:

```typescript
// New state
const [successDialogOpen, setSuccessDialogOpen] = useState(false);
const [lastSubmittedStage, setLastSubmittedStage] = useState<string | null>(null);

// After successful submission in handleSubmitStage:
setLastSubmittedStage(stage);
setSuccessDialogOpen(true);

// Success Dialog JSX:
<Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
  <DialogContent className="text-center">
    <div className="flex flex-col items-center py-4">
      <div className="bg-green-100 p-4 rounded-full mb-4">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>
      <DialogTitle className="text-2xl mb-2">Well Done! 🎉</DialogTitle>
      <DialogDescription className="text-base">
        You've successfully submitted your {getStageLabel(lastSubmittedStage)}.
      </DialogDescription>
      {getNextStage(lastSubmittedStage) && (
        <div className="mt-4 p-4 bg-primary/10 rounded-lg">
          <p className="font-medium">
            Your next step: <span className="text-primary">{getNextStageLabel(lastSubmittedStage)}</span>
          </p>
          {getNextStageDeadline(selectedProject, lastSubmittedStage) && (
            <p className="text-sm text-muted-foreground mt-1">
              Due by: {format(getNextStageDeadline(...), "PPP")}
            </p>
          )}
        </div>
      )}
      {lastSubmittedStage === 'final_draft' && (
        <p className="mt-4 text-lg font-bold text-green-600">
          Congratulations! You've completed all stages! 🏆
        </p>
      )}
    </div>
    <Button onClick={() => setSuccessDialogOpen(false)} className="w-full">
      Continue
    </Button>
  </DialogContent>
</Dialog>

// Helper functions:
const getNextStage = (current: string) => {
  const order = ['ideas', 'first_draft', 'second_draft', 'final_draft'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
};

const getNextStageLabel = (current: string) => {
  const next = getNextStage(current);
  return stages.find(s => s.value === next)?.label || null;
};
```

---

## Feature 5: Show Deadlines to Students

### File: `src/pages/student/StudentCAProjects.tsx`

**Update CAProject Interface:**

```typescript
interface CAProject {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
  deadline_ideas: string | null;
  deadline_first_draft: string | null;
  deadline_second_draft: string | null;
  deadline_final_draft: string | null;
}
```

**Display Deadline Badge on Each Stage Tab:**

```typescript
{stages.map((stage) => {
  const deadline = getStageDeadline(project, stage.value);
  const isOverdue = deadline && new Date(deadline) < new Date();
  const isDueSoon = deadline && !isOverdue && 
    differenceInDays(new Date(deadline), new Date()) <= 3;
  
  return (
    <TabsTrigger key={stage.value} value={stage.value}>
      <div className="flex flex-col items-center">
        <span>{stage.label}</span>
        {deadline && (
          <span className={cn(
            "text-xs mt-1",
            isOverdue ? "text-red-500" : isDueSoon ? "text-yellow-500" : "text-muted-foreground"
          )}>
            {isOverdue ? "Overdue" : format(new Date(deadline), "MMM d")}
          </span>
        )}
      </div>
    </TabsTrigger>
  );
})}
```

---

## Summary of Files to Change

| File | Changes |
|------|---------|
| Database migration | Add 4 deadline columns to `ca_projects` |
| `src/pages/CAProjects.tsx` | Deadline inputs in form, progress overview table, render HTML content |
| `src/pages/student/StudentCAProjects.tsx` | Rich text editor, success dialog, deadline display |
| `src/components/ui/rich-text-editor.tsx` | New component for text formatting |
| `package.json` | Add tiptap dependencies |

---

## New Dependencies Required

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/pm
```

---

## Visual Flow After Implementation

```text
Admin Creates Project:
1. Fill title, description, section
2. Set deadline for each stage (Ideas: Feb 10, First Draft: Feb 17, etc.)
3. Upload PDF requirements

Student Submits Work:
1. Open project, see deadline for each stage
2. Use rich text editor to format submission (bold headings, etc.)
3. Click Submit
4. See popup: "Well Done! 🎉 Next up: First Draft (Due: Feb 17)"
5. Continue to next stage

Admin Reviews:
1. Select project
2. See progress table: which students submitted which stages
3. Click into each stage tab to read formatted submissions
4. Add feedback
```

