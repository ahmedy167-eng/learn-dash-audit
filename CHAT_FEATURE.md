# Chat Feature Documentation

## Overview

A comprehensive real-time chat system has been implemented for the Learning Management System (LMS). This feature enables:

- **Direct messaging** between students, teachers, and admins
- **Group chat rooms** for classroom discussions
- **Real-time message delivery** using Supabase real-time subscriptions
- **Typing indicators** showing when other users are composing messages
- **Message read status** tracking
- **Message editing and deletion** capabilities

## Architecture

### Database Schema

The chat system uses 5 main tables:

1. **conversations** - Stores chat threads (direct or group)
   - `id`: Unique identifier
   - `type`: 'direct' or 'group'
   - `title`: Optional group name
   - `created_by`: User who initiated the conversation
   - `created_at`, `updated_at`: Timestamps

2. **conversation_participants** - Tracks who's in each conversation
   - Manages user participation (admin, member roles)
   - Stores last read timestamp for read status

3. **chat_messages** - Individual messages
   - Supports soft delete (with `deleted_at` column)
   - Tracks edit history with `edited_at`
   - Supports both user and student senders

4. **message_read_receipts** - Read status tracking
   - Tracks which users have read each message
   - Useful for read indicators

5. **typing_indicators** - Real-time typing status
   - Temporary table that shows who's currently typing
   - Auto-expires after 5 seconds

All tables have Row Level Security (RLS) policies to ensure:
- Users can only see conversations they're part of
- Admins can see all conversations
- Message visibility is restricted appropriately
- Real-time updates are enabled for all tables

### React Hooks

#### `useConversations(userId, studentId)`
Manages conversation list and creation.

**Features:**
- Fetches all conversations for a user
- Creates new direct or group conversations
- Real-time subscription for new conversations
- Returns: conversations array, loading state, error, creation function

**Usage:**
```tsx
const { conversations, loading, createConversation } = useConversations(
  userId,
  studentId
);
```

#### `useChat(conversationId, userId, studentId)`
Manages messages in a single conversation.

**Features:**
- Fetches message history
- Sends, edits, deletes messages
- Marks conversation as read
- Real-time message subscriptions
- Loads older messages (pagination)

**Usage:**
```tsx
const {
  messages,
  conversation,
  loading,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
} = useChat(conversationId, userId, studentId);
```

#### `useTypingIndicators(conversationId, userId, studentId)`
Shows real-time typing status of other users.

**Features:**
- Sets typing indicator for current user
- Listens for other users' typing indicators
- Auto-expires after 3 seconds
- Returns list of users currently typing

**Usage:**
```tsx
const { typingUsers, setTyping } = useTypingIndicators(
  conversationId,
  userId,
  studentId
);
```

### React Components

#### ChatPage
Main chat interface combining conversation list and chat window.

#### ConversationList
Left sidebar showing all conversations with search.

#### ChatWindow
Displays messages and input for a selected conversation.

#### ChatMessageComponent
Individual message display with edit/delete actions.

#### MessageInput
Message composition input with typing indicators.

#### TypingIndicator
Animated indicator showing when others are typing.

#### NewConversationDialog
Dialog for starting new direct or group chats.

## Routes Added

### Admin Portal
- `/chat` - Full chat interface for admins and teachers

### Student Portal
- `/student-portal/chat` - Chat interface for students

Both are accessible via navigation in their respective sidebars.

## Features

### 1. Direct Messaging
- Search for and message individual users
- Real-time message delivery
- Message read indicators

### 2. Group Chats
- Create group conversations
- Invite multiple participants
- Group title and management

### 3. Real-Time Updates
- Messages appear instantly for all participants
- Typing indicators update live
- Presence awareness

### 4. Message Management
- Edit own messages (marked as edited)
- Delete messages (soft delete)
- View message timestamps
- Read receipts

### 5. User Experience
- Search conversations by name or content
- Unread message badges
- Smooth animations and transitions
- Responsive design for all screen sizes

## Integration Points

### Admin Portal (Sidebar)
Added "Chat" link to main navigation - users can access chat from any page in admin portal.

