-- Fix RLS policies for conversations table to use correct has_role function reference

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they created" ON public.conversations;

-- Recreate with correct function reference
CREATE POLICY "Admins can view all conversations" ON public.conversations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update conversations they created" ON public.conversations
  FOR UPDATE USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
