import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CATEGORY_META, DIARY_CATEGORIES, DiaryCategory, computeStreak, moodEmoji } from '@/lib/diary-meta';
import { useAuth } from '@/hooks/useAuth';
import { DiaryNote } from '@/hooks/useDiary';
import { Flame, Plus, Sparkles, BarChart3, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface Props {
  notes: DiaryNote[];
  category: DiaryCategory | 'All';
  onCategory: (c: DiaryCategory | 'All') => void;
  selectedDate: Date | undefined;
  onDate: (d: Date | undefined) => void;
  onNew: () => void;
  onAnalytics: () => void;
  onSearch: () => void;
}

export function DiarySidebar({ notes, category, onCategory, selectedDate, onDate, onNew, onAnalytics, onSearch }: Props) {
  const { user } = useAuth();
  const initials = (user?.email || 'U').slice(0, 2).toUpperCase();
  const streak = useMemo(() => computeStreak([...new Set(notes.map(n => n.note_date))]), [notes]);
  const todayMood = notes.find(n => n.note_date === new Date().toISOString().slice(0, 10) && n.mood)?.mood;
  const noteDates = useMemo(() => new Set(notes.map(n => n.note_date)), [notes]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    notes.forEach(n => { c[n.category] = (c[n.category] || 0) + 1; });
    return c;
  }, [notes]);

  return (
    <aside className="glass-diary rounded-2xl p-5 space-y-5 h-fit sticky top-4">
      {/* Profile */}
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 ring-2 ring-background shadow-lg">
          <AvatarFallback style={{ background: 'linear-gradient(135deg, hsl(var(--diary-accent)), hsl(var(--diary-glow)))', color: 'white' }}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-display-diary font-semibold text-sm truncate">{user?.email?.split('@')[0]}</p>
          <p className="text-xs text-muted-foreground">My Journal</p>
        </div>
      </div>

      {/* Streak + Mood */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 border border-border/50 bg-card/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Flame className="h-3 w-3" /> Streak
          </div>
          <p className="font-serif-diary text-2xl">{streak}<span className="text-xs text-muted-foreground ml-1">days</span></p>
        </div>
        <div className="rounded-xl p-3 border border-border/50 bg-card/50">
          <div className="text-xs text-muted-foreground mb-1">Today</div>
          <p className="text-2xl leading-none">{todayMood ? moodEmoji(todayMood) : '✨'}</p>
        </div>
      </div>

      {/* New entry */}
      <Button
        onClick={onNew}
        className="w-full gap-2 h-11 text-white shadow-lg hover:scale-[1.02] transition-transform"
        style={{ background: 'linear-gradient(135deg, hsl(var(--diary-accent)), hsl(var(--diary-glow)))' }}
      >
        <Plus className="h-4 w-4" /> New Entry
      </Button>

      {/* Mini calendar */}
      <div className="rounded-xl border border-border/50 p-2 bg-card/50">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDate}
          className="p-0"
          modifiers={{ hasNote: (d) => noteDates.has(d.toISOString().slice(0, 10)) }}
          modifiersStyles={{
            hasNote: { fontWeight: 600, position: 'relative' },
          }}
          modifiersClassNames={{
            hasNote: 'after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary',
          }}
        />
      </div>

      {/* Categories */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2">Categories</p>
        <button
          onClick={() => onCategory('All')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all',
            category === 'All' ? 'bg-foreground/5 font-medium' : 'hover:bg-muted/50 text-muted-foreground'
          )}
        >
          <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> All</span>
          <span className="text-xs">{notes.length}</span>
        </button>
        {DIARY_CATEGORIES.map(c => {
          const m = CATEGORY_META[c];
          const I = m.icon;
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => onCategory(c)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all hover:translate-x-0.5',
                active && 'font-medium'
              )}
              style={active ? {
                background: `${m.color}18`,
                color: m.color,
                boxShadow: `inset 3px 0 0 ${m.color}`,
              } : undefined}
            >
              <span className="flex items-center gap-2">
                <I className="h-3.5 w-3.5" /> {c}
              </span>
              <span className="text-xs opacity-70">{counts[c] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Tools */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onSearch} className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
        <Button variant="ghost" size="sm" onClick={onAnalytics} className="gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Insights
        </Button>
      </div>
    </aside>
  );
}