### Student Portal
- "Chat" link in sidebar navigation
- "Chat" card on student dashboard/home page
- Quick access to messaging feature

## Security

### Row Level Security (RLS)
- Users can only view their own conversations
- Admins have unrestricted view
- Message visibility is enforced at database level
- No direct database access possible without proper authentication

### Authentication
- Relies on existing Supabase auth system
- Supports both admin (auth.users) and student (students table) authentication
- Session-based access control

## Deployment Steps

1. **Run Migration**
   ```bash
   supabase migration up
   # or apply the migration through Supabase dashboard
   ```

2. **Install Dependencies** (already in package.json)
   - `date-fns` - for timestamp formatting
   - Supabase components - already available

3. **No Environment Variables Needed**
   - Uses existing Supabase configuration
   - All tables inherit RLS from database setup

4. **Build and Deploy**
   ```bash
   npm run build
   npm run preview
   ```

## File Structure

```
src/
├── components/chat/
│   ├── ChatPage.tsx              # Main chat page
│   ├── ChatWindow.tsx            # Chat conversation view
│   ├── ChatMessage.tsx           # Message component
│   ├── ConversationList.tsx      # Conversation sidebar
│   ├── MessageInput.tsx          # Message input field
│   ├── TypingIndicator.tsx       # Typing indicator
│   ├── NewConversationDialog.tsx # New chat dialog
│   └── index.ts                  # Exports
├── hooks/
│   └── useChat.tsx              # All chat hooks
├── pages/
│   ├── AdminChat.tsx            # Admin chat page
│   └── StudentChat.tsx          # Student chat page
└── App.tsx                       # Routes added

supabase/migrations/
└── 20260206145000_create_chat_system.sql  # Database schema
```

## Performance Considerations

1. **Real-Time Subscriptions**
   - Each conversation has its own channel
   - Typing indicators have 5-second expiry
   - Messages are paginated (50 per load)

2. **Database Indexes**
   - Conversations indexed by participant and timestamp
   - Messages indexed by conversation and creation time
   - Typing indicators indexed by conversation

3. **Caching**
   - Messages stored in component state
   - Conversations list cached locally
   - Real-time updates merge with existing data

## Testing the Feature

### For Admin Users
1. Login to admin portal
2. Click "Chat" in sidebar
3. Click "New Conversation"
4. Select another admin/teacher and start chatting

### For Students
1. Login to student portal
2. Click "Chat" card or "Chat" in sidebar
3. Click "New Conversation"
4. Select a teacher/admin or another student
5. Start chatting

### Real-Time Features
- Open chat on two browser windows
- Type in one window to see typing indicator in the other
- See messages appear instantly across windows
- Edit/delete messages to see updates

## Future Enhancements

Possible features to add:

1. **File/Image Sharing**
   - Upload support in attachments
   - Image previews in chat

2. **Message Reactions**
   - Emoji reactions to messages
   - Reaction counts

3. **Voice Messages**
   - Audio recording and playback
   - Transcription

4. **Notifications**
   - Browser push notifications for new messages
   - Email notifications for important chats

5. **Chat Analytics**
   - Message frequency by user
   - Response time tracking
   - Engagement reporting

6. **Moderation Tools**
   - Message reporting
   - User blocking
   - Content filtering

7. **Advanced Messages**
   - Message threading/reactions
   - Rich text formatting
   - Message search within conversations

## Troubleshooting

### Messages not appearing
- Check Supabase real-time is enabled
- Verify RLS policies in database
- Check browser console for errors

### Typing indicator not showing
- Ensure `useTypingIndicators` hook is called
- Check that conversation_id is valid
- Verify typing_indicators table has realtime enabled

### Conversations not loading
- Verify user is authenticated
- Check RLS policies allow access
- Ensure user is a participant in the conversation

### Performance issues
- Clear browser cache
- Check Supabase dashboard for active connections
- Verify database indexes are created
- Reduce number of real-time subscriptions

## Support

For issues or questions:
1. Check the database schema migration file
2. Review RLS policies in Supabase
3. Check browser console for error messages
4. Verify Supabase connection is active
