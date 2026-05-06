import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DiarySidebar } from '@/components/diary/DiarySidebar';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { DiaryTimeline } from '@/components/diary/DiaryTimeline';
import { AIAssistantPanel } from '@/components/diary/AIAssistantPanel';
import { DiaryAnalytics } from '@/components/diary/DiaryAnalytics';
import { DiarySearch } from '@/components/diary/DiarySearch';
import { AmbientBackground } from '@/components/diary/AmbientBackground';
import { useDiary, DiaryNote } from '@/hooks/useDiary';
import { DiaryCategory } from '@/lib/diary-meta';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export default function Diary() {
  const { notes, loading, create, update, remove } = useDiary();
  const [category, setCategory] = useState<DiaryCategory | 'All'>('All');
  const [date, setDate] = useState<Date | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<DiaryNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tab, setTab] = useState('timeline');
  const [categorizing, setCategorizing] = useState(false);

  const handleAutoCategorize = async () => {
    if (categorizing || !notes.length) return;
    setCategorizing(true);
    const t = toast.loading(`Categorizing ${notes.length} entries…`);
    let done = 0, failed = 0;
    for (const n of notes) {
      try {
        const { data, error } = await supabase.functions.invoke('diary-ai', {
          body: { action: 'categorize', title: n.title, content: n.content || '' },
        });
        if (error) throw error;
        const cat = (data as any)?.category;
        if (cat && cat !== n.category) await update(n.id, { category: cat } as any);
        done++;
      } catch { failed++; }
      toast.loading(`Categorizing ${done + failed}/${notes.length}…`, { id: t });
    }
    toast.success(`Done — ${done} categorized${failed ? `, ${failed} failed` : ''}`, { id: t });
    setCategorizing(false);
  };


  const filtered = useMemo(() => notes.filter(n => {
    if (category !== 'All' && n.category !== category) return false;
    if (date && n.note_date !== date.toISOString().slice(0, 10)) return false;
    return true;
  }), [notes, category, date]);

  // sync editor state when selection changes
  useEffect(() => {
    const found = notes.find(n => n.id === selectedId) || null;
    setEditorState(found);
    if (found) setTab('editor');
  }, [selectedId, notes]);

  // Reminder watcher
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      notes.forEach(n => {
        if (!n.reminder_at) return;
        const t = new Date(n.reminder_at).getTime();
        const diff = t - now;
        if (diff > 0 && diff < 60_000) {
          toast(`🔔 ${n.title}`, { description: 'Reminder is starting now.' });
        }
      });
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [notes]);

  const handleNew = async () => {
    const n = await create({ category: category === 'All' ? 'Personal' : category });
    if (n) { setSelectedId(n.id); setTab('editor'); }
  };

  const handleSave = async () => {
    if (!editorState) return;
    setSaving(true);
    const { id, user_id, created_at, updated_at, ...patch } = editorState;
    await update(id, patch as any);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editorState) return;
    await remove(editorState.id);
    setSelectedId(null);
    setTab('timeline');
  };

  const handleReflect = async () => {
    if (!editorState) return;
    setReflecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('diary-ai', {
        body: { action: 'reflect', title: editorState.title, content: editorState.content },
      });
      if (error) throw error;
      const r = (data as any)?.reflection;
      if (!r) throw new Error('No reflection returned');
      const updated = await update(editorState.id, {
        ai_summary: r.summary,
        ai_action_items: r.action_items,
        ai_tags: r.tags,
        mood: editorState.mood || r.mood,
        mood_emoji: editorState.mood_emoji || r.mood_emoji,
      } as any);
      if (updated) setEditorState(updated);
      toast.success('Reflection ready');
    } catch (e: any) {
      toast.error(e?.message || 'Reflection failed');
    } finally { setReflecting(false); }
  };

  return (
    <DashboardLayout>
      <AmbientBackground />
      <div className="relative diary-bg-wash p-4 md:p-6">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap fade-in-up">
          <div>
            <h1 className="font-serif-diary text-4xl md:text-5xl tracking-tight">Diary</h1>
            <p className="font-serif-diary italic text-muted-foreground mt-2 text-sm md:text-base">
              A quieter place to think — with a little help from AI.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_340px] gap-5">
          <DiarySidebar
            notes={notes}
            category={category}
            onCategory={(c) => { setCategory(c); setDate(undefined); }}
            selectedDate={date}
            onDate={setDate}
            onNew={handleNew}
            onAnalytics={() => setAnalyticsOpen(true)}
            onSearch={() => setSearchOpen(true)}
            onAutoCategorize={handleAutoCategorize}
            categorizing={categorizing}
          />

          <div className="min-w-0 fade-in-up stagger-d-1">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="glass-diary">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="editor" disabled={!editorState}>Editor</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <DiaryTimeline notes={filtered} selectedId={selectedId} onSelect={setSelectedId} />
                )}
              </TabsContent>

              <TabsContent value="editor" className="mt-4">
                {editorState && (
                  <DiaryEditor
                    note={editorState}
                    onChange={(p) => setEditorState(prev => prev ? { ...prev, ...p } as DiaryNote : prev)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onReflect={handleReflect}
                    saving={saving}
                    reflecting={reflecting}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="min-w-0">
            <AIAssistantPanel note={editorState} notes={notes} onReflect={handleReflect} reflecting={reflecting} />
          </div>
        </div>

        <DiaryAnalytics open={analyticsOpen} onOpenChange={setAnalyticsOpen} notes={notes} />
        <DiarySearch open={searchOpen} onOpenChange={setSearchOpen} notes={notes} onPick={setSelectedId} />
      </div>
    </DashboardLayout>
  );
}
