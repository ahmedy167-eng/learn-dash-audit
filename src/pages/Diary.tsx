import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, BellRing, FileDown, FileText, Plus, Save, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DiaryNote,
  downloadFolderDocx,
  downloadFolderPdf,
  downloadNoteDocx,
  downloadNotePdf,
  downloadReminderIcs,
} from '@/lib/diary-export';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const todayWeekday = () => {
  const idx = (new Date().getDay() + 6) % 7; // Mon=0
  return WEEKDAYS[idx];
};

export default function DiaryPage() {
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState<string>(todayWeekday());
  const [notes, setNotes] = useState<DiaryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // editor state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('');
  const [reminderAt, setReminderAt] = useState('');

  const fetchNotes = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('diary_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('note_date', { ascending: false })
      .order('note_time', { ascending: false });
    if (error) {
      toast.error('Failed to load diary');
    } else {
      setNotes((data || []) as DiaryNote[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [user]);

  const dayNotes = useMemo(
    () => notes.filter(n => n.weekday === activeDay),
    [notes, activeDay]
  );

  const selected = dayNotes.find(n => n.id === selectedId) || null;

  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setDate(selected.note_date);
      setTime(selected.note_time || '');
      setContent(selected.content || '');
      setReminderAt(selected.reminder_at ? selected.reminder_at.slice(0, 16) : '');
    }
  }, [selectedId]);

  const createNote = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('diary_notes')
      .insert({
        user_id: user.id,
        weekday: activeDay,
        note_date: today,
        title: 'Untitled',
        content: '',
      })
      .select()
      .single();
    if (error) { toast.error('Could not create note'); return; }
    setNotes(prev => [data as DiaryNote, ...prev]);
    setSelectedId((data as DiaryNote).id);
    toast.success('New note added');
  };

  const saveNote = async () => {
    if (!selected) return;
    setSaving(true);
    const payload = {
      title: title || 'Untitled',
      note_date: date || new Date().toISOString().slice(0, 10),
      note_time: time || null,
      content,
      reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
    };
    const { data, error } = await supabase
      .from('diary_notes')
      .update(payload)
      .eq('id', selected.id)
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    setNotes(prev => prev.map(n => n.id === selected.id ? (data as DiaryNote) : n));
    toast.success('Saved');
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('diary_notes').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success('Note deleted');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" /> Diary
            </h1>
            <p className="text-muted-foreground">Notebook-style daily notes with reminders & exports</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => downloadFolderPdf(activeDay, dayNotes)} disabled={!dayNotes.length}>
              <FileDown className="h-4 w-4 mr-2" /> Folder PDF
            </Button>
            <Button variant="outline" onClick={() => downloadFolderDocx(activeDay, dayNotes)} disabled={!dayNotes.length}>
              <FileText className="h-4 w-4 mr-2" /> Folder Word
            </Button>
            <Button onClick={createNote}>
              <Plus className="h-4 w-4 mr-2" /> New Note
            </Button>
          </div>
        </div>

        <Tabs value={activeDay} onValueChange={(v) => { setActiveDay(v); setSelectedId(null); }}>
          <TabsList className="grid grid-cols-7 w-full">
            {WEEKDAYS.map(d => (
              <TabsTrigger key={d} value={d}>{d.slice(0, 3)}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notes list */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">{activeDay} Notes ({dayNotes.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : dayNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No notes yet for {activeDay}</p>
              ) : dayNotes.map(n => (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${selectedId === n.id ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{n.title}</span>
                    {n.reminder_at && <BellRing className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {n.note_date}{n.note_time ? ` • ${n.note_time}` : ''}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Editor */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{selected ? 'Edit Note' : 'Select or create a note'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selected ? (
                <p className="text-sm text-muted-foreground">Pick a note from the left, or click "New Note".</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea rows={10} value={content} onChange={e => setContent(e.target.value)} placeholder="Write your diary entry..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Bell className="h-4 w-4" /> Reminder (optional)</Label>
                    <Input type="datetime-local" value={reminderAt} onChange={e => setReminderAt(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Click "Add to Calendar" to download a .ics file you can open in Google, Apple, or Outlook Calendar.</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button onClick={saveNote} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadReminderIcs({ ...selected, title, content, reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null })}
                      disabled={!reminderAt}
                    >
                      <BellRing className="h-4 w-4 mr-2" /> Add to Calendar
                    </Button>
                    <Button variant="outline" onClick={() => downloadNotePdf({ ...selected, title, content, note_date: date, note_time: time || null })}>
                      <FileDown className="h-4 w-4 mr-2" /> PDF
                    </Button>
                    <Button variant="outline" onClick={() => downloadNoteDocx({ ...selected, title, content, note_date: date, note_time: time || null })}>
                      <FileText className="h-4 w-4 mr-2" /> Word
                    </Button>
                    <Button variant="ghost" className="text-destructive ml-auto" onClick={() => deleteNote(selected.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
