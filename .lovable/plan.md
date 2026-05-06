## Inline annotation system for CA Projects (teacher review)

Teachers will be able to select text inside a student's submission, tag it with an editing abbreviation (Sp, WW, Gr, etc.) and attach a short comment. Students see the highlighted text with the abbreviation badge; hover/click reveals the teacher's comment. Read-only on the student side.

### UX flow (teacher — `/ca-projects`)

1. Teacher opens a project → expands a student's submission card (existing layout).
2. Submission content is rendered inside an **AnnotatableText** component.
3. Teacher selects a word/phrase → a small floating toolbar appears above the selection with:
   - Preset abbreviation buttons (Gr, S/V, Ten, Prep, Art, Pl, Cp, Pun, Sp, Wf, WO, Run-on, WW)
   - "+ Custom" button for free-text labels
   - A comment textarea
   - Save / Cancel
4. On Save → the selected span is wrapped with a `<mark>` tag carrying `data-abbr`, `data-comment`, `data-id`, and a colour class. The wrapped HTML is saved back to `ca_submissions.feedback_html` (new column — keeps the original `content` clean).
5. Teacher can click an existing highlight to **edit** the abbreviation/comment or **remove** it.

### UX flow (student — `/student/ca-projects`)

- Student's own draft (`content`) is shown as today (editable rich text).
- Below it, a new read-only **"Teacher Annotations"** panel renders `feedback_html` with highlights. Each `<mark>` shows the abbreviation as a small superscript badge. Hover → tooltip with the comment. Tap on mobile → popover.
- Existing free-text `feedback` field stays as the overall comment.

### Abbreviation set

Preloaded: Gr, S/V, Ten, Prep, Art, Pl, Cp, Pun, Sp, Wf, WO, Run-on, WW (matches the screenshot). Each gets a distinct soft background colour (using semantic tokens, not raw hex). Custom labels use a neutral muted colour.

### Data model

- Add column `feedback_html TEXT` to `public.ca_submissions` (nullable). Existing `content` and `feedback` columns untouched.
- Annotations live inside the saved HTML — no extra table (per your choice).
- Sanitiser (`src/lib/sanitize.ts`) updated to allow `<mark>` plus `data-abbr`, `data-comment`, `data-id`, `class` on it.

### Files to add/change

**New**
- `src/components/ca/AnnotatableText.tsx` — wraps HTML, handles selection toolbar, mark insertion/removal.
- `src/components/ca/AnnotationToolbar.tsx` — floating popover with abbreviation buttons + comment input.
- `src/components/ca/AnnotatedView.tsx` — read-only renderer with hover tooltips (used by student page).
- `src/lib/annotations.ts` — utilities: list of abbreviations + colour mapping, wrap/unwrap helpers.

**Edited**
- `supabase/functions/student-auth/index.ts` — include `feedback_html` in CA submissions response.
- `src/lib/sanitize.ts` — allow `<mark>` and `data-*` attributes (scoped to the abbreviation set).
- `src/pages/CAProjects.tsx` — replace the current `dangerouslySetInnerHTML` block (lines 852-858) with `<AnnotatableText>`; add save handler that writes `feedback_html` via Supabase.
- `src/pages/student/StudentCAProjects.tsx` — when a submission has `feedback_html`, render `<AnnotatedView>` under the editor.

**Migration**
- `ALTER TABLE public.ca_submissions ADD COLUMN feedback_html TEXT;` (no RLS change — inherits existing policies).

### Out of scope

- No new annotations table, no per-annotation reply threads, no AI grammar detection — purely manual teacher tagging.
- Diary / Lesson Plan annotation: not included.
- Student editing of annotations: not included (read-only).
