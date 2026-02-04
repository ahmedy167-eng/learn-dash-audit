
# Fix Student Messaging: Restrict to Assigned Teacher and Admin

## Problem Analysis

The current `MessageAdminDialog` component has two issues:

1. **Direct Database Queries**: It makes direct Supabase queries to fetch recipients (`sections` and `teacher_public_info`), bypassing the secure Edge Function pattern
2. **No Server-Side Validation**: Messages are inserted directly into the database without validating that the recipient is authorized

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Current Flow (Insecure)                     │
├─────────────────────────────────────────────────────────────────────┤
│  Student Browser                                                    │
│       │                                                             │
│       ├──► Direct Query: sections table ──► RLS may block          │
│       ├──► Direct Query: teacher_public_info ──► Works             │
│       └──► Direct Insert: messages table ──► RLS may block         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         New Flow (Secure)                           │
├─────────────────────────────────────────────────────────────────────┤
│  Student Browser                                                    │
│       │                                                             │
│       ├──► Edge Function: get-recipients                            │
│       │         └──► Returns: [teacher, admins] securely            │
│       │                                                             │
│       └──► Edge Function: send_message action                       │
│                 └──► Validates recipient is authorized              │
│                 └──► Inserts message using service role             │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### 1. Add `get-recipients` Endpoint to Edge Function

**File**: `supabase/functions/student-auth/index.ts`

Add a new endpoint that securely fetches the allowed recipients for the logged-in student:

- Validates the session token
- Gets the student's section to find their assigned teacher
- Queries admins from `user_roles` table
- Returns only `user_id` and `full_name` (no sensitive data)

```typescript
// New endpoint: get-recipients
if (action === 'get-recipients' && req.method === 'POST') {
  // 1. Validate session
  // 2. Get student's section → teacher
  // 3. Get all admins from user_roles
  // 4. Return combined list
}
```

### 2. Update `send_message` Action with Validation

**File**: `supabase/functions/student-auth/index.ts`

Enhance the existing `send_message` action to validate recipients:

- If `recipientType` is `admin` and `recipientUserId` is null → General admin (allowed)
- If `recipientUserId` is provided → Check it's either:
  - The student's assigned teacher (via section lookup)
  - An admin (via user_roles lookup)
- Reject with 403 if recipient is unauthorized

### 3. Update MessageAdminDialog to Use Edge Function

**File**: `src/components/student/MessageAdminDialog.tsx`

Replace direct Supabase queries with Edge Function calls:

- Import `useStudentApi` hook
- Add new `getRecipients` method to the API hook
- Use `performAction('send_message', ...)` to send messages
- Remove all direct `supabase.from(...)` calls

### 4. Add `getRecipients` to useStudentApi Hook

**File**: `src/hooks/useStudentApi.tsx`

Add a new method to fetch allowed recipients:

```typescript
const getRecipients = useCallback(async (): Promise<{
  data: Recipient[] | null;
  error: Error | null;
}> => {
  // Call student-auth/get-recipients endpoint
});
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/student-auth/index.ts` | Add `get-recipients` endpoint; enhance `send_message` validation |
| `src/hooks/useStudentApi.tsx` | Add `getRecipients` method and types |
| `src/components/student/MessageAdminDialog.tsx` | Use Edge Function for fetching recipients and sending messages |

---

## Security Benefits

1. **Server-side recipient validation**: Students cannot bypass the UI to message unauthorized users
2. **No direct database access**: All data flows through validated Edge Function endpoints
3. **Consistent with existing pattern**: Follows the secure session token model already in place
4. **Principle of least privilege**: Only exposes necessary data (user_id, full_name)
