import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock as ClockIcon } from 'lucide-react';
import { format } from 'date-fns';

export function Clock() {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    // Set initial time
    const updateTime = () => {
      const now = new Date();
      setTime(format(now, 'HH:mm:ss'));
      setDate(format(now, 'EEEE, MMMM d, yyyy'));
    };

    updateTime();

    // Update time every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="min-h-[120px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Time</CardTitle>
        <ClockIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold font-mono text-primary">
          {time || '--:--:--'}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{date}</p>
      </CardContent>
    </Card>
  );
}
