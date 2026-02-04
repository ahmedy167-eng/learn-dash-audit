

# Teacher Dashboard Enhancement Plan

## Overview

This plan addresses four key requirements:
1. **Display teacher's name on dashboard** after login
2. **Move messages to a bell icon** instead of showing inline on dashboard
3. **Restrict student messaging** to only their assigned teacher
4. **Update message compose dropdown** to show teachers dynamically

---

## Current State Analysis

**Issue 1: Teacher Name Not Displayed**
- The `Dashboard.tsx` shows "Welcome back! Here's your overview." but doesn't show the teacher's name
- The `useAuth` hook provides `user` object with `user_metadata.full_name` from signup
- The `profiles` table also stores `full_name` which can be fetched

**Issue 2: Messages Shown Inline**
- `MessageInbox` component is embedded directly in the Dashboard grid
- Takes up significant space on the dashboard
- Should be moved to a popover/dropdown triggered by a bell icon in the header

**Issue 3: Student Can Message Any Teacher**
- Current `MessageAdminDialog` fetches ALL teachers and admins
- Students should only be able to message their assigned section teacher
- The student's `section_id` links to `sections.user_id` (the teacher)

**Issue 4: Dynamic Teacher Dropdown**
- Already implemented but needs to be restricted based on student's section

---

## Solution Architecture

```text
Teacher Login Flow:
┌──────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│  Auth Sign In │ --> │ Fetch Profile   │ --> │ Display Name in      │
│              │     │ (full_name)     │     │ Dashboard Header     │
└──────────────┘     └─────────────────┘     └──────────────────────┘

Dashboard Layout Change:
┌────────────────────────────────────────────────────────────┐
│  Dashboard                              [Bell Icon] 🔔 (3)  │
│  Welcome back, Ahmed Ali!                                   │
├────────────────────────────────────────────────────────────┤
│  Stats Cards | Tasks | Overdue (NO inline message inbox)    │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼ Click bell
              ┌─────────────────────────────┐
              │  Messages Popover/Dialog    │
              │  ┌─────────────────────────┐│
              │  │ Student A - 2min ago   ││
              │  │ Question about HW...   ││
              │  └─────────────────────────┘│
              └─────────────────────────────┘

Student Messaging Flow:
┌──────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│ Student logs │ --> │ Get section_id  │ --> │ Fetch teacher from   │
│ in           │     │                 │     │ sections.user_id     │
└──────────────┘     └─────────────────┘     └──────────────────────┘
                                                      │
                                                      ▼
                              ┌──────────────────────────────────┐
                              │ Only show assigned teacher in    │
                              │ recipient dropdown + Admin option│
                              └──────────────────────────────────┘
```

---

## File Changes

### 1. Create TeacherMessagesDropdown Component

**New File:** `src/components/layout/TeacherMessagesDropdown.tsx`

Creates a bell icon with notification badge that opens a popover/dialog showing messages:
- Displays unread count badge
- Lists messages in a scrollable popover
- Clicking a message opens reply dialog
- Uses existing `MessageInbox` logic but in popover format

```typescript
// Key structure:
export function TeacherMessagesDropdown() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  // Fetch messages for this user
  // Show bell icon with badge
  // Popover with message list
  // Dialog for reading/replying
}
```

### 2. Update Dashboard.tsx

**File:** `src/pages/Dashboard.tsx`

**Changes:**
- Fetch teacher's profile name from `profiles` table or `user_metadata`
- Remove inline `MessageInbox` component
- Add bell icon button in header that triggers the messages dropdown
- Display personalized welcome message

**Before:**
```typescript
<h1 className="text-2xl font-bold">Dashboard</h1>
<p className="text-muted-foreground">Welcome back! Here's your overview.</p>
// MessageInbox embedded in grid
```

**After:**
```typescript
const [profile, setProfile] = useState<{ full_name: string } | null>(null);

// In header:
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Dashboard</h1>
    <p className="text-muted-foreground">
      Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
    </p>
  </div>
  <div className="flex items-center gap-2">
    <TeacherMessagesDropdown />  // Bell icon with messages
    <Link to="/tasks"><Button>New Task</Button></Link>
  </div>
</div>
// No MessageInbox in grid
```

### 3. Update MessageAdminDialog.tsx for Student Restrictions

**File:** `src/components/student/MessageAdminDialog.tsx`

**Changes:**
- Only fetch the student's assigned teacher (from their section)
- Keep "Administrator (General)" option for admin messages
- Remove ability to message other teachers

**Current Logic:**
```typescript
// Fetches ALL section owners (teachers)
const { data: sections } = await supabase
  .from('sections')
  .select('user_id');
const teacherIds = [...new Set(sections?.map(s => s.user_id) || [])];
```

**New Logic:**
```typescript
// Only fetch the student's assigned teacher
if (student?.section_id) {
  const { data: section } = await supabase
    .from('sections')
    .select('user_id')
    .eq('id', student.section_id)
    .single();
  
  if (section?.user_id) {
    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('user_id', section.user_id)
      .single();
    
    // Add only this teacher to recipients
    recipientList.push({
      user_id: teacherProfile.user_id,
      full_name: teacherProfile.full_name,
      type: 'teacher',
      label: `${teacherProfile.full_name || 'My Teacher'}`,
    });
  }
}
```

**UI Change:**
- If student has no section assigned, show only "Administrator" option
- If student has section, show:
  - Their assigned teacher
  - Administrator (General) option

---

## Implementation Details

### Profile Fetching for Teacher Name

```typescript
// In Dashboard.tsx useEffect
const fetchProfile = async () => {
  if (!user) return;
  
  // Try user_metadata first (set during signup)
  const metaName = user.user_metadata?.full_name;
  if (metaName) {
    setProfile({ full_name: metaName });
    return;
  }
  
  // Fallback to profiles table
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .single();
  
  if (data) {
    setProfile(data);
  }
};
```

### Messages Dropdown Structure

```typescript
// TeacherMessagesDropdown.tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-80 p-0" align="end">
    <div className="p-3 border-b">
      <h4 className="font-semibold">Messages</h4>
    </div>
    <ScrollArea className="h-[300px]">
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} onClick={openMessage} />
      ))}
    </ScrollArea>
  </PopoverContent>
</Popover>
```

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/TeacherMessagesDropdown.tsx` | Create | Bell icon with messages popover for teachers |
| `src/pages/Dashboard.tsx` | Modify | Add teacher name, remove inline inbox, add bell icon |
| `src/components/student/MessageAdminDialog.tsx` | Modify | Restrict to only assigned teacher + admin |

---

## Technical Notes

- **Teacher Name Source**: First tries `user.user_metadata.full_name`, falls back to `profiles` table
- **Section Teacher Lookup**: Uses `sections.user_id` where `sections.id = student.section_id`
- **Existing Notifications**: The `MessageInbox` realtime subscription pattern is reused in the dropdown
- **Student Without Section**: Can only message "Administrator (General)"
- **Backward Compatibility**: Existing messages and notification behavior preserved

---

## Edge Cases Handled

1. **Student not assigned to section**: Shows only Admin option
2. **Teacher profile missing name**: Falls back to email or "Teacher"
3. **New teacher with no messages**: Shows empty state in popover
4. **Real-time updates**: Maintains realtime subscription for new messages

