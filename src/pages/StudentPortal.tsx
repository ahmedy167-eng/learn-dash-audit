import { useStudentAuth } from '@/hooks/useStudentAuth';
import { StudentLayout } from '@/components/student/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, BookOpen, FolderOpen, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentPortal = () => {
  const { student } = useStudentAuth();

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, {student?.full_name}!
          </h1>
          <p className="text-muted-foreground">
            Access your quizzes, track your progress, and manage your projects.
          </p>
        </div>

        {/* Student Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
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

        {/* Quick Access Sections */}
        <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((section) => (
            <Link key={section.title} to={section.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                    <section.icon className="w-6 h-6" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-1">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentPortal;
