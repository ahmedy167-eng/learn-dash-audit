import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarOff, Plus, Loader2, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface OffDay {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

export default function OffDaysPage() {
  const { user } = useAuth();
  const [offDays, setOffDays] = useState<OffDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchOffDays();
  }, []);

  const fetchOffDays = async () => {
    try {
      const { data, error } = await supabase
        .from('off_days')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setOffDays(data || []);
    } catch (error) {
      console.error('Error fetching off days:', error);
      toast.error('Failed to load off days');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (endDate < startDate) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('off_days')
        .insert([{
          user_id: user?.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          reason: reason || null,
          status: 'pending',
        }]);

      if (error) throw error;

      toast.success('Off day request submitted');
      setIsDialogOpen(false);
      resetForm();
      fetchOffDays();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteOffDay = async (id: string) => {
    try {
      const { error } = await supabase
        .from('off_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Off day request deleted');
      fetchOffDays();
    } catch (error) {
      console.error('Error deleting off day:', error);
      toast.error('Failed to delete off day');
    }
  };

  const resetForm = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setReason('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const pendingRequests = offDays.filter(o => o.status === 'pending');
  const approvedRequests = offDays.filter(o => o.status === 'approved');
  const rejectedRequests = offDays.filter(o => o.status === 'rejected');

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Off Days</h1>
            <p className="text-muted-foreground">Request and manage your leave days</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Request Off Day
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Off Day</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {startDate && endDate && (
                  <div className="p-3 bg-accent rounded-lg text-center">
                    <span className="text-sm text-muted-foreground">Duration: </span>
                    <span className="font-medium">
                      {differenceInDays(endDate, startDate) + 1} day(s)
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter reason for leave (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold">{pendingRequests.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500">
                  <CalendarOff className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-3xl font-bold">{approvedRequests.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500">
                  <CalendarOff className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-3xl font-bold">{rejectedRequests.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500">
                  <CalendarOff className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Off Days List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              All Requests ({offDays.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : offDays.length === 0 ? (
              <div className="text-center py-12">
                <CalendarOff className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No off day requests</h3>
                <p className="text-muted-foreground">Submit a request to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offDays.map((offDay) => (
                  <div 
                    key={offDay.id} 
                    className="flex items-center justify-between p-4 bg-accent/50 rounded-lg group"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium">
                          {format(parseISO(offDay.start_date), 'MMM d, yyyy')}
                          {offDay.start_date !== offDay.end_date && (
                            <> — {format(parseISO(offDay.end_date), 'MMM d, yyyy')}</>
                          )}
                        </p>
                        <Badge variant={getStatusColor(offDay.status)} className="capitalize">
                          {offDay.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>
                          {differenceInDays(parseISO(offDay.end_date), parseISO(offDay.start_date)) + 1} day(s)
                        </span>
                        {offDay.reason && <span>• {offDay.reason}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteOffDay(offDay.id)}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
