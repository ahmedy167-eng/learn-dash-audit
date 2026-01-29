
# Fix: Admin Features Not Visible on Login

## The Problem
When you sign in as an admin, the sidebar shows limited features because it renders before your role and permissions are loaded from the database. The UI checks `isAdmin` too early (while it's still `false` during loading).

## The Solution
Update the Sidebar to wait for permissions to fully load before filtering navigation items. During loading, show all items (or a skeleton) to prevent the "flash" of limited navigation.

---

## What Will Change

### Sidebar Behavior (Before vs After)

| Before | After |
|--------|-------|
| Shows limited nav items immediately | Waits for permissions to load |
| Admin link hidden on first render | Admin link shows correctly after load |
| Confusing UX for admins | Smooth experience with correct access |

---

## Technical Changes

### File: `src/components/layout/Sidebar.tsx`

Update the component to check `loading` state before filtering nav items:

```tsx
// Current behavior - filters before data loads
const visibleNavItems = navItems.filter(item => {
  if (!item.permission) return true;
  return hasPermission(item.permission);
});

// New behavior - show all items while loading
const visibleNavItems = navItems.filter(item => {
  if (!item.permission) return true;
  if (permLoading) return true; // Show all while loading
  return hasPermission(item.permission);
});
```

Also update the Admin link section:

```tsx
// Current - hides admin link while loading
{isAdmin && (...)}

// New - shows admin link if loading OR confirmed admin
{(permLoading || isAdmin) && (...)}
```

---

## Result
- Admins will see all navigation items immediately after login
- No "flash" of limited access
- Features are properly filtered once permissions load
- Regular users will see items briefly during load, then correct filtered view
