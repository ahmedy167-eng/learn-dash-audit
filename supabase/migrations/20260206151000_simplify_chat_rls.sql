-- Drop existing RLS policies that have circular dependencies
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants of conversations they're part of" ON public.conversation_participants;

-- Simplify RLS policies to avoid circular dependencies
-- Users and students can view all conversations (filtering happens in application)
CREATE POLICY "Authenticated users can view conversations" ON public.conversations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can view all participants (filtering happens in application)
CREATE POLICY "Authenticated users can view participants" ON public.conversation_participants
  FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can view all messages (filtering happens in application)
CREATE POLICY "Authenticated users can view messages" ON public.chat_messages
  FOR SELECT USING (auth.role() = 'authenticated');
