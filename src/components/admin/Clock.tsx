import { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';
import { format } from 'date-fns';

export function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format: "February 11, 2026 • 3:45:30 PM"
  const formattedDate = format(currentTime, 'MMMM d, yyyy');
  const formattedTime = format(currentTime, 'h:mm:ss a');

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <ClockIcon className="h-4 w-4" />
      <span>
        {formattedDate} • {formattedTime}
      </span>
    </div>
  );
}
