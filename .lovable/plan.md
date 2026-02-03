
# Comprehensive Admin & Student Portal Enhancement Plan

## Overview

This plan implements a complete overhaul of the admin functionality, messaging system, student portal enhancements, and UI modernization across multiple pages. The changes are grouped into logical phases for efficient implementation.

---

## Summary of Changes

### 1. Admin Dashboard Enhancements
- Track user login/logout times and session duration
- View real-time online/offline status
- Activity logging (what users did)
- Message inbox for student communications
- Ability to remove students from system login

### 2. Messaging System
- Two-way messaging between students and admin
- Message notifications on dashboard
- Real-time updates using Supabase Realtime

### 3. Student Portal Updates
- Remove attendance section from sidebar
- Add advanced search with popup for student list
- Add notices section for admin-posted alerts
- Add ability to message admin

### 4. Register Page Enhancements
- Week calendar showing teaching days
- Advanced search filters (name, ID, section, absence %)
- Post notice feature to individual students

### 5. Quizzes UI Modernization
- Complete visual redesign with modern card layout
- Better organization and spacing
- Professional color scheme and typography

### 6. Remove Off Days Feature
- Remove from sidebar navigation
- Note: Keeping the page file for potential future use

---

## Database Schema Changes

### New Table: `user_sessions`
Track login/logout events and session duration for all users.

```sql
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'teacher', 'student')),
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at TIMESTAMPTZ,
  session_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
```

### New Table: `activity_logs`
Track specific actions users perform in the system.

```sql
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'teacher', 'student')),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
```

### New Table: `messages`
Store messages between students and admin.

