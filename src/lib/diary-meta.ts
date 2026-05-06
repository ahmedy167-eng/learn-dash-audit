import { Heart, GraduationCap, Users, Lightbulb, CheckSquare, FlaskConical, type LucideIcon } from 'lucide-react';

export const DIARY_CATEGORIES = [
  'Personal', 'Teaching', 'Meetings', 'Ideas', 'Tasks', 'Research',
] as const;
export type DiaryCategory = typeof DIARY_CATEGORIES[number];

export const CATEGORY_META: Record<DiaryCategory, { icon: LucideIcon; color: string }> = {
  Personal: { icon: Heart, color: 'hsl(var(--mood-happy))' },
  Teaching: { icon: GraduationCap, color: 'hsl(var(--diary-accent))' },
  Meetings: { icon: Users, color: 'hsl(var(--mood-calm))' },
  Ideas: { icon: Lightbulb, color: 'hsl(var(--mood-productive))' },
  Tasks: { icon: CheckSquare, color: 'hsl(var(--mood-stressed))' },
  Research: { icon: FlaskConical, color: 'hsl(var(--mood-tired))' },
};

export const MOODS = [
  { key: 'happy', emoji: '😊', label: 'Happy', token: '--mood-happy' },
  { key: 'calm', emoji: '🌿', label: 'Calm', token: '--mood-calm' },
  { key: 'productive', emoji: '⚡', label: 'Productive', token: '--mood-productive' },
  { key: 'stressed', emoji: '🌧', label: 'Stressed', token: '--mood-stressed' },
  { key: 'tired', emoji: '🌙', label: 'Tired', token: '--mood-tired' },
  { key: 'neutral', emoji: '🤍', label: 'Neutral', token: '--mood-neutral' },
] as const;

export type MoodKey = typeof MOODS[number]['key'];

export const moodColor = (mood?: string | null) => {
  const m = MOODS.find(x => x.key === mood);
  return m ? `hsl(var(${m.token}))` : 'hsl(var(--muted-foreground))';
};

export const moodEmoji = (mood?: string | null) =>
  MOODS.find(x => x.key === mood)?.emoji ?? '✨';

export const QUOTES = [
  'The only journey is the one within. — Rilke',
  'How we spend our days is, of course, how we spend our lives. — Annie Dillard',
  'Write hard and clear about what hurts. — Hemingway',
  'Almost everything will work again if you unplug it for a few minutes — including you. — Anne Lamott',
  'You are the books you read, the films you watch, the music you listen to.',
  'A page a day keeps the noise away.',
  'Reflection is the lamp of the heart. — Al-Hasan',
];

export const dailyQuote = () => {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
};

export const computeStreak = (dates: string[]): number => {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
    if (streak > 365) break;
  }
  return streak;
};
