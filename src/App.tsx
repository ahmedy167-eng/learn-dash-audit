import React, { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { StudentAuthProvider } from "@/hooks/useStudentAuth";
import { GuestAuthProvider } from "@/hooks/useGuestAuth";
import { ThemeProvider } from "@/components/ThemeProvider";

// Lazy load all route components for code splitting.
// Retries once (and reloads on stale deploys) when a chunk fails to fetch.
function lazyWithRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      const key = "chunk-reload-" + String(err);
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise<T>(() => {});
      }
      throw err;
    }
  });
}

const lazy_ = lazyWithRetry;

const Index = lazy_(() => import("./pages/Index"));

const Auth = lazy_(() => import("./pages/Auth"));
const TeacherSignup = lazy_(() => import("./pages/TeacherSignup"));
const AdminLogin = lazy_(() => import("./pages/AdminLogin"));
const Admin = lazy_(() => import("./pages/Admin"));
const Dashboard = lazy_(() => import("./pages/Dashboard"));
const Students = lazy_(() => import("./pages/Students"));
const Register = lazy_(() => import("./pages/Register"));
const Sections = lazy_(() => import("./pages/Sections"));
const SectionForm = lazy_(() => import("./pages/SectionForm"));
const VirtualAudit = lazy_(() => import("./pages/VirtualAudit"));
const Schedule = lazy_(() => import("./pages/Schedule"));
const LessonPlan = lazy_(() => import("./pages/LessonPlan"));
const Tasks = lazy_(() => import("./pages/Tasks"));
const OffDays = lazy_(() => import("./pages/OffDays"));
const Quizzes = lazy_(() => import("./pages/Quizzes"));
const LMSManagement = lazy_(() => import("./pages/LMSManagement"));
const CAProjects = lazy_(() => import("./pages/CAProjects"));
const StudentLogin = lazy_(() => import("./pages/StudentLogin"));
const StudentPortal = lazy_(() => import("./pages/StudentPortal"));
const StudentQuizzes = lazy_(() => import("./pages/student/StudentQuizzes"));
const StudentLMS = lazy_(() => import("./pages/student/StudentLMS"));
const StudentCAProjects = lazy_(() => import("./pages/student/StudentCAProjects"));
const StaffChat = lazy_(() => import("./pages/StaffChat"));
const Diary = lazy_(() => import("./pages/Diary"));
const NotFound = lazy_(() => import("./pages/NotFound"));
const GuestLogin = lazy_(() => import("./pages/GuestLogin"));
const GuestSignup = lazy_(() => import("./pages/GuestSignup"));
const GuestPortal = lazy_(() => import("./pages/GuestPortal"));

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
            <GuestAuthProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
                <PermissionsProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/teacher-signup" element={<TeacherSignup />} />
                      <Route path="/join" element={<TeacherSignup />} />
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
                      <Route path="/guest-login" element={<GuestLogin />} />
                      <Route path="/guest-signup" element={<GuestSignup />} />
                      <Route path="/eduportal" element={<GuestSignup />} />
                      <Route path="/guest/quizzes" element={<GuestPortal />} />
                      <Route path="/staff-chat" element={<StaffChat />} />
                      <Route path="/diary" element={<Diary />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </PermissionsProvider>
              </BrowserRouter>
            </TooltipProvider>
            </GuestAuthProvider>
          </StudentAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