```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'teacher', 'student')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'teacher', 'student')),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

### New Table: `student_notices`
Admin-posted notices to individual students.

```sql
CREATE TABLE public.student_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES auth.users(id),
  notice_type TEXT NOT NULL CHECK (notice_type IN ('attendance', 'warning', 'info', 'achievement')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Add `is_active` Column to Students Table
Allow admin to deactivate students from logging in.

```sql
ALTER TABLE public.students 
ADD COLUMN is_active BOOLEAN DEFAULT true;
```

---

## File Changes

### Phase 1: Database & Core Hooks

| File | Action | Description |
|------|--------|-------------|
| Database Migration | Create | All new tables with RLS policies |
| `src/hooks/useStudentAuth.tsx` | Modify | Add session tracking, check is_active status |
| `src/hooks/useActivityLogger.tsx` | Create | Utility hook to log user actions |
| `src/hooks/usePresence.tsx` | Create | Real-time online status tracking |

### Phase 2: Admin Dashboard Overhaul

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Admin.tsx` | Major Rewrite | Add online users panel, activity feed, messages, session analytics |
| `src/components/admin/OnlineUsersPanel.tsx` | Create | Real-time online users list |
| `src/components/admin/ActivityFeed.tsx` | Create | Live activity stream |
| `src/components/admin/MessageInbox.tsx` | Create | Admin message inbox |
| `src/components/admin/SessionAnalytics.tsx` | Create | Session duration charts |

### Phase 3: Messaging System

| File | Action | Description |
|------|--------|-------------|
| `src/components/messaging/MessageDialog.tsx` | Create | Compose/read messages component |
| `src/components/messaging/MessageNotification.tsx` | Create | Badge showing unread count |

### Phase 4: Register Page Enhancements

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Register.tsx` | Modify | Add week calendar, advanced search, post notice dialog |
| `src/components/register/WeekCalendar.tsx` | Create | Week view showing teaching days |
| `src/components/register/AdvancedSearchFilters.tsx` | Create | Multi-filter search component |
| `src/components/register/PostNoticeDialog.tsx` | Create | Dialog to post notices to students |

### Phase 5: Student Portal Updates

| File | Action | Description |
|------|--------|-------------|
| `src/pages/StudentPortal.tsx` | Modify | Add notices section, message admin button |
| `src/components/student/StudentLayout.tsx` | Modify | Remove unused navigation items |
| `src/components/student/NoticesPanel.tsx` | Create | Display notices from admin |
| `src/components/student/MessageAdminDialog.tsx` | Create | Dialog to send message to admin |

### Phase 6: Students Page Simplification

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Students.tsx` | Modify | Remove attendance section, add popup search, simplify UI |

### Phase 7: Quizzes UI Modernization

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Quizzes.tsx` | Major Rewrite | Complete UI overhaul with modern design |

### Phase 8: Navigation Updates

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/Sidebar.tsx` | Modify | Remove Off Days from navigation |

---

## Detailed UI Designs

### Admin Dashboard - New Layout
```text
┌────────────────────────────────────────────────────────────────────┐
│  Admin Dashboard                                    [Refresh]       │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │  Users   │ │ Online   │ │ Messages │ │ Students │ │ Sessions │  │
│ │    12    │ │  ● 5     │ │   3 new  │ │   145    │ │  Today:8 │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├────────────────────────────────────────────────────────────────────┤
│  Online Users                     │  Recent Activity               │
│ ┌────────────────────────────────┐│ ┌────────────────────────────┐│
│ │ ● Ahmed Ali (Student)    2m   ││ │ Ahmed logged in     2m ago ││
│ │ ● Sarah J. (Teacher)     5m   ││ │ Quiz submitted      5m ago ││
│ │ ○ Mike S. (offline)    3h ago ││ │ CA Project updated 10m ago ││
│ └────────────────────────────────┘│ └────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│  Messages                         │  User Management               │
│ ┌────────────────────────────────┐│ ┌────────────────────────────┐│
│ │ Ahmed: "Question about..."    ││ │ Name    │ Status │ Actions  ││
│ │ [View] [Reply]                ││ │ Ahmed   │ Active │ [Disable]││
│ └────────────────────────────────┘│ └────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Register Page - Week Calendar
```text
┌──────────────────────────────────────────────────────────────────┐
│  Week of Feb 3, 2026                      [< Prev]  [Next >]     │
├────┬────┬────┬────┬────┬────┬────┐
│ Mon│ Tue│ Wed│ Thu│ Fri│ Sat│ Sun│
│  3 │  4 │  5 │  6 │  7 │  8 │  9 │
│ ●  │ ●  │    │ ●  │ ●  │    │    │  ← ● = Teaching day
└────┴────┴────┴────┴────┴────┴────┘
```

### Register - Advanced Search Popup
```text
┌──────────────────────────────────────────────────────────────────┐
│  Advanced Search                                          [X]    │
├──────────────────────────────────────────────────────────────────┤
│  Name/ID:  [________________]                                    │
│  Section:  [All ▼]    Course:  [All ▼]                          │
│  Absence:  [Min %] — [Max %]                                     │
│  Status:   [All ▼]                                               │
├──────────────────────────────────────────────────────────────────┤
│  Results (3 found):                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Ahmed Ali     │ 12345 │ Section A │ 1.5% │ [View] [Notice] │ │
│  │ Sarah Johnson │ 12346 │ Section B │ 0.5% │ [View] [Notice] │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                    [Clear]  [Apply Filters]      │
└──────────────────────────────────────────────────────────────────┘
```

### Post Notice Dialog
```text
┌──────────────────────────────────────────────────────────────────┐
│  Post Notice to Ahmed Ali                                 [X]    │
├──────────────────────────────────────────────────────────────────┤
│  Notice Type: [Attendance Warning ▼]                             │
│                                                                  │
│  Title:   [Absence Warning                          ]            │
│                                                                  │
│  Message:                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Your absence rate has reached 2%. Please attend class    │   │
│  │ regularly to avoid academic consequences.                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│                                      [Cancel]  [Post Notice]     │
└──────────────────────────────────────────────────────────────────┘
```

### Modernized Quizzes Page
```text
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  📝 Quizzes                                   [+ Create Quiz] │ │
│  │  Create and manage quizzes for your sections                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐ │
│  │  Your Quizzes           │  │  Questions                       │ │
│  │  ───────────────────────│  │  ─────────────────────────────── │ │
│  │  ┌───────────────────┐  │  │  Select a quiz to view questions│ │
│  │  │ ■ Unit 1 Quiz     │  │  │                                 │ │
│  │  │   Section A       │  │  │  ┌─────────────────────────────┐│ │
│  │  │   ● Active        │  │  │  │  Q1. What is...?           ││ │
│  │  │   5 questions     │  │  │  │  A) Option 1   B) Option 2 ││ │
│  │  └───────────────────┘  │  │  │  C) Option 3   D) Option 4 ││ │
│  │  ┌───────────────────┐  │  │  │  ✓ Answer: A               ││ │
│  │  │ □ Unit 2 Quiz     │  │  │  └─────────────────────────────┘│ │
│  │  │   Section B       │  │  │                                 │ │
│  │  │   ○ Inactive      │  │  │                                 │ │
│  │  └───────────────────┘  │  │                                 │ │
│  └─────────────────────────┘  └─────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Students Page - Simplified with Search Popup
```text
┌────────────────────────────────────────────────────────────────────┐
│  Students                                    [Search] [+ Add]      │
│  Manage your student list                                          │
├────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  Total Students: 145                                           ││
│  │                                                                ││
│  │  Recent Students:                                              ││
│  │  • Ahmed Ali (12345) - Section A                              ││
│  │  • Sarah Johnson (12346) - Section B                          ││
│  │  • ... (click Search to find specific students)               ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘

     ↓ Click "Search" opens popup ↓

┌────────────────────────────────────────────────────────────────────┐
│  Search Students                                           [X]     │
├────────────────────────────────────────────────────────────────────┤
│  🔍 [Type name or student ID...                            ]      │
│                                                                    │
│  Results:                                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Ahmed Ali           │ 12345    │ Section A    │ [Details]  │   │
│  │ Ahmed Hassan        │ 12399    │ Section C    │ [Details]  │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### Student Portal - With Notices
```text
┌────────────────────────────────────────────────────────────────────┐
│  Welcome, Ahmed Ali!                           [Message Admin]     │
├────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  📢 Notices (2 unread)                                        ││
│  │  ─────────────────────────────────────────────────────────────││
│  │  ⚠️  Attendance Warning                    Feb 3, 2026  [NEW] ││
│  │      Your absence rate has reached 2%                         ││
│  │  ─────────────────────────────────────────────────────────────││
│  │  ℹ️  Schedule Update                        Feb 1, 2026       ││
│  │      Room change for next week's class                        ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Quick Access                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Quizzes    │  │ LMS Updates  │  │ CA Projects  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Key Features Implementation

### 1. Session Tracking Logic
```typescript
// On student login
const createSession = async (studentId: string) => {
  await supabase.from('user_sessions').insert({
    student_id: studentId,
    user_type: 'student',
    login_at: new Date().toISOString(),
    is_active: true,
  });
};

// On logout - update session
const endSession = async (sessionId: string) => {
  const { data: session } = await supabase
    .from('user_sessions')
    .select('login_at')
    .eq('id', sessionId)
    .single();
  
  const duration = Math.floor(
    (Date.now() - new Date(session.login_at).getTime()) / 60000
  );
  
  await supabase.from('user_sessions').update({
    logout_at: new Date().toISOString(),
    session_duration_minutes: duration,
    is_active: false,
  }).eq('id', sessionId);
};
```

### 2. Student Deactivation
```typescript
// Admin can toggle student active status
const toggleStudentActive = async (studentId: string, isActive: boolean) => {
  await supabase.from('students').update({ is_active: !isActive }).eq('id', studentId);
  
  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: adminUserId,
    user_type: 'admin',
    action: isActive ? 'deactivated_student' : 'activated_student',
    entity_type: 'student',
    entity_id: studentId,
  });
};

// In useStudentAuth - check if student is active
if (!data.is_active) {
  return { error: new Error('Your account has been deactivated. Please contact admin.') };
}
```

### 3. Real-time Online Status
Using Supabase Realtime Presence:
```typescript
const channel = supabase.channel('online-users')
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    setOnlineUsers(Object.values(state).flat());
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ 
        user_id: userId, 
        user_type: 'student',
        name: studentName 
      });
    }
  });
```

---

## Implementation Order

1. **Database migrations** - Create all new tables with RLS
2. **Core hooks** - useActivityLogger, usePresence, modify useStudentAuth
3. **Admin dashboard** - Complete overhaul with all new components
4. **Messaging system** - Two-way messaging components
5. **Register enhancements** - Calendar, search, notices
6. **Student portal** - Notices and messaging
7. **Students page** - Simplify with popup search
8. **Quizzes UI** - Modern redesign
9. **Navigation cleanup** - Remove Off Days
