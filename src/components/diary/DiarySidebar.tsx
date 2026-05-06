import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CATEGORY_META, DIARY_CATEGORIES, DiaryCategory, computeStreak, moodColor, moodEmoji } from '@/lib/diary-meta';
import { useAuth } from '@/hooks/useAuth';
import { DiaryNote } from '@/hooks/useDiary';
import { Flame, Plus, Sparkles, BarChart3, Search, Calendar as CalendarIcon, ChevronDown, Wand2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

interface Props {
  notes: DiaryNote[];
  category: DiaryCategory | 'All';
  onCategory: (c: DiaryCategory | 'All') => void;
  selectedDate: Date | undefined;
  onDate: (d: Date | undefined) => void;
  onNew: () => void;
  onAnalytics: () => void;
  onSearch: () => void;
  onAutoCategorize?: () => void;
  categorizing?: boolean;
}

export function DiarySidebar({ notes, category, onCategory, selectedDate, onDate, onNew, onAnalytics, onSearch, onAutoCategorize, categorizing }: Props) {
  const { user } = useAuth();
  const initials = (user?.email || 'U').slice(0, 2).toUpperCase();
  const streak = useMemo(() => computeStreak([...new Set(notes.map(n => n.note_date))]), [notes]);
  const today = new Date().toISOString().slice(0, 10);
  const todayMood = notes.find(n => n.note_date === today && n.mood)?.mood;

  // Per-date metadata for calendar dots
  const dateMeta = useMemo(() => {
    const map = new Map<string, { count: number; colors: string[] }>();
    notes.forEach(n => {
      const cur = map.get(n.note_date) ?? { count: 0, colors: [] };
      cur.count += 1;
      const c = n.mood ? moodColor(n.mood) : (CATEGORY_META[n.category as DiaryCategory]?.color ?? 'hsl(var(--diary-accent))');
      if (!cur.colors.includes(c) && cur.colors.length < 3) cur.colors.push(c);
      map.set(n.note_date, cur);
    });
    return map;
  }, [notes]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    notes.forEach(n => { c[n.category] = (c[n.category] || 0) + 1; });
    return c;
  }, [notes]);

  return (
    <aside className="glass-diary rounded-2xl p-5 space-y-5 h-fit sticky top-4 fade-in-up">
      {/* Profile */}
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 ring-2 ring-background shadow-lg">
          <AvatarFallback style={{ background: 'linear-gradient(135deg, hsl(var(--diary-accent)), hsl(var(--diary-glow)))', color: 'white' }}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-display-diary font-semibold text-sm truncate">{user?.email?.split('@')[0]}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">My Journal</p>
        </div>
      </div>

      {/* Streak + Mood */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className="relative overflow-hidden rounded-xl p-3 border border-border/50"
          style={{ background: 'linear-gradient(135deg, hsl(var(--diary-glow) / 0.18), hsl(var(--diary-accent) / 0.10))' }}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
            <Flame className="h-3 w-3 text-orange-500 animate-pulse" /> Streak
          </div>
          <p className="font-serif-diary text-2xl tracking-tight">
            {streak}<span className="text-xs text-muted-foreground ml-1">days</span>
          </p>
        </div>
        <div
          className="relative overflow-hidden rounded-xl p-3 border border-border/50"
          style={{ background: 'linear-gradient(135deg, hsl(var(--mood-calm) / 0.18), hsl(var(--mood-happy) / 0.10))' }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Today</div>
          <p className="text-2xl leading-none">{todayMood ? moodEmoji(todayMood) : '✨'}</p>
        </div>
      </div>

      {/* New entry */}
      <Button onClick={onNew} className="btn-premium w-full gap-2 h-11 rounded-xl border-0">
        <Plus className="h-4 w-4" /> New Entry
      </Button>

      {/* Calendar popover trigger */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 px-4 h-12 rounded-xl border border-border/50 bg-card/60 hover:bg-card transition-colors text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-display-diary text-sm truncate">
                {format(selectedDate ?? new Date(), 'MMMM yyyy')}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0 pointer-events-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDate}
            initialFocus
            className="p-3 pointer-events-auto"
            components={{
              DayContent: ({ date }) => {
                const key = date.toISOString().slice(0, 10);
                const meta = dateMeta.get(key);
                const isToday = key === today;
                return (
                  <div
                    className="relative flex flex-col items-center justify-center w-full h-full"
                    title={meta ? `${meta.count} ${meta.count === 1 ? 'entry' : 'entries'}` : undefined}
                  >
                    <span className={cn('text-[13px]', isToday && 'font-semibold')}>{date.getDate()}</span>
                    {meta && (
                      <span className="absolute -bottom-0.5 flex gap-0.5">
                        {meta.colors.map((c, i) => (
                          <span key={i} className="h-1 w-1 rounded-full" style={{ background: c }} />
                        ))}
                      </span>
                    )}
                  </div>
                );
              },
            }}
          />
        </PopoverContent>
      </Popover>


      {/* Categories */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground px-2 mb-2">Categories</p>
        <button
          onClick={() => onCategory('All')}
          className={cn(
            'sidebar-item w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm',
            category === 'All' ? 'bg-foreground/[0.06] font-medium' : 'hover:bg-muted/50 text-muted-foreground'
          )}
        >
          <span className="flex items-center gap-2.5"><Sparkles className="icon h-3.5 w-3.5" /> All</span>
          <span className="text-xs opacity-70">{notes.length}</span>
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
                'sidebar-item w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm',
                !active && 'hover:bg-muted/50 text-muted-foreground',
                active && 'font-medium text-foreground'
              )}
              style={active ? {
                background: `linear-gradient(90deg, ${m.color}26, ${m.color}05 70%, transparent)`,
                boxShadow: `inset 3px 0 0 ${m.color}, 0 0 18px -8px ${m.color}`,
              } : undefined}
            >
              <span className="flex items-center gap-2.5">
                <I className="icon h-3.5 w-3.5" style={{ color: active ? m.color : undefined }} /> {c}
              </span>
              <span className="text-xs opacity-70">{counts[c] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Tools */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onSearch} className="sidebar-item gap-1.5 hover:bg-muted/60 active:scale-[0.98]">
          <Search className="icon h-3.5 w-3.5" /> Search
        </Button>
        <Button variant="ghost" size="sm" onClick={onAnalytics} className="sidebar-item gap-1.5 hover:bg-muted/60 active:scale-[0.98]">
          <BarChart3 className="icon h-3.5 w-3.5" /> Insights
        </Button>
      </div>
    </aside>
  );
}
