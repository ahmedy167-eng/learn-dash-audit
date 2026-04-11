
DROP POLICY "Authenticated users can add participants" ON public.conversation_participants;

CREATE POLICY "Conversation creators can add participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND created_by = auth.uid()
  )
  OR user_id = auth.uid()
);
