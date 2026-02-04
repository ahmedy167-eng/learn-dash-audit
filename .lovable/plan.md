

# Student Message Notification System

## Overview

This plan implements a real-time message notification system for students. When an admin or teacher sends a message to a student, they will see:
1. A popup toast notification alerting them of the new message
2. A notification badge showing unread message count
3. A dialog to view and read their messages

---

## How It Works

```text
Admin sends message to Student
         ↓
  Message saved to database
         ↓
  Supabase Realtime broadcasts INSERT event
         ↓
  Student's browser receives the event
         ↓
  Toast popup appears: "You have 1 new message!"
         ↓
  Badge count updates in header
         ↓
  Student clicks to view messages
```

---

## Components to Create

### 1. Student Messages Hook
A custom hook that:
- Fetches unread message count on load
- Subscribes to Realtime for new messages
- Shows toast popup when new message arrives
- Provides functions to mark messages as read

### 2. Message Notification Badge
A visual indicator in the student portal header showing:
- Bell icon with unread count badge
- Clickable to open messages dialog

### 3. Student Messages Dialog
A popup showing:
- List of messages from admin/teacher
- Unread messages highlighted
- Mark as read functionality
- Message details (subject, content, date)

---

## Visual Design

### Toast Notification (appears automatically)
```text
┌─────────────────────────────────────────┐
│  📬 New Message                         │
│  You have received a message from Admin │
│  [View Message]              [Dismiss]  │
└─────────────────────────────────────────┘
```

### Header with Notification Badge
```text
┌────────────────────────────────────────────────────────────────┐
│  Welcome, Ahmed Ali!                    🔔(2)  [Message Admin] │
└────────────────────────────────────────────────────────────────┘
                                           ↑
                                    Badge shows "2" unread
```

### Messages Dialog
```text
┌──────────────────────────────────────────────────────────────┐
│  Your Messages (2 unread)                              [X]   │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ● Attendance Notice               Feb 4, 2026  [NEW]  │ │
│  │   From: Admin                                         │ │
│  │   Please note your absence has been recorded...       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ○ Schedule Change                  Feb 3, 2026        │ │
│  │   From: Teacher                                       │ │
│  │   Your class on Friday has been moved to...          │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `src/hooks/useStudentMessages.tsx` | Hook for fetching messages and Realtime subscription |
| `src/components/student/MessageNotificationBadge.tsx` | Bell icon with unread count badge |
| `src/components/student/StudentMessagesDialog.tsx` | Dialog to view and read messages |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/StudentPortal.tsx` | Add notification badge and messages dialog to header |
| `src/components/student/StudentLayout.tsx` | Add message notification in sidebar (optional indicator) |

---

## Technical Implementation

### 1. useStudentMessages Hook

```typescript
// Key features:
// - Fetch unread messages count on mount
// - Subscribe to Realtime for new messages
// - Show toast on new message arrival
// - Provide markAsRead function

const useStudentMessages = (studentId: string) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  
  // Subscribe to new messages via Realtime
  useEffect(() => {
    const channel = supabase
      .channel('student-messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `recipient_student_id=eq.${studentId}`
        },
        (payload) => {
          // Show toast notification
          toast('New Message!', {
            description: 'You have received a new message',
            action: { label: 'View', onClick: openMessagesDialog }
          });
          // Update unread count
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [studentId]);
  
  return { unreadCount, messages, markAsRead, refetch };
};
```

### 2. Message Notification Badge

```typescript
// Bell icon with animated badge
<Button variant="ghost" onClick={openDialog}>
  <Bell className="h-5 w-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white 
                     text-xs rounded-full h-5 w-5 flex items-center 
                     justify-center animate-pulse">
      {unreadCount}
    </span>
  )}
</Button>
```

### 3. Messages Dialog

Features:
- Scrollable list of messages
- Unread messages have bold text and "NEW" badge
- Click message to expand and mark as read
- Shows sender type (Admin/Teacher)
- Formatted date/time

---

## Realtime Setup

The `messages` table already has Realtime enabled from previous migrations:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

The hook will filter for messages where `recipient_student_id` matches the logged-in student.

---

## Summary

| Feature | Implementation |
|---------|----------------|
| Real-time notifications | Supabase Realtime subscription |
| Toast popup | Sonner toast with action button |
| Unread badge | Animated red badge with count |
| Message list | Dialog with expandable messages |
| Mark as read | Updates `is_read` and `read_at` in database |

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/hooks/useStudentMessages.tsx` |
| Create | `src/components/student/MessageNotificationBadge.tsx` |
| Create | `src/components/student/StudentMessagesDialog.tsx` |
| Modify | `src/pages/StudentPortal.tsx` |

