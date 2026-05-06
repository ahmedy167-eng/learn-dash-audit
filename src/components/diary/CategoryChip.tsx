import { CATEGORY_META, DiaryCategory, DIARY_CATEGORIES } from '@/lib/diary-meta';
import { cn } from '@/lib/utils';

export function CategoryChip({ value, onChange, compact }: { value: string; onChange?: (c: DiaryCategory) => void; compact?: boolean }) {
  const meta = CATEGORY_META[(value as DiaryCategory)] ?? CATEGORY_META.Personal;
  const Icon = meta.icon;

  if (!onChange) {
    return (
      <span
        className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border')}
        style={{ borderColor: `${meta.color}55`, background: `${meta.color}15`, color: meta.color }}
      >
        <Icon className="h-3 w-3" /> {value}
      </span>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
      {DIARY_CATEGORIES.map(c => {
        const m = CATEGORY_META[c];
        const I = m.icon;
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all hover:scale-105',
              active && 'shadow-md'
            )}
            style={{
              borderColor: active ? m.color : 'hsl(var(--border))',
              background: active ? `${m.color}20` : 'transparent',
              color: active ? m.color : 'hsl(var(--muted-foreground))',
            }}
          >
            <I className="h-3 w-3" /> {c}
          </button>
        );
      })}
    </div>
  );
}
