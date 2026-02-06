

# Staff Chat Improvements -- UI Redesign, Access for All Staff, and Admin Toggle

## Issues Identified

1. **Ugly UI layout** -- The current chat page needs a cleaner, more polished design with better spacing, rounded cards, and visual hierarchy
2. **Chat only available to Admin** -- The "Staff Chat" link appears in the sidebar for everyone, but the unread badge query uses `sender_type = 'staff'` which matches nothing in the database (valid values are `admin`, `teacher`, `student`). Teachers can technically access the page but the badge is broken
3. **Messages not delivered to other staff** -- Messages do send correctly now (using `admin`/`teacher` types), but the sidebar unread badge still filters by the old `'staff'` value, so recipients never see notifications
4. **No admin control to enable/disable chat** -- Admin should be able to toggle the staff chat feature on or off for individual users

---

## 1. Fix Sidebar Unread Badge (Bug Fix)

**File: `src/components/layout/Sidebar.tsx`**

The sidebar unread count query at line 63-64 still uses `sender_type = 'staff'` and `recipient_type = 'staff'`, which never matches any rows. Fix to use:
- `.in('sender_type', ['admin', 'teacher'])`  
- `.in('recipient_type', ['admin', 'teacher'])`

This ensures teachers and admins both see unread counts for staff-to-staff messages.

---

## 2. Add `staff_chat` Permission (Admin Toggle)

### Database Migration
- Add `'staff_chat'` as a new feature option in the permission system (no schema changes needed since `feature` is a text column)
- The existing `has_permission` function and `user_permissions` table already support arbitrary feature strings

### Permission System Updates
**File: `src/hooks/usePermissions.tsx`**
- Add `'staff_chat'` to the `FeatureKey` type union

**File: `src/components/admin/UserPermissionsDialog.tsx`**
- Add a new entry to the `FEATURES` array: `{ key: 'staff_chat', label: 'Staff Chat', description: 'Send and receive messages with other staff' }`

### Apply Permission Check
**File: `src/components/layout/Sidebar.tsx`**
- Wrap the Staff Chat nav link with a permission check: only show if `hasPermission('staff_chat')` returns true
- Admins automatically have access (the `hasPermission` function already returns true for admins)

**File: `src/pages/StaffChat.tsx`**
- Add a permission gate: if `hasPermission('staff_chat')` is false, redirect to `/dashboard`

---

## 3. UI Redesign -- Staff Chat Page

**File: `src/pages/StaffChat.tsx`** -- Complete layout improvements:

**Left Panel (Staff List):**
- Wrap in a `Card` component with proper rounded corners and shadow
- Add a cleaner header with the title and online count
- Better search bar styling with rounded input
- Contact items with improved spacing, larger avatars, online status dots, and cleaner typography
- Smoother hover states (subtle background change instead of lift effect which can feel jarring in a chat list)

**Right Panel (Chat Area):**
- Wrap in a `Card` component matching the left panel
- Cleaner chat header with back button, avatar, name, and role badge
- Better message bubbles with more rounded corners and improved padding
- Cleaner empty state with a more visually appealing illustration
- Input area with a rounded input field and circular send button
- Overall better spacing between the two panels with a gap instead of just a border

**Responsive improvements:**
- Full-height layout using `h-[calc(100vh-4rem)]` (already present, keep it)
- Proper mobile toggle between list and chat views
- Add a subtle gap between the panels on desktop

---

## 4. Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePermissions.tsx` | Add `'staff_chat'` to `FeatureKey` type |
| `src/components/admin/UserPermissionsDialog.tsx` | Add Staff Chat to the FEATURES list |
| `src/components/layout/Sidebar.tsx` | Fix unread badge query filters; gate Staff Chat behind permission check |
| `src/pages/StaffChat.tsx` | Add permission gate + complete UI redesign with Card wrappers, better spacing, cleaner bubbles |

---

## Technical Details

### Sidebar Badge Fix
```text
Current (broken):
  .eq('sender_type', 'staff')
  .eq('recipient_type', 'staff')

Fixed:
  .in('sender_type', ['admin', 'teacher'])
  .in('recipient_type', ['admin', 'teacher'])
```

### Permission Type Update
```text
export type FeatureKey = 
  | 'students' 
  | 'sections' 
  | ... 
  | 'staff_chat';   // NEW
```

### Admin Permission Dialog Addition
```text
{ key: 'staff_chat', label: 'Staff Chat', description: 'Send and receive messages with other staff' }
```

### Chat Page Permission Gate
```text
if (!permLoading && !hasPermission('staff_chat')) {
  return <Navigate to="/dashboard" replace />;
}
```

No database migration is needed -- the `user_permissions` table accepts any text value for `feature`, and the `has_permission()` function works with arbitrary feature strings. Admins automatically have access to all features.

