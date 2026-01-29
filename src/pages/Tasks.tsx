import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckSquare, Plus, Loader2, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isToday, isPast, isThisWeek } from 'date-fns';
import { cn } from '@/lib/utils';

const PRIORITIES = ['high', 'medium', 'low'];
const CATEGORIES = ['class', 'administrative', 'personal'];

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  category: string;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('personal');
  const [dueDate, setDueDate] = useState<Date>();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast.error('Please enter a task title');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('tasks')
        .insert([{
          user_id: user?.id,
          title,
          description: description || null,
          priority,
          category,
          due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        }]);

      if (error) throw error;

      toast.success('Task created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleComplete = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_completed: !task.is_completed,
          completed_at: !task.is_completed ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('personal');
    setDueDate(undefined);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const allTasks = tasks.filter(t => !t.is_completed);
  const todayTasks = allTasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));
  const weekTasks = allTasks.filter(t => t.due_date && isThisWeek(parseISO(t.due_date)));
  const overdueTasks = allTasks.filter(t => 
    t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  );
  const completedTasks = tasks.filter(t => t.is_completed);

  const TaskItem = ({ task }: { task: Task }) => (
    <div className={cn(
      "flex items-center justify-between p-4 bg-accent/50 rounded-lg group",
      task.is_completed && "opacity-60"
    )}>
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={() => toggleComplete(task)}
          className="h-5 w-5 rounded border-border cursor-pointer"
        />
        <div className="flex-1">
          <p className={cn(
            "font-medium",
            task.is_completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {task.due_date && (
              <span className={cn(
                "text-xs",
                isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) && !task.is_completed
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}>
                {format(parseISO(task.due_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{task.category}</Badge>
        <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteTask(task.id)}
          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground">Manage your tasks and to-dos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Add a description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Task
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overdue Warning */}
        {overdueTasks.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-destructive">
                ⚠️ Overdue Tasks ({overdueTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tasks Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Your Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({allTasks.length})</TabsTrigger>
                  <TabsTrigger value="today">Today ({todayTasks.length})</TabsTrigger>
                  <TabsTrigger value="week">This Week ({weekTasks.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-3">
                  {allTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">No tasks</h3>
                      <p className="text-muted-foreground">Create a new task to get started</p>
                    </div>
                  ) : (
                    allTasks.map((task) => <TaskItem key={task.id} task={task} />)
                  )}
                </TabsContent>

                <TabsContent value="today" className="space-y-3">
                  {todayTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No tasks due today</p>
                  ) : (
                    todayTasks.map((task) => <TaskItem key={task.id} task={task} />)
                  )}
                </TabsContent>

                <TabsContent value="week" className="space-y-3">
                  {weekTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No tasks due this week</p>
                  ) : (
                    weekTasks.map((task) => <TaskItem key={task.id} task={task} />)
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-3">
                  {completedTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No completed tasks</p>
                  ) : (
                    completedTasks.map((task) => <TaskItem key={task.id} task={task} />)
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
