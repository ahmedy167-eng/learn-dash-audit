import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen,
  ClipboardList as RegisterIcon,
  Calendar, 
  BookOpen, 
  CheckSquare, 
  CalendarOff,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Students', url: '/students', icon: Users },
  { title: 'Sections', url: '/sections', icon: FolderOpen },
  { title: 'Register', url: '/register', icon: RegisterIcon },
  { title: 'Virtual Audit', url: '/virtual-audit', icon: ClipboardList },
  { title: 'Schedule', url: '/schedule', icon: Calendar },
  { title: 'Lesson Plan', url: '/lesson-plan', icon: BookOpen },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Off Days', url: '/off-days', icon: CalendarOff },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();

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
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
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
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              collapsed && "justify-center px-2"
            )}
            activeClassName="bg-accent text-accent-foreground font-medium"
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Help section */}
      {!collapsed && (
        <div className="p-4 mx-2 mb-2 bg-accent/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Need help?</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Check our documentation for quick guides and tips.
          </p>
        </div>
      )}

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
  );
}
