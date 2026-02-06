import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, FeatureKey } from '@/hooks/usePermissions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen,
  ClipboardList as RegisterIcon,
  Calendar, 
  BookOpen, 
  CheckSquare, 
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HelpCircle,
  GraduationCap,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: FeatureKey;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Students', url: '/students', icon: Users, permission: 'students' },
  { title: 'Sections', url: '/sections', icon: FolderOpen, permission: 'sections' },
  { title: 'Register', url: '/register', icon: RegisterIcon, permission: 'register' },
  { title: 'Virtual Audit', url: '/virtual-audit', icon: ClipboardList, permission: 'virtual_audit' },
  { title: 'Schedule', url: '/schedule', icon: Calendar, permission: 'schedule' },
  { title: 'Lesson Plan', url: '/lesson-plan', icon: BookOpen, permission: 'lesson_plan' },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare, permission: 'tasks' },
  { title: 'Quizzes', url: '/quizzes', icon: ClipboardList },
  { title: 'LMS Management', url: '/lms-management', icon: BookOpen },
  { title: 'CA Projects', url: '/ca-projects', icon: FolderOpen },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const { hasPermission, isAdmin, loading: permLoading } = usePermissions();

  const visibleNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    if (permLoading) return true;
    return hasPermission(item.permission);
  });

  return (
    <aside 
      className={cn(
        "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center transition-transform duration-300 hover:rotate-12">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-semibold text-foreground">EduPortal</span>}
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

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item, index) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200",
              collapsed && "justify-center px-2",
              `animate-in stagger-${Math.min(index + 1, 5)}`
            )}
            activeClassName="bg-accent text-accent-foreground font-medium border-l-2 border-primary"
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
        
        {(permLoading || isAdmin) && (
          <NavLink
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200",
              collapsed && "justify-center px-2"
            )}
            activeClassName="bg-accent text-accent-foreground font-medium border-l-2 border-primary"
          >
            <Shield className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Admin</span>}
          </NavLink>
        )}
      </nav>

      {/* Theme toggle and help */}
      <div className="p-2 border-t border-border">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
          <ThemeToggle />
          {!collapsed && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span>Need help?</span>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full flex items-center gap-3 text-muted-foreground hover:text-destructive transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
