
-- Create admin_conversations table
CREATE TABLE public.admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id_1 uuid NOT NULL,
  admin_id_2 uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id_1, admin_id_2)
);

ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
ON public.admin_conversations FOR SELECT TO authenticated
USING (auth.uid() = admin_id_1 OR auth.uid() = admin_id_2);

CREATE POLICY "Users can create conversations they participate in"
ON public.admin_conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = admin_id_1 OR auth.uid() = admin_id_2);

-- Create admin_messages table
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.admin_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
ON public.admin_messages FOR SELECT TO authenticated
USING (conversation_id IN (
  SELECT id FROM public.admin_conversations
  WHERE admin_id_1 = auth.uid() OR admin_id_2 = auth.uid()
));

CREATE POLICY "Participants can send messages"
ON public.admin_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND conversation_id IN (
    SELECT id FROM public.admin_conversations
    WHERE admin_id_1 = auth.uid() OR admin_id_2 = auth.uid()
  )
);

CREATE POLICY "Participants can update message read status"
ON public.admin_messages FOR UPDATE TO authenticated
USING (conversation_id IN (
  SELECT id FROM public.admin_conversations
  WHERE admin_id_1 = auth.uid() OR admin_id_2 = auth.uid()
));

-- Trigger to update updated_at on admin_conversations
CREATE TRIGGER update_admin_conversations_updated_at
BEFORE UPDATE ON public.admin_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update conversation timestamp when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_on_new_message
AFTER INSERT ON public.admin_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
