import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeekCalendarProps {
  teachingDays?: string[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function WeekCalendar({ teachingDays = [], selectedDate, onDateSelect }: WeekCalendarProps) {
  const today = new Date();
  const weekStart = startOfWeek(selectedDate || today, { weekStartsOn: 0 });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isTeachingDay = (date: Date) => {
    const dayName = FULL_DAY_NAMES[date.getDay()];
    return teachingDays.some(d => d.toLowerCase() === dayName.toLowerCase());
  };

  const goToPreviousWeek = () => {
    if (onDateSelect) {
      onDateSelect(addDays(weekStart, -7));
    }
  };

  const goToNextWeek = () => {
    if (onDateSelect) {
      onDateSelect(addDays(weekStart, 7));
    }
  };

  const goToToday = () => {
    if (onDateSelect) {
      onDateSelect(today);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Week of {format(weekStart, 'MMM d, yyyy')}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isToday = isSameDay(day, today);
            const isTeaching = isTeachingDay(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={index}
                onClick={() => onDateSelect?.(day)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-colors",
                  isToday && "ring-2 ring-primary",
                  isSelected && "bg-primary text-primary-foreground",
                  !isSelected && isTeaching && "bg-green-500/10",
                  !isSelected && !isTeaching && "hover:bg-muted"
                )}
              >
                <span className="text-xs text-muted-foreground mb-1">{DAY_NAMES[index]}</span>
                <span className={cn(
                  "text-lg font-semibold",
                  isSelected && "text-primary-foreground",
                  !isSelected && isToday && "text-primary"
                )}>
                  {format(day, 'd')}
                </span>
                {isTeaching && (
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1",
                    isSelected ? "bg-primary-foreground" : "bg-green-500"
                  )} />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Teaching Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full ring-2 ring-primary" />
            <span>Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
