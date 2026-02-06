

# Staff Chat Feature -- Teacher & Admin Messaging

Add a real-time chat system that lets teachers and admins communicate directly with each other, accessible from the sidebar navigation on every dashboard page.

---

## Overview

A new "Staff Chat" page where authenticated staff members (teachers and admins) can:
- See a list of all other staff members (from the `profiles` table)
- Select a person to start a conversation
- View message history in a chat-style thread layout
- Send messages in real time with instant delivery via Realtime subscriptions
- See unread message indicators

---

## 1. Database Changes

**No new tables needed.** The existing `messages` table already supports user-to-user messaging with `sender_user_id`, `recipient_user_id`, `sender_type`, and `recipient_type` columns.

Staff chat messages will use:
- `sender_type = 'staff'`
- `recipient_type = 'staff'`
- `sender_user_id` = the sender's auth user ID
- `recipient_user_id` = the recipient's auth user ID

The existing RLS policies already allow:
- Authenticated users to insert messages where `sender_user_id = auth.uid()`
- Users to view messages where they are sender or recipient
- Users to mark received messages as read

**Realtime**: The `messages` table is likely already added to `supabase_realtime` publication (used by existing messaging features). If not, a migration will add it.

---

## 2. New Files

### `src/pages/StaffChat.tsx`
The main chat page with a two-panel layout:
- **Left panel**: List of staff members with search, showing last message preview and unread count per conversation
- **Right panel**: Chat thread with selected person, showing messages in a bubble-style layout (own messages on the right, received on the left), a message input at the bottom, and auto-scroll to newest messages

Key behaviors:
- Fetches all profiles to build the staff list
- Fetches conversation messages filtered by `sender_type = 'staff'` and the two user IDs
- Realtime subscription on the `messages` table to instantly show new messages
- Marks messages as read when a conversation is opened
- Responsive: on mobile, the staff list and chat thread toggle between views

### `src/hooks/useStaffChat.tsx`
Custom hook encapsulating:
- Fetching staff members from `profiles` table
- Fetching conversations (latest message per staff member, unread counts)
- Sending messages
- Realtime subscription for live updates
- Marking messages as read

---

## 3. Navigation Integration

### `src/components/layout/Sidebar.tsx`
- Add a "Staff Chat" nav item with a `MessageCircle` icon between existing nav items
- Include an unread badge count next to the nav item showing total unread staff messages

### `src/App.tsx`
- Add route: `<Route path="/staff-chat" element={<StaffChat />} />`
- Import the new `StaffChat` page component

---

## 4. UI Design

Following the existing "Clean & Minimal Premium" design system:

**Staff List Panel (left)**:
- Search input at top to filter staff members by name
- Each staff member row shows: avatar initial circle, name, role badge (Admin/Teacher), last message preview truncated, timestamp, unread count badge
- Active conversation highlighted with accent background
- Staggered fade-in animations on load

**Chat Thread Panel (right)**:
- Header showing selected person's name and role
- Scrollable message area with:
  - Sent messages: right-aligned, primary color background, white text
  - Received messages: left-aligned, muted background
  - Timestamps shown below each message cluster
- Message input area at the bottom with a text input and send button
- Empty state when no conversation is selected

**Animations**:
- Messages fade-in-up when they appear
- Hover-lift on staff list items
- Smooth transitions between conversations

---

## 5. Technical Details

### Message Query Pattern
```text
-- Fetch conversations for current user (latest message per staff contact)
SELECT DISTINCT ON (contact_id) ...
FROM messages
WHERE sender_type = 'staff' AND recipient_type = 'staff'
  AND (sender_user_id = current_user OR recipient_user_id = current_user)
ORDER BY contact_id, created_at DESC

-- Fetch thread between two users
SELECT * FROM messages
WHERE sender_type = 'staff' AND recipient_type = 'staff'
  AND ((sender_user_id = me AND recipient_user_id = them)
    OR (sender_user_id = them AND recipient_user_id = me))
ORDER BY created_at ASC
```

### Realtime Subscription
```text
supabase.channel('staff-chat')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `sender_type=eq.staff`
  }, callback)
  .subscribe()
```

### Files Modified
- `src/App.tsx` -- add route
- `src/components/layout/Sidebar.tsx` -- add nav item with unread badge

### Files Created
- `src/pages/StaffChat.tsx` -- main chat page
- `src/hooks/useStaffChat.tsx` -- chat logic hook

### Database Migration
- Verify `messages` table is in the `supabase_realtime` publication (add if not already)

