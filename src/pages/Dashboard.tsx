import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, CheckSquare, Clock, Plus, AlertTriangle } from 'lucide-react';
import { TeacherMessagesDropdown } from '@/components/layout/TeacherMessagesDropdown';
import { format, isToday, isPast, isThisWeek, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  category: string;
  due_date: string | null;
  is_completed: boolean;
}

interface DashboardStats {
  totalStudents: number;
  activeClasses: number;
  pendingTasks: number;
  todayTasks: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeClasses: 0,
    pendingTasks: 0,
    todayTasks: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchTeacherProfile();
    }
  }, [user]);

  const fetchTeacherProfile = async () => {
    if (!user) return;
    
    // Try user_metadata first (set during signup)
    const metaName = user.user_metadata?.full_name;
    if (metaName) {
      setTeacherName(metaName);
      return;
    }
    
    // Fallback to profiles table
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      
      if (data?.full_name) {
        setTeacherName(data.full_name);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Fetch students count - only for current user's students
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch schedules count (active classes) - only for current user
      const { count: schedulesCount } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch tasks - only for current user
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('due_date', { ascending: true });

      const allTasks = tasksData || [];
      const pendingCount = allTasks.length;
      const todayCount = allTasks.filter(t => 
        t.due_date && isToday(parseISO(t.due_date))
      ).length;

      setStats({
        totalStudents: studentsCount || 0,
        activeClasses: schedulesCount || 0,
        pendingTasks: pendingCount,
        todayTasks: todayCount,
      });

      // Fetch tasks for display - only for current user
      const { data: allTasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true })
        .limit(20);

      setTasks(allTasksData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    await supabase
      .from('tasks')
      .update({ 
        is_completed: !isCompleted,
        completed_at: !isCompleted ? new Date().toISOString() : null
      })
      .eq('id', taskId);
    
    fetchDashboardData();
  };

  const overdueTasks = tasks.filter(t => 
    t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && !t.is_completed
  );

  const todayTasks = tasks.filter(t => 
    t.due_date && isToday(parseISO(t.due_date)) && !t.is_completed
  );

  const weekTasks = tasks.filter(t => 
    t.due_date && isThisWeek(parseISO(t.due_date)) && !t.is_completed
  );

  const completedTasks = tasks.filter(t => t.is_completed);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const statsCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-orange-500' },
    { title: 'Active Classes', value: stats.activeClasses, icon: BookOpen, color: 'bg-teal-500' },
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: CheckSquare, color: 'bg-green-500' },
    { title: "Today's Tasks", value: stats.todayTasks, icon: Clock, color: 'bg-purple-500' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back{teacherName ? `, ${teacherName}` : ''}! Here's your overview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TeacherMessagesDropdown />
            <Link to="/tasks">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title} className="min-h-[120px]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Overdue Tasks ({overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={task.is_completed}
                          onChange={() => toggleTaskComplete(task.id, task.is_completed)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {task.due_date && format(parseISO(task.due_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tasks Section */}
          <Card className={overdueTasks.length === 0 ? 'lg:col-span-2' : ''}>
            <CardHeader className="pb-3">
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="today">
                <TabsList className="mb-4">
                  <TabsTrigger value="today">Today ({todayTasks.length})</TabsTrigger>
                  <TabsTrigger value="week">This Week ({weekTasks.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="today" className="space-y-3">
                  {todayTasks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No tasks for today</p>
                  ) : (
                    todayTasks.map((task) => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={toggleTaskComplete}
                        getPriorityColor={getPriorityColor}
                      />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="week" className="space-y-3">
                  {weekTasks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No tasks this week</p>
                  ) : (
                    weekTasks.map((task) => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={toggleTaskComplete}
                        getPriorityColor={getPriorityColor}
                      />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="completed" className="space-y-3">
                  {completedTasks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No completed tasks</p>
                  ) : (
                    completedTasks.slice(0, 5).map((task) => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={toggleTaskComplete}
                        getPriorityColor={getPriorityColor}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function TaskItem({ 
  task, 
  onToggle, 
  getPriorityColor 
}: { 
  task: Task; 
  onToggle: (id: string, isCompleted: boolean) => void;
  getPriorityColor: (priority: string) => "default" | "destructive" | "secondary" | "outline";
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={() => onToggle(task.id, task.is_completed)}
          className="h-4 w-4 rounded border-border"
        />
        <div>
          <p className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </p>
          {task.due_date && (
            <p className="text-sm text-muted-foreground">
              {format(parseISO(task.due_date), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{task.category}</Badge>
        <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
      </div>
    </div>
  );
}
