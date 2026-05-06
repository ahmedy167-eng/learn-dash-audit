import { motion } from 'framer-motion';
import { Sparkles, Loader2, Quote, History, Link2, TrendingUp, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dailyQuote, moodColor, moodEmoji } from '@/lib/diary-meta';
import { DiaryNote } from '@/hooks/useDiary';

interface Props {
  note: DiaryNote | null;
  notes: DiaryNote[];
  onReflect: () => void;
  reflecting: boolean;
}

export function AIAssistantPanel({ note, notes, onReflect, reflecting }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const todayNotes = notes.filter(n => n.note_date === today);
  const todayMood = todayNotes.find(n => n.mood)?.mood;

  // On this day (same MM-DD, prior years/weeks)
  const md = today.slice(5);
  const onThisDay = notes.filter(n => n.note_date.slice(5) === md && n.note_date !== today).slice(0, 3);

  // Linked = same category, exclude self, recent
  const linked = note
    ? notes.filter(n => n.id !== note.id && n.category === note.category).slice(0, 3)
    : [];

  return (
    <div className="space-y-4 fade-in-up stagger-d-2">
      {/* Daily Reflection */}
      <Card className="glass-diary p-5 glow-soft border-0 relative overflow-hidden">
        <span aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-30 blur-2xl" style={{ background: 'hsl(var(--diary-glow))' }} />
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, hsl(var(--diary-accent)), hsl(var(--diary-glow)))' }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-display-diary font-semibold">AI Reflection</h3>
        </div>

        {!note ? (
          <p className="text-sm text-muted-foreground">Open an entry to receive a thoughtful reflection.</p>
        ) : note.ai_summary ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-sm leading-relaxed">{note.ai_summary}</p>
            {note.mood && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">{note.mood_emoji}</span>
                <span className="font-medium capitalize" style={{ color: moodColor(note.mood) }}>{note.mood}</span>
              </div>
            )}
            {note.ai_tags && note.ai_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {note.ai_tags.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">#{t}</span>
                ))}
              </div>
            )}
            {Array.isArray(note.ai_action_items) && note.ai_action_items.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Action items</p>
                <ul className="space-y-1.5">
                  {note.ai_action_items.map((a: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-primary">›</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button onClick={onReflect} variant="outline" size="sm" disabled={reflecting} className="w-full mt-2">
              {reflecting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
              Re-reflect
            </Button>
          </motion.div>
        ) : (
          <Button onClick={onReflect} disabled={reflecting} className="w-full gap-2"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--diary-accent)), hsl(var(--diary-glow)))' }}>
            {reflecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            Reflect with AI
          </Button>
        )}
      </Card>

      {/* Today insights */}
      <Card className="glass-diary p-5 border-0">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4" />
          <h3 className="font-display-diary font-semibold">Today</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-serif-diary">{todayNotes.length}</p>
            <p className="text-xs text-muted-foreground">entries</p>
          </div>
          <div>
            <p className="text-2xl">{todayMood ? moodEmoji(todayMood) : '–'}</p>
            <p className="text-xs text-muted-foreground capitalize">{todayMood || 'no mood yet'}</p>
          </div>
        </div>
      </Card>

      {/* On this day */}
      {onThisDay.length > 0 && (
        <Card className="glass-diary p-5 border-0">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4" />
            <h3 className="font-display-diary font-semibold">On this day</h3>
          </div>
          <div className="space-y-2">
            {onThisDay.map(n => (
              <div key={n.id} className="text-sm p-2 rounded-lg hover:bg-muted/50 transition cursor-default">
                <p className="font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.note_date}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Linked memories */}
      {linked.length > 0 && (
        <Card className="glass-diary p-5 border-0">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4" />
            <h3 className="font-display-diary font-semibold">Linked memories</h3>
          </div>
          <div className="space-y-2">
            {linked.map(n => (
              <div key={n.id} className="text-sm p-2 rounded-lg hover:bg-muted/50 transition">
                <p className="font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.note_date} · {n.category}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Daily quote */}
      <Card className="glass-diary p-5 border-0 relative overflow-hidden">
        <Quote className="absolute -top-2 -right-2 h-20 w-20 opacity-5" />
        <p className="font-serif-diary italic text-sm leading-relaxed text-muted-foreground">
          "{dailyQuote()}"
        </p>
      </Card>
    </div>
  );
}
