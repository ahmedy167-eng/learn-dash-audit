

# Fix Student Messaging Recipient Dropdown

## Problem

The current implementation shows duplicate admin entries ("Waleed" appearing twice) because the Edge Function fetches all users with the `admin` role and lists each one as a separate recipient. The expected behavior is that students should only be able to message:

1. Their **assigned teacher** (Steve)
2. A **single general admin option** for inquiries

## Root Cause

In `supabase/functions/student-auth/index.ts` (lines 785-808), the `get-recipients` endpoint queries all admins from `user_roles` and adds each one individually:

```typescript
// Current problematic code
const { data: adminRoles } = await supabaseAdmin
  .from('user_roles')
  .select('user_id')
  .eq('role', 'admin')

if (adminRoles && adminRoles.length > 0) {
  // Adds EACH admin as a separate recipient - THIS IS THE BUG
  for (const admin of adminProfiles) {
    recipients.push({...})
  }
}
```

## Solution

Remove the section that adds individual admins (lines 785-808). The "Administrator (General Inquiries)" option (already added at lines 744-750) is sufficient for students to contact administration.

---

## Technical Details

### File: `supabase/functions/student-auth/index.ts`

**Remove lines 785-808** (the block that queries and adds individual admin profiles):

```typescript
// DELETE THIS BLOCK
// Get all admins
const { data: adminRoles } = await supabaseAdmin
  .from('user_roles')
  .select('user_id')
  .eq('role', 'admin')

if (adminRoles && adminRoles.length > 0) {
  const adminUserIds = adminRoles.map(r => r.user_id)
  
  const { data: adminProfiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', adminUserIds)

  if (adminProfiles) {
    for (const admin of adminProfiles) {
      recipients.push({
        user_id: admin.user_id,
        full_name: admin.full_name,
        type: 'admin',
        label: admin.full_name || 'Administrator',
      })
    }
  }
}
```

### Expected Result After Fix

The dropdown will show only:

| Recipient | Type |
|-----------|------|
| Steve | Teacher (assigned) |
| Administrator (General Inquiries) | General Admin |

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/student-auth/index.ts` | Remove the individual admin lookup block (lines 785-808) |

