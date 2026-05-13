import { ReactNode, useState, useEffect } from 'react';
import { Navigate, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  FolderOpen,
  LogOut,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Menu,
  X,
} from 'lucide-react';

interface StudentLayoutProps {
  children: ReactNode;
}

const navItems = [
  { title: 'Dashboard', url: '/student-portal', icon: LayoutDashboard },
  { title: 'Chat', url: '/student-portal/chat', icon: MessageCircle },
  { title: 'Quizzes', url: '/student-portal/quizzes', icon: ClipboardList },
  { title: 'LMS Updates', url: '/student-portal/lms', icon: BookOpen },
  { title: 'CA Projects', url: '/student-portal/ca-projects', icon: FolderOpen },
];

export function StudentLayout({ children }: StudentLayoutProps) {
  const { student, loading, signOut } = useStudentAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

  const sidebarVisuallyCollapsed = !isMobile && collapsed;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border transition-all duration-300',
          isMobile
            ? cn(
                'fixed inset-y-0 left-0 z-50 h-screen w-64 shadow-xl',
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
              )
            : cn('h-screen sticky top-0', collapsed ? 'w-16' : 'w-64')
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div
            className={cn(
              'flex items-center gap-2',
              sidebarVisuallyCollapsed && 'justify-center w-full'
            )}
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center transition-transform duration-300 hover:rotate-12">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarVisuallyCollapsed && (
              <span className="font-semibold text-foreground">Student Portal</span>
            )}
          </div>
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="h-8 w-8"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className={cn('h-8 w-8', collapsed && 'hidden')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expand button when collapsed (desktop only) */}
        {sidebarVisuallyCollapsed && (
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
        {!sidebarVisuallyCollapsed && (
          <div className="p-4 border-b border-border animate-in">
            <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
            <p className="text-xs text-muted-foreground">ID: {student.student_id}</p>
            {student.section_number && (
              <p className="text-xs text-muted-foreground">Section: {student.section_number}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const isActive =
              location.pathname === item.url ||
              (item.url !== '/student-portal' && location.pathname.startsWith(item.url));

            return (
              <RouterNavLink
                key={item.title}
                to={item.url}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200',
                  sidebarVisuallyCollapsed && 'justify-center px-2',
                  isActive && 'bg-accent text-accent-foreground font-medium border-l-2 border-primary',
                  `animate-in stagger-${Math.min(index + 1, 5)}`
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarVisuallyCollapsed && <span>{item.title}</span>}
              </RouterNavLink>
            );
          })}
        </nav>

        {/* Theme toggle and Logout */}
        <div className="p-2 border-t border-border space-y-1">
          <div
            className={cn(
              'flex items-center',
              sidebarVisuallyCollapsed ? 'justify-center' : 'px-2'
            )}
          >
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              'w-full flex items-center gap-3 text-muted-foreground hover:text-destructive transition-colors',
              sidebarVisuallyCollapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5" />
            {!sidebarVisuallyCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0 overflow-auto">
        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/80 backdrop-blur-sm px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="h-9 w-9"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm text-foreground">Student Portal</span>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
