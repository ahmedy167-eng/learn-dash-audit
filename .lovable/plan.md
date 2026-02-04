

# Enhanced Student Messaging System

## Overview

This plan enhances the existing messaging system to allow students to send messages to either:
1. **Their Teacher** - The staff member who owns the student's assigned section
2. **An Admin** - Any administrator in the system

---

## Current State Analysis

**What Already Exists:**
- `MessageAdminDialog` component for students to message admins
- `messages` table with `recipient_user_id` column (can target specific staff)
- `MessageInbox` for admins to view and reply to messages
- Real-time notifications via `useStudentMessages` hook
- Sections have `user_id` linking to the teacher who manages them

**What Needs to Change:**
- Update the compose dialog to let students choose "Teacher" or "Admin"
- Fetch the student's teacher based on their section
- Show teacher name in the recipient selection
- Ensure the inbox can display messages sent to specific teachers

---

## How It Works

```text
Student opens "Send Message"
         |
         v
+------------------------+
|  Who do you want to    |
|  message?              |
|                        |
|  ( ) My Teacher        |
|      (Ahmed Ali)       |
|                        |
|  ( ) Admin             |
+------------------------+
         |
         v
Student selects recipient and writes message
         |
         v
Message saved with recipient_type + recipient_user_id
         |
         v
Teacher/Admin sees message in their inbox
```

---

## File Changes

### 1. Rename and Enhance MessageAdminDialog

**File:** `src/components/student/MessageAdminDialog.tsx`

**Changes:**
- Rename to `SendMessageDialog` (more generic)
- Add recipient type selection (Teacher vs Admin)
- Fetch student's assigned teacher from sections table
- Set appropriate `recipient_type` and `recipient_user_id`

**UI Update:**
```text
+------------------------------------------+
|  Send Message                        [X] |
+------------------------------------------+
|                                          |
|  Send to:                                |
|  +------------------------------------+  |
|  | [Teacher icon] My Teacher         |  |
|  | Ahmed Ali                         |  |
|  +------------------------------------+  |
|  | [Admin icon] Administrator        |  |
|  +------------------------------------+  |
|                                          |
|  Subject (Optional):                     |
|  [                                    ]  |
|                                          |
|  Message:                                |
|  [                                    ]  |
|  [                                    ]  |
|                                          |
|           [Cancel]  [Send Message]       |
+------------------------------------------+
```

### 2. Update StudentPortal

**File:** `src/pages/StudentPortal.tsx`

**Changes:**
- Update button text from "Message Admin" to "Send Message"
- Update dialog import if component is renamed

### 3. Update MessageInbox for Teachers

**File:** `src/components/admin/MessageInbox.tsx`

**Changes:**
- Fetch messages where either:
  - `recipient_type = 'admin'` (all admin messages)
  - `recipient_user_id = current_user.id` (messages to this specific user)
- This allows teachers to see messages addressed specifically to them

---

## Technical Implementation Details

### Fetching Student's Teacher

When the dialog opens, fetch the teacher for the student's section:

```typescript
// Get the student's section and its owner (teacher)
const fetchTeacher = async (sectionId: string) => {
  // 1. Get section to find user_id (teacher)
  const { data: section } = await supabase
    .from('sections')
    .select('user_id')
    .eq('id', sectionId)
    .single();
  
  // 2. Get teacher's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .eq('user_id', section.user_id)
    .single();
  
  return profile; // { user_id, full_name }
};
```

### Message Insert Logic

```typescript
// When sending to teacher:
{
  sender_type: 'student',
  sender_student_id: student.id,
  recipient_type: 'teacher',
  recipient_user_id: teacher.user_id,
  subject: '...',
  content: '...'
}

// When sending to admin:
{
  sender_type: 'student',
  sender_student_id: student.id,
  recipient_type: 'admin',
  recipient_user_id: null,  // Goes to any admin
  subject: '...',
  content: '...'
}
```

### Updated MessageInbox Query

```typescript
// Fetch messages addressed to this user OR to admin generally
const { data } = await supabase
  .from('messages')
  .select('...')
  .or(`recipient_type.eq.admin,recipient_user_id.eq.${user.id}`)
  .order('created_at', { ascending: false });
```

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/student/MessageAdminDialog.tsx` | Modify | Add recipient selection (Teacher/Admin), fetch teacher info |
| `src/pages/StudentPortal.tsx` | Modify | Update button label to "Send Message" |
| `src/components/admin/MessageInbox.tsx` | Modify | Include messages sent to specific teacher |

---

## Technical Notes

- Students without a section assigned will only see the "Admin" option
- The teacher is determined by the `user_id` on the student's section
- Real-time notifications already work for teachers since they use Supabase auth
- No database changes needed - existing `recipient_user_id` column supports this

