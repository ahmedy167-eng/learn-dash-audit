import React, { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { StudentAuthProvider } from "@/hooks/useStudentAuth";
import { ThemeProvider } from "@/components/ThemeProvider";

// Lazy load all route components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Admin = lazy(() => import("./pages/Admin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Register = lazy(() => import("./pages/Register"));
const Sections = lazy(() => import("./pages/Sections"));
const SectionForm = lazy(() => import("./pages/SectionForm"));
const VirtualAudit = lazy(() => import("./pages/VirtualAudit"));
const Schedule = lazy(() => import("./pages/Schedule"));
const LessonPlan = lazy(() => import("./pages/LessonPlan"));
const Tasks = lazy(() => import("./pages/Tasks"));
const OffDays = lazy(() => import("./pages/OffDays"));
const Quizzes = lazy(() => import("./pages/Quizzes"));
const LMSManagement = lazy(() => import("./pages/LMSManagement"));
const CAProjects = lazy(() => import("./pages/CAProjects"));
const StudentLogin = lazy(() => import("./pages/StudentLogin"));
const StudentPortal = lazy(() => import("./pages/StudentPortal"));
const StudentQuizzes = lazy(() => import("./pages/student/StudentQuizzes"));
const StudentLMS = lazy(() => import("./pages/student/StudentLMS"));
const StudentCAProjects = lazy(() => import("./pages/student/StudentCAProjects"));
const StaffChat = lazy(() => import("./pages/StaffChat"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StudentAuthProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
                <PermissionsProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/admin-login" element={<AdminLogin />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/students" element={<Students />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/sections" element={<Sections />} />
                      <Route path="/sections/new" element={<SectionForm />} />
                      <Route path="/sections/edit/:id" element={<SectionForm />} />
                      <Route path="/virtual-audit" element={<VirtualAudit />} />
                      <Route path="/schedule" element={<Schedule />} />
                      <Route path="/lesson-plan" element={<LessonPlan />} />
                      <Route path="/tasks" element={<Tasks />} />
                      <Route path="/off-days" element={<OffDays />} />
                      <Route path="/quizzes" element={<Quizzes />} />
                      <Route path="/lms-management" element={<LMSManagement />} />
                      <Route path="/ca-projects" element={<CAProjects />} />
                      <Route path="/student-login" element={<StudentLogin />} />
                      <Route path="/student-portal" element={<StudentPortal />} />
                      <Route path="/student-portal/quizzes" element={<StudentQuizzes />} />
                      <Route path="/student-portal/lms" element={<StudentLMS />} />
                      <Route path="/student-portal/ca-projects" element={<StudentCAProjects />} />
                      <Route path="/staff-chat" element={<StaffChat />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </PermissionsProvider>
              </BrowserRouter>
            </TooltipProvider>
          </StudentAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
