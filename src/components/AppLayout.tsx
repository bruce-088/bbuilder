import { ReactNode } from "react";
import { LivePulseDashboard, SystemLog } from "@/components/StrategicCommand";
import { useAuth } from "@/contexts/AuthContext";
import MyaCelebrationPopup from "@/components/MissionControl/MyaCelebrationPopup";
import StatusPill from "@/components/StatusPill";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <LivePulseDashboard />
      {/* Global StatusPill — visible on every authenticated page */}
      <div className="fixed top-3 right-4 z-[60] pointer-events-auto">
        <StatusPill />
      </div>
      <div className="relative">
        {children}
        <SystemLog />
      </div>
      <MyaCelebrationPopup />
    </div>
  );
}

