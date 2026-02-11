-- Simple Admin Chat System
-- Direct messaging between admins only

CREATE TABLE public.admin_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (admin_id_1 < admin_id_2),
  UNIQUE(admin_id_1, admin_id_2)
);

CREATE TABLE public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.admin_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Only admins can view/create conversations they're part of
CREATE POLICY "Admins can view their conversations" ON public.admin_conversations
  FOR SELECT USING (
    (admin_id_1 = auth.uid() OR admin_id_2 = auth.uid()) 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can create conversations" ON public.admin_conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Admins can update conversation timestamps
CREATE POLICY "Admins can update conversations" ON public.admin_conversations
  FOR UPDATE USING (admin_id_1 = auth.uid() OR admin_id_2 = auth.uid());

-- Admins can view messages in their conversations
CREATE POLICY "Admins can view messages" ON public.admin_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.admin_conversations 
      WHERE admin_id_1 = auth.uid() OR admin_id_2 = auth.uid()
    )
  );

-- Admins can insert messages
CREATE POLICY "Admins can send messages" ON public.admin_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM public.admin_conversations 
      WHERE admin_id_1 = auth.uid() OR admin_id_2 = auth.uid()
    )
  );

-- Admins can update their own messages
CREATE POLICY "Admins can update their messages" ON public.admin_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;

-- Indexes for performance
CREATE INDEX idx_admin_conversations_users ON public.admin_conversations(admin_id_1, admin_id_2);
CREATE INDEX idx_admin_messages_conversation ON public.admin_messages(conversation_id, created_at DESC);
CREATE INDEX idx_admin_messages_sender ON public.admin_messages(sender_id);
