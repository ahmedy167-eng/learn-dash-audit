import { MOODS, MoodKey } from '@/lib/diary-meta';
import { cn } from '@/lib/utils';

export function MoodPicker({
  value, onChange, size = 'md',
}: { value?: string | null; onChange: (m: MoodKey, emoji: string) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {MOODS.map(m => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key, m.emoji)}
            className={cn(
              'group relative flex items-center gap-1.5 rounded-full border transition-all',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'border-transparent text-foreground scale-105'
                : 'border-border/60 hover:border-foreground/30 hover:scale-105'
            )}
            style={active ? {
              background: `hsl(var(${m.token}) / 0.18)`,
              boxShadow: `0 0 0 1px hsl(var(${m.token}) / 0.4), 0 8px 24px -8px hsl(var(${m.token}) / 0.5)`,
            } : undefined}
          >
            <span className="text-base leading-none">{m.emoji}</span>
            <span className="font-medium">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
