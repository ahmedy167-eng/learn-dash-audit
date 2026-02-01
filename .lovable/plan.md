
# Add Student Login Link to Auth Page

## Overview
Add a "Student Login" link to the teacher/admin authentication page for easy access to the student portal.

## Current State
The Auth page currently has:
- Sign In / Sign Up tabs for teachers/admins
- A "Forgot your password?" link
- An "Administrator? Sign in here" link at the bottom

## Change Required
Add a prominent "Student? Login here" link in the footer section of the card, alongside the existing admin link.

## Implementation

### File to Modify
`src/pages/Auth.tsx`

### Change Details
Update the footer section (lines 316-323) to include both the student login link and the admin login link in a visually organized layout:

```tsx
<div className="mt-4 space-y-2 text-center">
  <a 
    href="/student-login" 
    className="block text-sm text-muted-foreground hover:text-primary"
  >
    Student? Login here →
  </a>
  <a 
    href="/admin-login" 
    className="block text-sm text-muted-foreground hover:text-primary"
  >
    Administrator? Sign in here →
  </a>
</div>
```

## Visual Result
The card footer will show:
```
Student? Login here →
Administrator? Sign in here →
```

Both links will be styled consistently with muted text that highlights on hover.
