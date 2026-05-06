## Issue

In the CA Projects annotation popover, the **comment textarea** and **custom label input** don't accept any keystrokes. Clicking them does nothing — the cursor never lands inside the field.

## Root cause

`AnnotatableText.tsx` line 167 sets `onMouseDown={(e) => e.preventDefault()}` on the **entire popover wrapper**. That handler exists to stop the browser from clearing the user's text selection when they click the toolbar. But because it's bound at the wrapper level, it also fires on clicks inside `<Input>` and `<Textarea>`, preventing them from gaining focus. Without focus, no typing is possible.

## Fix

Scope the `preventDefault` so it only runs when the click target is **not** a form control. Inputs, textareas, and buttons should focus/click normally; clicks on the popover background still preserve the selection.

Change in `src/components/ca/AnnotatableText.tsx`:

```tsx
onMouseDown={(e) => {
  const t = e.target as HTMLElement;
  if (!t.closest('input, textarea, button, [contenteditable="true"]')) {
    e.preventDefault();
  }
}}
```

No other files need changes. Backend, sanitiser, and student view are unaffected.

## Verification

1. Open `/ca-projects` → expand a submission → highlight a word.
2. Toolbar appears. Click the comment textarea and type — text appears.
3. Click "+ Custom", click the custom label input, type — text appears.
4. Selection on the underlying text remains intact when the toolbar opens, so Save still wraps the correct range.
