import React from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { StudentAuthProvider } from "@/hooks/useStudentAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Register from "./pages/Register";
import Sections from "./pages/Sections";
import SectionForm from "./pages/SectionForm";
import VirtualAudit from "./pages/VirtualAudit";
import Schedule from "./pages/Schedule";
import LessonPlan from "./pages/LessonPlan";
import Tasks from "./pages/Tasks";
import OffDays from "./pages/OffDays";
import Quizzes from "./pages/Quizzes";
import LMSManagement from "./pages/LMSManagement";
import CAProjects from "./pages/CAProjects";
import StudentLogin from "./pages/StudentLogin";
import StudentPortal from "./pages/StudentPortal";
import StudentQuizzes from "./pages/student/StudentQuizzes";
import StudentLMS from "./pages/student/StudentLMS";
import StudentCAProjects from "./pages/student/StudentCAProjects";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
                    <Route path="*" element={<NotFound />} />
                  </Routes>
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
