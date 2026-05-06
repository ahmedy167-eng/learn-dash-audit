import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DiaryNote } from '@/hooks/useDiary';
import { PaperCard } from './PaperCard';
import { BookOpen } from 'lucide-react';

const PROMPTS = [
  'What surprised you today?',
  'One small win to celebrate…',
  'Who do you want to thank, and why?',
  'What did your students teach you today?',
  'A thought you don\'t want to forget.',
];

export function DiaryTimeline({ notes, selectedId, onSelect }: { notes: DiaryNote[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, DiaryNote[]>();
    notes.forEach(n => {
      const k = n.note_date;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(n);
    });
    return Array.from(map.entries());
  }, [notes]);

  if (notes.length === 0) {
    return (
      <div className="glass-diary rounded-3xl notebook-shadow p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
             style={{ background: 'linear-gradient(135deg, hsl(var(--diary-accent) / 0.2), hsl(var(--diary-glow) / 0.2))' }}>
          <BookOpen className="h-7 w-7" style={{ color: 'hsl(var(--diary-accent))' }} />
        </div>
        <h3 className="font-serif-diary text-2xl mb-2">Your journal awaits</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
          Begin with a single thought. Your diary becomes richer with every entry.
        </p>
        <div className="space-y-2 max-w-sm mx-auto text-left">
          {PROMPTS.slice(0, 3).map(p => (
            <div key={p} className="text-sm px-4 py-2.5 rounded-xl border border-border/50 bg-card/50 italic font-serif-diary">
              {p}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {grouped.map(([date, items]) => (
          <motion.div key={date} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="font-serif-diary italic text-sm text-muted-foreground/90">
                {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">{items.length} {items.length === 1 ? 'entry' : 'entries'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(n => (
                <PaperCard key={n.id} note={n} active={selectedId === n.id} onClick={() => onSelect(n.id)} />
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
