

# Fix Staff Chat -- Messages Not Sending

## Root Cause

The `messages` table has database CHECK constraints that only allow these values for `sender_type` and `recipient_type`:
- `'admin'`
- `'teacher'`
- `'student'`

The current code sets both fields to `'staff'`, which **violates the constraint** and causes the insert to fail silently. The message never reaches the database.

Additionally, the `user_roles` table stores roles as `'admin'` and `'user'`, but the messages table expects `'admin'` or `'teacher'` -- so a role mapping is needed.

---

## Fix: Update `src/hooks/useStaffChat.tsx`

### 1. Track the current user's role for sending

- Fetch the current user's role from `user_roles` during initialization
- Map `'admin'` to `'admin'` and `'user'` to `'teacher'` for use as the `sender_type` value
- Store each staff member's mapped role so it can be used as the `recipient_type`

### 2. Fix the `sendMessage` function

Change from:
```text
sender_type: 'staff'
recipient_type: 'staff'
```

To:
```text
sender_type: currentUserRole   (e.g. 'admin' or 'teacher')
recipient_type: recipientRole  (e.g. 'admin' or 'teacher')
```

### 3. Fix conversation fetching queries

Instead of filtering by `sender_type = 'staff'` (which matches nothing), filter by:
- `sender_type` in `('admin', 'teacher')` AND `recipient_type` in `('admin', 'teacher')`
- Combined with the existing user ID filters

This ensures we only fetch staff-to-staff messages and exclude student messages.

### 4. Fix the realtime subscription filter

Change the realtime channel filter from `sender_type=eq.staff` to listening for both admin and teacher message types relevant to the current user.

### 5. Add error feedback on send failure

Show a toast notification if the message insert fails so the user knows something went wrong.

---

## Files Changed

- **`src/hooks/useStaffChat.tsx`** -- Fix role mapping, query filters, realtime subscription, and error handling (all changes in this one file)

---

## Technical Details

### Role Mapping
```text
user_roles.role  -->  messages.sender_type / recipient_type
'admin'          -->  'admin'
'user'           -->  'teacher'
```

### Updated Query Pattern (conversations)
```text
SELECT * FROM messages
WHERE sender_type IN ('admin', 'teacher')
  AND recipient_type IN ('admin', 'teacher')
  AND (sender_user_id = current_user OR recipient_user_id = current_user)
ORDER BY created_at DESC
```

### Updated Insert
```text
INSERT INTO messages (content, sender_user_id, recipient_user_id, sender_type, recipient_type)
VALUES (content, currentUserId, recipientId, 'admin'|'teacher', 'admin'|'teacher')
```

No database migrations are needed -- the table schema and constraints are correct. The fix is entirely in the client-side code.

