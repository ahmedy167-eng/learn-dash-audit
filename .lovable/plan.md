

# Add Visible Admin Login Link

## Overview
Add a clearly visible link from the regular login page to the admin login page so administrators can easily find the admin portal.

---

## Current State
- The admin login page exists at `/admin-login`
- There's no link pointing to it from the `/auth` page or landing page
- Users have to know the URL to access it

## Proposed Changes

### Add a link on the Auth page
Add a small text link at the bottom of the login form:

```text
+----------------------------------+
|      EduPortal Login             |
|  [Sign In]  [Sign Up]            |
|                                  |
|  Email: [____________]           |
|  Password: [____________]        |
|                                  |
|  [        Sign In        ]       |
|                                  |
|  Administrator? Sign in here →   |  ← New link
+----------------------------------+
```

---

## Technical Changes

### File: `src/pages/Auth.tsx`

Add a link below the sign-in form that points to `/admin-login`:

```tsx
<div className="mt-4 text-center">
  <a 
    href="/admin-login" 
    className="text-sm text-muted-foreground hover:text-primary"
  >
    Administrator? Sign in here →
  </a>
</div>
```

This will be placed after the closing `</Tabs>` component but before the closing `</CardContent>`.

---

## Result
Users will see a subtle "Administrator? Sign in here" link at the bottom of the login card, making it easy to find the admin portal without cluttering the main login UI.

