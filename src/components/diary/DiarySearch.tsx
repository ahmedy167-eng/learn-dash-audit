import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DiaryNote } from '@/hooks/useDiary';
import { PaperCard } from './PaperCard';
import { toast } from 'sonner';

export function DiarySearch({
  open, onOpenChange, notes, onPick,
}: { open: boolean; onOpenChange: (o: boolean) => void; notes: DiaryNote[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiaryNote[]>([]);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('diary-ai', { body: { action: 'search', query: q } });
      if (error) throw error;
      const f = (data as any)?.filters || {};
      const filtered = notes.filter(n => {
        if (f.mood && n.mood !== f.mood) return false;
        if (f.category && n.category !== f.category) return false;
        if (f.date_from && n.note_date < f.date_from) return false;
        if (f.date_to && n.note_date > f.date_to) return false;
        if (Array.isArray(f.keywords) && f.keywords.length) {
          const hay = `${n.title} ${n.content} ${(n.ai_tags || []).join(' ')}`.toLowerCase();
          if (!f.keywords.some((k: string) => hay.includes(k.toLowerCase()))) return false;
        }
        return true;
      });
      setResults(filtered);
      if (!filtered.length) toast.info('No matches');
    } catch (e: any) {
      toast.error(e?.message || 'Search failed');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif-diary text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Smart Search
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder='try "stressful teaching notes from last week"'
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            autoFocus
          />
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-auto pt-2">
          {results.map(n => (
            <PaperCard key={n.id} note={n} onClick={() => { onPick(n.id); onOpenChange(false); }} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
