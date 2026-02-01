import { ReactNode, useState } from 'react';
import { Navigate, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ClipboardList, 
  BookOpen, 
  FolderOpen,
  LogOut,
  GraduationCap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface StudentLayoutProps {
  children: ReactNode;
}

const navItems = [
  { title: 'Dashboard', url: '/student-portal', icon: LayoutDashboard },
  { title: 'Quizzes', url: '/student-portal/quizzes', icon: ClipboardList },
  { title: 'LMS Updates', url: '/student-portal/lms', icon: BookOpen },
  { title: 'CA Projects', url: '/student-portal/ca-projects', icon: FolderOpen },
];

export function StudentLayout({ children }: StudentLayoutProps) {
  const { student, loading, signOut } = useStudentAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return <Navigate to="/student-login" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && <span className="font-semibold text-foreground">Student Portal</span>}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-8 w-8", collapsed && "hidden")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-2 h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Student Info */}
        {!collapsed && (
          <div className="p-4 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
            <p className="text-xs text-muted-foreground">ID: {student.student_id}</p>
            {student.section_number && (
              <p className="text-xs text-muted-foreground">Section: {student.section_number}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url || 
              (item.url !== '/student-portal' && location.pathname.startsWith(item.url));
            
            return (
              <RouterNavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  collapsed && "justify-center px-2",
                  isActive && "bg-accent text-accent-foreground font-medium"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </RouterNavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              "w-full flex items-center gap-3 text-muted-foreground hover:text-destructive",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
