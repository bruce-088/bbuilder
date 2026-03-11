import { ReactNode } from "react";
import { LivePulseDashboard, SystemLog } from "@/components/StrategicCommand";
import { useAuth } from "@/contexts/AuthContext";
import MyaCelebrationPopup from "@/components/MissionControl/MyaCelebrationPopup";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();

  // Only show Strategic Command Center for authenticated users
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <LivePulseDashboard />
      <div className="relative">
        {children}
        <SystemLog />
      </div>
      <MyaCelebrationPopup />
    </div>
  );
}
