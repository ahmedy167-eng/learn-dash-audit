import { useState, useCallback } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useStudentMessages } from '@/hooks/useStudentMessages';
import { StudentLayout } from '@/components/student/StudentLayout';
import { NoticesPanel } from '@/components/student/NoticesPanel';
import { MessageAdminDialog } from '@/components/student/MessageAdminDialog';
import { MessageNotificationBadge } from '@/components/student/MessageNotificationBadge';
import { StudentMessagesDialog } from '@/components/student/StudentMessagesDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, BookOpen, FolderOpen, User, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentPortal = () => {
  const { student } = useStudentAuth();
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);

  const handleNewMessage = useCallback(() => {
    setMessagesDialogOpen(true);
  }, []);

  const {
    messages,
    unreadCount,
    loading: messagesLoading,
    markAsRead,
    markAllAsRead,
  } = useStudentMessages(student?.id, handleNewMessage);

  const sections = [
    {
      title: 'Quizzes',
      description: 'Take quizzes and view your results',
      icon: ClipboardList,
      href: '/student-portal/quizzes',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'LMS Updates',
      description: 'Track your learning progress and points',
      icon: BookOpen,
      href: '/student-portal/lms',
      color: 'bg-green-500/10 text-green-500',
    },
    {
      title: 'CA Projects',
      description: 'View and submit your CA project work',
      icon: FolderOpen,
      href: '/student-portal/ca-projects',
      color: 'bg-purple-500/10 text-purple-500',
    },
  ];

  return (
    <StudentLayout>
      <div className="p-6 md:p-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between mb-8 animate-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome, {student?.full_name}!
            </h1>
            <p className="text-muted-foreground">
              Access your quizzes, track your progress, and manage your projects.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MessageNotificationBadge
              unreadCount={unreadCount}
              onClick={() => setMessagesDialogOpen(true)}
            />
            <Button onClick={() => setMessageDialogOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>

        {/* Student Info Card */}
        <Card className="mb-8 hover-lift animate-in stagger-1">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{student?.full_name}</CardTitle>
                <CardDescription>Student ID: {student?.student_id}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              {student?.section_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Section:</span>
                  <span className="font-medium">{student.section_number}</span>
                </div>
              )}
              {student?.course && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course:</span>
                  <span className="font-medium">{student.course}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notices Panel */}
        <div className="mb-8 animate-in stagger-2">
          <NoticesPanel />
        </div>

        {/* Quick Access Sections */}
        <h2 className="text-xl font-semibold mb-4 animate-in stagger-3">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((section, index) => (
            <Link key={section.title} to={section.href} className="block h-full">
              <Card className={`h-full flex flex-col hover:border-primary/50 transition-all duration-300 cursor-pointer hover-lift animate-in stagger-${index + 3}`}>
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                    <section.icon className="w-6 h-6" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <CardTitle className="text-lg mb-2">{section.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{section.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <MessageAdminDialog 
        open={messageDialogOpen} 
        onOpenChange={setMessageDialogOpen} 
      />

      <StudentMessagesDialog
        open={messagesDialogOpen}
        onOpenChange={setMessagesDialogOpen}
        messages={messages}
        unreadCount={unreadCount}
        loading={messagesLoading}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </StudentLayout>
  );
};

export default StudentPortal;
