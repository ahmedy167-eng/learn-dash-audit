import React from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Register from "./pages/Register";
import VirtualAudit from "./pages/VirtualAudit";
import Schedule from "./pages/Schedule";
import LessonPlan from "./pages/LessonPlan";
import Tasks from "./pages/Tasks";
import OffDays from "./pages/OffDays";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/register" element={<Register />} />
              <Route path="/virtual-audit" element={<VirtualAudit />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/lesson-plan" element={<LessonPlan />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/off-days" element={<OffDays />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
