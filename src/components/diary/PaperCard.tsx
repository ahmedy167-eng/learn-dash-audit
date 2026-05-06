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
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClick}
      className={cn(
        'group relative w-full text-left rounded-2xl p-4 border transition-all',
        'glass-diary notebook-shadow',
        active ? 'ring-2' : 'hover:shadow-xl'
      )}
      style={{
        borderColor: active ? accent : 'hsl(var(--border) / 0.6)',
        ['--tw-ring-color' as any]: accent,
      }}
    >
      {/* Accent stripe */}
      <span
        className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
        style={{ background: accent }}
      />

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1 pl-2">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif-diary text-lg leading-tight truncate">{note.title}</h3>
            {note.is_pinned && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {note.note_date}{note.note_time ? ` · ${note.note_time.slice(0,5)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {note.reminder_at && <BellRing className="h-3.5 w-3.5" style={{ color: accent }} />}
          {note.mood && <span className="text-lg leading-none">{note.mood_emoji || moodEmoji(note.mood)}</span>}
        </div>
      </div>

      {preview && (
        <p className="text-sm text-muted-foreground/90 line-clamp-2 mb-3 pl-2">{preview}</p>
      )}

      <div className="flex items-center justify-between gap-2 pl-2">
        <CategoryChip value={note.category} />
        {note.ai_tags && note.ai_tags.length > 0 && (
          <div className="flex gap-1 flex-wrap justify-end">
            {note.ai_tags.slice(0, 2).map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}
