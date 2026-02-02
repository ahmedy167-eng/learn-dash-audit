
## What’s actually causing the problem (based on your screenshots + network logs)

### 1) Uploading a PDF is updating the WRONG CA Project
In `src/pages/CAProjects.tsx`, the “Upload PDF” button uses **one shared** `fileInputRef` for *all* projects, but the `<input type="file" />` is rendered **inside the `.map()`**.

Because of this, the ref ends up pointing to the **last project’s** hidden file input. So when you click “Upload PDF” on “Humans”, the file picker opens, but the **upload handler runs for the last project** (often in a different section).  
That’s why:
- Students for “Humans” still see **“No PDF yet”**
- Another project/section suddenly gets the PDF (looks like uploads “affect other sections”)

Your network logs confirm this: a PDF upload PATCH updated the **Football** project’s `pdf_url`, while **Humans** stayed `pdf_url: null`.

### 2) Student portal is correct to show “No PDF yet”
The student portal shows “No PDF yet” when `pdf_url` is null. Since the wrong row is being updated, it’s behaving correctly.

---

## Goals
1) Upload PDF should attach to the **exact project you clicked** (and therefore the correct section).
2) Students should see the PDF immediately (without refresh).
3) Student portal should have a clear **View PDF** and **Download PDF** experience (like you want).

---

## Implementation Plan

### A) Fix Admin Upload so it targets the right project every time (core fix)
**File:** `src/pages/CAProjects.tsx`

**Change approach:**
- Remove the hidden `<input type="file" ...>` from inside each project card.
- Add **one** hidden file input at the top-level of the page.
- Add state to remember which project is being uploaded to:
  - `uploadTargetProjectId` (and optionally `uploadTargetProjectTitle` for nicer toasts)
- When you click “Upload PDF” on a project:
  - set `uploadTargetProjectId = project.id`
  - trigger the single hidden input `.click()`
- When a file is chosen:
  - call `handleUploadPDF(uploadTargetProjectId, file)`
  - clear the input value so re-uploading the same file works

**Also improve UX:**
- Replace `uploading` boolean with `uploadingProjectId` so only the clicked project shows a spinner/disabled state (not all projects).

**Expected result:**
- Uploading a PDF for “Humans” updates “Humans” only.
- It no longer changes “Football” or other section projects.

---

### B) Make Student Portal show “View PDF” + “Download PDF” consistently
**File:** `src/pages/student/StudentCAProjects.tsx`

**UI changes:**
- If `project.pdf_url` exists:
  - Show a **View PDF** button (opens in new tab)
  - Show a **Download PDF** button (forces download)
- If `project.pdf_url` is missing:
  - Keep the “No PDF yet” badge

**Download implementation:**
- Use the already-installed `file-saver` to download:
  - `fetch(pdfUrl)` → `blob()` → `saveAs(blob, filename)`
- Use a safe filename like: `CA_Project_${project.title}.pdf`

---

### C) Ensure students see uploads “straight away”
You already have:
- A realtime subscription in `StudentCAProjects.tsx` listening for updates in `ca_projects` filtered by `section_id`.
- A database change enabling realtime on `ca_projects`.

**What we’ll do:**
- Keep that subscription.
- After fixing (A), it will now receive updates for the correct section/project and immediately refetch.

---

## Testing Checklist (end-to-end)
1) As admin, go to CA Projects and upload a PDF for **Humans** (class b).
2) Confirm the admin list now shows “PDF” badge + “View PDF” for **Humans** (not for unrelated projects).
3) Log in as a student in **class b**:
   - “Humans” should now show **PDF Available**
   - “View PDF” opens it
   - “Download PDF” downloads it
4) Keep the student portal open, upload a new PDF as admin, and confirm it updates without refreshing.

---

## Optional (nice-to-have after the fix)
- Add a “Remove PDF” button for admins (sets `pdf_url` back to null).
- Show the PDF file name and upload timestamp.

---

## Files that will be updated
- `src/pages/CAProjects.tsx` (fix upload targeting + per-project uploading state)
- `src/pages/student/StudentCAProjects.tsx` (add View PDF + true Download PDF UX)
