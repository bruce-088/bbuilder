import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MissionIntelligenceProvider } from "@/contexts/MissionIntelligenceContext";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Compare from "./pages/Compare";
import ExportPrompt from "./pages/ExportPrompt";
import ExportComputerUsePrompt from "./pages/ExportComputerUsePrompt";
import ExportExecTranscript from "./pages/ExportExecTranscript";
import NotFound from "./pages/NotFound";
import Leads from "./pages/Leads";
import Workflows from "./pages/Workflows";
import WorkflowEditor from "./pages/WorkflowEditor";
import Strategy from "./pages/Strategy";
import Conversations from "./pages/Conversations";
import Plans from "./pages/Plans";
import Library from "./pages/Library";
import DangerZone from "./pages/DangerZone";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MissionIntelligenceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat/:id" element={<Chat />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/export-prompt" element={<ExportPrompt />} />
                <Route path="/export-computer-use-prompt" element={<ExportComputerUsePrompt />} />
                <Route path="/export-exec-transcript" element={<ExportExecTranscript />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/workflows" element={<Workflows />} />
                <Route path="/workflows/:id" element={<WorkflowEditor />} />
                <Route path="/strategy" element={<Strategy />} />
                <Route path="/conversations" element={<Conversations />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/library" element={<Library />} />
                <Route path="/settings/danger-zone" element={<DangerZone />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </MissionIntelligenceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
