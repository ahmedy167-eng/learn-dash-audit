import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface DiaryNote {
  id: string;
  user_id: string;
  weekday: string;
  note_date: string;
  note_time: string | null;
  title: string;
  content: string;
  reminder_at: string | null;
  category: string;
  mood: string | null;
  mood_emoji: string | null;
  ai_summary: string | null;
  ai_action_items: any;
  ai_tags: string[] | null;
  voice_url: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useDiary() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<DiaryNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('diary_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('note_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load diary');
    else setNotes((data || []) as DiaryNote[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (init: Partial<DiaryNote> = {}) => {
    if (!user) return null;
    const today = new Date();
    const weekdayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()];
    const payload = {
      user_id: user.id,
      weekday: weekdayName,
      note_date: today.toISOString().slice(0, 10),
      title: init.title ?? 'Untitled entry',
      content: init.content ?? '',
      category: init.category ?? 'Personal',
      ...init,
    };
    const { data, error } = await supabase.from('diary_notes').insert(payload).select().single();
    if (error) { toast.error('Could not create entry'); return null; }
    setNotes(prev => [data as DiaryNote, ...prev]);
    return data as DiaryNote;
  };

  const update = async (id: string, patch: Partial<DiaryNote>) => {
    const { data, error } = await supabase
      .from('diary_notes')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) { toast.error('Save failed'); return null; }
    setNotes(prev => prev.map(n => n.id === id ? (data as DiaryNote) : n));
    return data as DiaryNote;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('diary_notes').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('Entry removed');
  };

  return { notes, loading, refetch: fetchAll, create, update, remove };
}
