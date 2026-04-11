

# Fix Build Errors in useAdminChat

## Problem
The `useAdminChat.tsx` hook references two database tables (`admin_conversations` and `admin_messages`) that don't exist, causing 20+ TypeScript errors that break the entire build.

## Analysis
The admin chat feature (4 files) is not referenced anywhere else in the app -- no routes, no sidebar links, no imports from other components. It's dead code that was added without the corresponding database tables.

## Plan

**Create the two missing database tables** via migration:

1. **`admin_conversations`** table with columns: `id` (uuid PK), `admin_id_1` (uuid, not null), `admin_id_2` (uuid, not null), `created_at`, `updated_at`. Add unique constraint on `(admin_id_1, admin_id_2)`. Enable RLS with policies allowing authenticated users to select/insert conversations they participate in.

2. **`admin_messages`** table with columns: `id` (uuid PK), `conversation_id` (uuid FK to admin_conversations), `sender_id` (uuid, not null), `content` (text, not null), `is_read` (boolean, default false), `created_at`. Enable RLS with policies allowing participants to read messages and senders to insert.

3. **Enable realtime** on both tables for the live chat subscriptions.

4. **Add `updated_at` trigger** on `admin_conversations` so it updates when new messages arrive.

This approach fixes the build errors and makes the existing admin chat code functional rather than deleting it.

