
-- Create conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct',
  title text,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create conversation_participants table
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid,
  student_id uuid,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id uuid,
  sender_student_id uuid,
  content text NOT NULL,
  attachment_url text,
  attachment_type text,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create typing_indicators table
CREATE TABLE public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid,
  student_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Helper function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
      AND is_active = true
  )
$$;

-- RLS for conversations: participants can view
CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT TO authenticated
USING (is_conversation_participant(id, auth.uid()));

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update conversation"
ON public.conversations FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

-- RLS for conversation_participants
CREATE POLICY "Participants can view other participants"
ON public.conversation_participants FOR SELECT TO authenticated
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Authenticated users can add participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Participants can update their own record"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- RLS for chat_messages
CREATE POLICY "Participants can view messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants can send messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = sender_user_id)
  AND is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "Senders can update their messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_user_id);

-- RLS for typing_indicators
CREATE POLICY "Participants can view typing indicators"
ON public.typing_indicators FOR SELECT TO authenticated
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can insert their typing indicator"
ON public.typing_indicators FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their typing indicator"
ON public.typing_indicators FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger to update conversation updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update conversation timestamp on new chat message
CREATE OR REPLACE FUNCTION public.update_chat_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_on_new_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_conversation_timestamp();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
