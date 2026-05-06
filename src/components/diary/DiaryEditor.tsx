import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DiaryNote } from '@/hooks/useDiary';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CategoryChip } from './CategoryChip';
import { MoodPicker } from './MoodPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { DiaryCategory } from '@/lib/diary-meta';
import { Bell, FileDown, FileText, Save, Trash2, Loader2, BellRing, Pin, Maximize2, Minimize2, Sparkles, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { downloadNoteDocx, downloadNotePdf, downloadReminderIcs } from '@/lib/diary-export';

interface Props {
  note: DiaryNote;
  onChange: (patch: Partial<DiaryNote>) => void;
  onSave: () => Promise<void>;
  onDelete: () => void;
  onReflect: () => void;
  saving: boolean;
  reflecting: boolean;
}

export function DiaryEditor({ note, onChange, onSave, onDelete, onReflect, saving, reflecting }: Props) {
  const [focus, setFocus] = useState(false);
  const dirtyRef = useRef(false);
  const [autosaved, setAutosaved] = useState<string>('');

  // autosave
  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = setTimeout(async () => {
      await onSave();
      setAutosaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      dirtyRef.current = false;
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.title, note.content, note.mood, note.category, note.note_date, note.reminder_at, note.is_pinned]);

  const update = (p: Partial<DiaryNote>) => {
    dirtyRef.current = true;
    onChange(p);
  };

  return (
    <motion.div
      key={note.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={focus ? 'fixed inset-0 z-50 bg-background/95 backdrop-blur-xl p-6 overflow-auto' : ''}
    >
      <div className={`glass-diary rounded-3xl notebook-shadow overflow-hidden animate-notebook-open ${focus ? 'max-w-3xl mx-auto' : ''}`}>
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
            ) : autosaved ? (
              <>Saved at {autosaved}</>
            ) : (
              <>Auto-saves as you write</>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => update({ is_pinned: !note.is_pinned })}>
              <Pin className={`h-4 w-4 ${note.is_pinned ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFocus(f => !f)}>
              {focus ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="px-8 pt-6">
          <Input
            value={note.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="Title your entry…"
            className="border-0 bg-transparent text-3xl md:text-4xl font-serif-diary font-medium px-0 h-auto py-2 focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <CategoryChip value={note.category} onChange={(c: DiaryCategory) => update({ category: c })} />
          </div>

          <div className="flex flex-wrap gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={note.note_date}
                onChange={e => update({ note_date: e.target.value })}
                className="h-8 w-auto text-sm"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-muted/40 border border-border/40 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(note.created_at || Date.now()), 'MMM d, h:mm a')}</span>
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-xs text-muted-foreground mb-2 block">How are you feeling?</Label>
            <MoodPicker
              value={note.mood}
              onChange={(m, e) => update({ mood: m, mood_emoji: e })}
            />
          </div>
        </div>

        {/* Writing area */}
        <div className="px-8 py-6">
          <Textarea
            value={note.content}
            onChange={e => update({ content: e.target.value })}
            placeholder="Begin writing… let your thoughts flow onto the page."
            rows={focus ? 24 : 14}
            className="paper-texture rounded-xl border border-border/40 font-body resize-none focus-visible:ring-1 focus-visible:ring-offset-0 leading-7 px-5 py-4 text-[15px]"
            style={{ color: 'hsl(var(--ink))' }}
          />
        </div>

        {/* Reminder */}
        <div className="px-8 pb-4">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
            <Bell className="h-3 w-3" /> Reminder
          </Label>
          <Input
            type="datetime-local"
            value={note.reminder_at ? note.reminder_at.slice(0, 16) : ''}
            onChange={e => update({ reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="h-9 max-w-xs"
          />
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button onClick={onReflect} disabled={reflecting} size="sm" className="gap-2"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--diary-accent)), hsl(var(--diary-glow)))', color: 'white' }}>
            {reflecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Reflect
          </Button>

          <VoiceRecorder onTranscript={(t) => update({ content: (note.content ? note.content + '\n\n' : '') + t })} />

          <Button variant="outline" size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" size="sm" disabled={!note.reminder_at} onClick={() => downloadReminderIcs(note as any)} className="gap-1.5">
            <BellRing className="h-3.5 w-3.5" /> Calendar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadNotePdf(note as any)} className="gap-1.5">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadNoteDocx(note as any)} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Word
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
