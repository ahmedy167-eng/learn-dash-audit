

# Fix Staff Chat Visibility and Separate from Bell Icon

## Problem

Two issues are causing confusion:

1. **Staff Chat link missing from Steve's sidebar** -- The database migration was applied and Steve has `staff_chat = true`, but the sidebar link may not appear due to a timing/caching issue. The code logic is correct (`permLoading || hasPermission('staff_chat')`) so this should resolve on reload. However, we should verify and ensure robustness.

2. **Bell icon shows staff chat messages mixed with student notifications** -- The `TeacherMessagesDropdown` (bell icon) fetches ALL messages sent to the user, including staff-to-staff chat messages. This means when the admin sends a staff chat message, it appears in the bell icon instead of (or in addition to) the Staff Chat sidebar. The user wants these to be completely separate features:
   - **Bell icon** = Only student-to-teacher messages (notifications)
   - **Staff Chat sidebar link** = Staff-to-staff messages (separate page)

---

## Solution

### 1. Fix TeacherMessagesDropdown (Bell Icon) -- Filter Out Staff Chat Messages

**File: `src/components/layout/TeacherMessagesDropdown.tsx`**

Update the message query to only fetch messages from students, excluding staff-to-staff messages. Change the query filter from:
```
.or(`recipient_user_id.eq.${user.id},and(recipient_type.eq.admin,recipient_user_id.is.null)`)
```

To add a filter that only includes messages where `sender_type = 'student'`:
```
.eq('sender_type', 'student')
.or(`recipient_user_id.eq.${user.id},and(recipient_type.eq.admin,recipient_user_id.is.null)`)
```

This ensures the bell icon only shows student messages, keeping it completely separate from Staff Chat.

### 2. Verify Sidebar Staff Chat Link

The sidebar code is correct -- it checks `hasPermission('staff_chat')` and Steve has that permission enabled in the database. The link should appear after a page refresh. No code changes needed for this, but verifying end-to-end is important.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/layout/TeacherMessagesDropdown.tsx` | Add `.eq('sender_type', 'student')` filter to exclude staff chat messages from bell icon notifications |

## What This Fixes

- Bell icon will only show messages from students (homework help, questions, etc.)
- Staff Chat in the sidebar will be the dedicated place for staff-to-staff communication
- Both features work independently -- toggling Staff Chat permission does not affect student notifications
- Steve (and all staff) will see the Staff Chat icon in the sidebar since the database permission is already active

