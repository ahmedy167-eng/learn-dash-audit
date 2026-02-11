-- Create conversations table for chat threads
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  title TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create conversation_participants table for managing who's in a conversation
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT user_or_student_check CHECK (
    (user_id IS NOT NULL AND student_id IS NULL) OR 
    (user_id IS NULL AND student_id IS NOT NULL) OR 
    (user_id IS NOT NULL AND student_id IS NOT NULL)
  ),
  UNIQUE (conversation_id, COALESCE(user_id, student_id))
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create chat_messages table for storing messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sender_check CHECK (
    (sender_user_id IS NOT NULL AND sender_student_id IS NULL) OR 
    (sender_user_id IS NULL AND sender_student_id IS NOT NULL) OR
    (sender_user_id IS NOT NULL AND sender_student_id IS NOT NULL)
  )
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create message_read_receipts table for tracking read status
CREATE TABLE public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, COALESCE(user_id, student_id))
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Create typing_indicators table for real-time typing indicators
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT typing_user_check CHECK (
    (user_id IS NOT NULL AND student_id IS NULL) OR 
    (user_id IS NULL AND student_id IS NOT NULL)
  )
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they're part of" ON public.conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM public.conversation_participants 
      WHERE user_id = auth.uid() OR student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view all conversations" ON public.conversations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users and students can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update conversations they created" ON public.conversations
  FOR UPDATE USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view participants of conversations they're part of" ON public.conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants 
      WHERE user_id = auth.uid() OR student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can join conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own participation" ON public.conversation_participants
  FOR UPDATE USING (
    user_id = auth.uid() OR student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in conversations they're part of" ON public.chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants 
      WHERE user_id = auth.uid() OR student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
      )
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users and students can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own messages" ON public.chat_messages
  FOR UPDATE USING (
    sender_user_id = auth.uid() OR sender_student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for message_read_receipts
CREATE POLICY "Users can view read receipts for messages they can see" ON public.message_read_receipts
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM public.chat_messages cm
      WHERE cm.conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants 
        WHERE user_id = auth.uid() OR student_id IN (
          SELECT id FROM public.students WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Anyone can insert read receipts" ON public.message_read_receipts
  FOR INSERT WITH CHECK (true);

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing indicators in their conversations" ON public.typing_indicators
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants 
      WHERE user_id = auth.uid() OR student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert typing indicators" ON public.typing_indicators
  FOR INSERT WITH CHECK (true);

-- Enable realtime for all chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Create indexes for better query performance
CREATE INDEX idx_chat_messages_conversation_created ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id, conversation_id);
CREATE INDEX idx_conversation_participants_student ON public.conversation_participants(student_id, conversation_id);
CREATE INDEX idx_typing_indicators_conversation ON public.typing_indicators(conversation_id, created_at DESC);
