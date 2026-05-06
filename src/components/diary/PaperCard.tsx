import { motion } from 'framer-motion';
import { DiaryNote } from '@/hooks/useDiary';
import { CategoryChip } from './CategoryChip';
import { CATEGORY_META, DiaryCategory, moodColor, moodEmoji } from '@/lib/diary-meta';
import { BellRing, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PaperCard({ note, active, onClick }: { note: DiaryNote; active?: boolean; onClick: () => void }) {
  const meta = CATEGORY_META[(note.category as DiaryCategory)] ?? CATEGORY_META.Personal;
  const accent = note.mood ? moodColor(note.mood) : meta.color;
  const preview = (note.content || '').replace(/\s+/g, ' ').trim().slice(0, 140);

  return (
    <motion.button
      layout
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={onClick}
      className={cn(
        'group relative w-full text-left rounded-2xl p-5 transition-shadow duration-300',
        'glass-diary notebook-shadow gradient-ring overflow-hidden',
        active && 'shadow-2xl'
      )}
      style={{
        ['--ring-from' as any]: accent,
        ['--ring-to' as any]: meta.color,
      }}
    >
      {/* Soft category glow in corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-60"
        style={{ background: accent }}
      />
      {/* Accent stripe */}
      <span
        className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full transition-all group-hover:w-1.5"
        style={{ background: `linear-gradient(180deg, ${accent}, ${meta.color})` }}
      />

      <div className="relative flex items-start justify-between gap-3 mb-2.5 pl-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif-diary text-xl leading-tight tracking-tight truncate text-foreground">
              {note.title}
            </h3>
            {note.is_pinned && <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          </div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
            {note.note_date}{note.note_time ? ` · ${note.note_time.slice(0,5)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {note.reminder_at && <BellRing className="h-3.5 w-3.5" style={{ color: accent }} />}
          {note.mood && <span className="text-xl leading-none">{note.mood_emoji || moodEmoji(note.mood)}</span>}
        </div>
      </div>

      {preview && (
        <p className="relative text-sm leading-relaxed text-muted-foreground/85 line-clamp-2 mb-4 pl-3">
          {preview}
        </p>
      )}

      <div className="relative flex items-center justify-between gap-2 pl-3">
        <CategoryChip value={note.category} />
        {note.ai_tags && note.ai_tags.length > 0 && (
          <div className="flex gap-1 flex-wrap justify-end">
            {note.ai_tags.slice(0, 2).map(t => (
              <span
                key={t}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background/40 text-muted-foreground backdrop-blur-sm"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}
