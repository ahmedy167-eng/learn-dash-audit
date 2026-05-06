import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DiaryNote } from '@/hooks/useDiary';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { CATEGORY_META, DIARY_CATEGORIES, MOODS } from '@/lib/diary-meta';

export function DiaryAnalytics({ open, onOpenChange, notes }: { open: boolean; onOpenChange: (o: boolean) => void; notes: DiaryNote[] }) {
  const moodTrend = useMemo(() => {
    const last14: { date: string; entries: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      last14.push({ date: k.slice(5), entries: notes.filter(n => n.note_date === k).length });
    }
    return last14;
  }, [notes]);

  const categoryData = useMemo(() => {
    return DIARY_CATEGORIES.map(c => ({ name: c, value: notes.filter(n => n.category === c).length, color: CATEGORY_META[c].color }))
      .filter(d => d.value > 0);
  }, [notes]);

  const moodData = useMemo(() => {
    return MOODS.map(m => ({ name: m.label, value: notes.filter(n => n.mood === m.key).length, color: `hsl(var(${m.token}))` }))
      .filter(d => d.value > 0);
  }, [notes]);

  const weekdayData = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const counts = new Array(7).fill(0);
    notes.forEach(n => { counts[new Date(n.note_date).getDay()]++; });
    return days.map((d, i) => ({ day: d, count: counts[i] }));
  }, [notes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-diary text-2xl">Journal Insights</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="glass-diary rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">Entries — last 14 days</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <LineChart data={moodTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="entries" stroke="hsl(var(--diary-accent))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-diary rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">Categories</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" outerRadius={70} label={{ fontSize: 11 }}>
                    {categoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-diary rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">Mood distribution</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={moodData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {moodData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-diary rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">Most productive weekday</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--diary-glow))" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
